import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';

function formatTimePrecise(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export async function renderFocusPopup(container) {
  if (!container) {
    return;
  }

  const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
  const focusStart =
    (await storage.getNumber('fg_focus_session_start', 0)) ||
    focusEnd - 1500000;
  const now = Date.now();
  const isFocusing = focusEnd > now;

  if (isFocusing) {
    const totalDuration = focusEnd - focusStart;
    const remaining = focusEnd - now;
    const progress = Math.max(0, Math.min(1, remaining / totalDuration));

    const radius = 90; // Smaller for popup
    const circum = 2 * Math.PI * radius;
    const offset = circum * (1 - progress);

    container.innerHTML = `
      <div class="focus-container" style="padding: 20px 0;">
        <div class="focus-timer-v2" style="width: 200px; height: 200px; margin-bottom: 24px;">
          <div class="focus-active-glow"></div>
          <svg class="focus-timer-svg" viewBox="0 0 200 200">
            <circle class="focus-timer-track" cx="100" cy="100" r="90" style="stroke-width: 6;" />
            <circle class="focus-timer-progress" cx="100" cy="100" r="90" 
                    style="stroke-width: 6;"
                    stroke-dasharray="${circum}" 
                    stroke-dashoffset="${offset}" />
          </svg>
          <div class="focus-timer-text">
            <div class="focus-timer-val" id="preciseTimerPopup" style="font-size: 2.5rem;">${formatTimePrecise(
              remaining,
            )}</div>
            <div class="focus-timer-label" style="font-size: 8px;">Shield Active</div>
          </div>
        </div>

        <button class="btn-premium" id="stopFocusPopup" style="background: rgba(255,255,255,0.02); color: var(--muted); border: 1px solid var(--glass-border); box-shadow: none; font-size: 10px; padding: 8px 16px;">
          ABORT SESSION
        </button>
      </div>
    `;

    if (window.__focusPopupRenderTimer) {
      clearInterval(window.__focusPopupRenderTimer);
    }
    window.__focusPopupRenderTimer = setInterval(() => {
      const currentNow = Date.now();
      const currentRemaining = focusEnd - currentNow;

      if (currentRemaining <= 0) {
        clearInterval(window.__focusPopupRenderTimer);
        renderFocusPopup(container);
        return;
      }

      const timerEl = document.getElementById('preciseTimerPopup');
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
      .querySelector('#stopFocusPopup')
      ?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stopFocus' }, () =>
          renderFocusPopup(container),
        );
      });
  } else {
    container.innerHTML = `
      <div class="focus-container" style="padding: 10px 0;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">⏳</div>
            <div class="widget-title" style="color: var(--text); font-size: 14px;">IGNITE DEEP FOCUS</div>
            <div style="font-size: 10px; color: var(--muted); font-weight: 600; margin-top: 4px;">Network-wide synchronization lock.</div>
        </div>

        <div class="focus-presets" style="gap: 10px;">
          ${[
            { m: 15, tag: 'Quick' },
            { m: 25, tag: 'Pomo' },
            { m: 45, tag: 'Deep' },
            { m: 90, tag: 'Flow' },
          ]
            .map(
              (p) => `
            <div class="focus-preset-card start-focus" data-mins="${p.m}" style="padding: 14px 10px;">
                <div class="focus-preset-time" style="font-size: 1.1rem;">${p.m}M</div>
                <div class="focus-preset-tag" style="font-size: 8px;">${p.tag}</div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.start-focus').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mins = btn.getAttribute('data-mins');
        await chrome.storage.local.set({ fg_focus_session_start: Date.now() });

        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: parseInt(mins, 10) },
          () => renderFocusPopup(container),
        );
      });
    });
  }
}
