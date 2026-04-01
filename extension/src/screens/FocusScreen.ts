import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import { FocusSessionRecord } from '@focusgate/types';
import { toast } from '../lib/toast';

function formatTimePrecise(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts = [];
  if (h > 0) {
    parts.push(h.toString().padStart(2, '0'));
  }
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));

  return parts.join(':');
}

export async function renderFocusScreen(container) {
  if (!container) {
    return;
  }

  const activeSessionResults = await chrome.storage.local.get([
    'fg_active_session',
  ]);
  const activeSession =
    activeSessionResults.fg_active_session as FocusSessionRecord | null;

  const focusEnd =
    activeSession?.status === 'focusing'
      ? activeSession.startedAt + activeSession.duration * 60000
      : await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);

  const focusStart =
    activeSession?.status === 'focusing'
      ? activeSession.startedAt
      : (await storage.getNumber('fg_focus_session_start', 0)) ||
        focusEnd - 1500000;

  const now = Date.now();
  const isFocusing = focusEnd > now;

  if (isFocusing) {
    const totalDuration = focusEnd - focusStart;
    const remaining = focusEnd - now;
    const progress = Math.max(0, Math.min(1, remaining / totalDuration));

    // SVG Dash calculation
    const radius = 150; // Match CSS width/2 approx (scaled slightly)
    const circum = 2 * Math.PI * radius;
    const offset = circum * (1 - progress);

    container.innerHTML = `
      <div class="focus-container">
        <div class="focus-timer-v2">
          <div class="focus-active-glow"></div>
          <svg class="focus-timer-svg" viewBox="0 0 320 320">
            <circle class="focus-timer-track" cx="160" cy="160" r="150" />
            <circle class="focus-timer-progress" cx="160" cy="160" r="150" 
                    stroke-dasharray="${circum}" 
                    stroke-dashoffset="${offset}" />
          </svg>
          <div class="focus-timer-text">
            <div class="focus-timer-val" id="preciseTimer">${formatTimePrecise(
              remaining,
            )}</div>
            <div class="focus-timer-label">Session Active</div>
          </div>
        </div>

        <div class="focus-status-msg">
          Network-wide synchronization lock is active. No exceptions, no bypasses. Just your work.
        </div>

        <button class="btn-premium" id="stopFocus" style="background: rgba(255,255,255,0.02); color: var(--muted); border: 1px solid var(--glass-border); box-shadow: none;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
          Abort Session Early
        </button>
      </div>
    `;

    // High-frequency update for smooth progression if tab is active
    if (window.__focusRenderTimer) {
      clearInterval(window.__focusRenderTimer);
    }
    window.__focusRenderTimer = setInterval(() => {
      const currentNow = Date.now();
      const currentRemaining = focusEnd - currentNow;

      if (currentRemaining <= 0) {
        clearInterval(window.__focusRenderTimer);
        renderFocusScreen(container);
        return;
      }

      const timerEl = document.getElementById('preciseTimer');
      if (timerEl) {
        timerEl.innerText = formatTimePrecise(currentRemaining);
      }

      const progressCircle = container.querySelector('.focus-timer-progress');
      if (progressCircle) {
        const currentProgress = Math.max(
          0,
          Math.min(1, currentRemaining / totalDuration),
        );
        const currentOffset = circum * (1 - currentProgress);
        progressCircle.setAttribute('stroke-dashoffset', currentOffset);
      }
    }, 1000);

    container
      .querySelector('#stopFocus')
      ?.addEventListener('click', async () => {
        const btn = container.querySelector('#stopFocus') as HTMLButtonElement;

        // Custom UI Modal instead of confirm
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
          <div class="glass-card" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:320px; z-index:10000; padding:32px; text-align:center; box-shadow:0 0 100px rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.1); background:rgba(20,20,20,0.95); backdrop-filter:blur(20px); border-radius: 24px;">
            <div style="font-size:32px; margin-bottom:16px;">🛑</div>
            <div style="font-size:16px; font-weight:900; color:var(--text); margin-bottom:12px; letter-spacing:1px;">ABORT SESSION?</div>
            <div style="font-size:12px; color:var(--muted); line-height:1.6; margin-bottom:24px;">Stopping now will record this as a failure in your focus analytics. Are you sure?</div>
            <div style="display:flex; gap:12px; justify-content:center;">
              <button class="btn-cancel-abort" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text); padding:10px; border-radius:12px; cursor:pointer; font-weight:800; font-size:11px;">CANCEL</button>
              <button class="btn-confirm-abort" style="flex:1; background:var(--red); border:none; color:white; padding:10px; border-radius:12px; cursor:pointer; font-weight:800; font-size:11px;">ABORT</button>
            </div>
          </div>
          <div class="modal-bg" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999;"></div>
        `;
        document.body.appendChild(modalContainer);

        const cleanup = () => document.body.removeChild(modalContainer);

        modalContainer
          .querySelector('.btn-cancel-abort')
          ?.addEventListener('click', cleanup);
        modalContainer
          .querySelector('.btn-confirm-abort')
          ?.addEventListener('click', () => {
            cleanup();
            btn.disabled = true;
            let countdown = 5;
            const interval = setInterval(() => {
              countdown--;
              if (countdown > 0) {
                btn.innerText = `ENDING IN ${countdown}S...`;
              } else {
                clearInterval(interval);
                chrome.runtime.sendMessage({ action: 'stopFocus' }, (res) => {
                  if (res?.error) {
                    btn.innerText = 'ERROR';
                    btn.disabled = false;
                    toast.error(res.error);
                  } else {
                    renderFocusScreen(container);
                  }
                });
              }
            }, 1000);
            btn.innerText = `ENDING IN ${countdown}S...`;
          });
      });
  } else {
    container.innerHTML = `
      <div class="focus-container">
        <div style="text-align: center; margin-bottom: 48px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <h1 style="font-size: 2.5rem; font-weight: 900; letter-spacing: -1px; margin-bottom: 12px;">Ignite Deep Focus</h1>
            <p style="color: var(--muted); max-width: 440px; margin: 0 auto; line-height: 1.6;">
                Ready for a high-stakes sprint? Select a block to synchronize a network-wide distraction shield across all your devices.
            </p>
        </div>

        <div class="focus-presets">
          ${[
            { m: 15, tag: 'Quick Sprint', icon: '⚡' },
            { m: 25, tag: 'Pomodoro', icon: '🍅' },
            { m: 45, tag: 'Deep Work', icon: '🧠' },
            { m: 90, tag: 'Marathon', icon: '🏆' },
          ]
            .map(
              (p) => `
            <div class="focus-preset-card start-focus" data-mins="${p.m}">
                <div style="font-size: 24px; margin-bottom: 8px;">${p.icon}</div>
                <div class="focus-preset-time">${p.m}m</div>
                <div class="focus-preset-tag">${p.tag}</div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.start-focus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mins = parseInt(btn.getAttribute('data-mins'), 10);
        const startTime = Date.now();

        // Save start time for progress bar calculation
        await chrome.storage.local.set({ fg_focus_session_start: startTime });

        btn.style.borderColor = 'var(--accent)';
        btn.style.background = 'rgba(255,255,255,0.05)';

        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: mins },
          () => {
            renderFocusScreen(container);
          },
        );
      });
    });
  }
}
