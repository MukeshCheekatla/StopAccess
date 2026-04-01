import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import { FocusSessionRecord } from '@focusgate/types';

export async function renderFocusPage(container) {
  const activeRes = await chrome.storage.local.get(['fg_active_session']);
  const activeSession =
    activeRes.fg_active_session as FocusSessionRecord | null;

  const focusEnd =
    activeSession?.status === 'focusing'
      ? activeSession.startedAt + activeSession.duration * 60000
      : await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);

  const isFocusing = focusEnd > Date.now();

  if (isFocusing) {
    const remainingMs = Math.max(0, focusEnd - Date.now());
    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    const timeDisplay = `${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
    container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px;">
        <div style="font-size: 11px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 8px;">ACTIVE FOCUS SESSION</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: -1.2px; line-height: 1;">LOCKDOWN MODE</div>
      </div>

      <div class="glass-card" style="text-align: center; padding: 80px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 460px; background: rgba(255,255,255,0.01);">
        <div style="font-size: 80px; margin-bottom: 32px; color: var(--accent);">⬢</div>
        
        <div style="margin: 0 0 40px 0; position: relative;">
           <div style="font-size: 140px; font-weight: 900; line-height: 0.8; letter-spacing: -8px; color: var(--text);">${timeDisplay}</div>
           <div style="font-size: 12px; font-weight: 800; color: var(--accent); letter-spacing: 3px; text-transform: uppercase; margin-top: 16px;">TIME REMAINING</div>
        </div>

        <div style="font-size: 14px; color: var(--muted); font-weight: 500; max-width: 340px; line-height: 1.6; margin-bottom: 48px;">
          Your selected domains are currently being blocked to maintain focus.
        </div>

        <button class="btn-premium" id="stopFocus" style="background: rgba(255,255,255,0.02); color: var(--muted); border-color: var(--glass-border); box-shadow: none; font-size: 11px; padding: 12px 24px;">STOP SESSION EARLY</button>
      </div>
    `;

    container.querySelector('#stopFocus')?.addEventListener('click', () => {
      const btn = container.querySelector('#stopFocus') as HTMLButtonElement;

      // Custom UI Modal instead of confirm
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = `
        <div class="glass-card" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:320px; z-index:10000; padding:32px; text-align:center; box-shadow:0 0 100px rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.1); background:rgba(20,20,20,0.95); backdrop-filter:blur(20px); border-radius: 24px; color: white;">
          <div style="font-size:32px; margin-bottom:16px;">🛑</div>
          <div style="font-size:16px; font-weight:900; color:var(--text); margin-bottom:12px; letter-spacing:1px;">END SESSION?</div>
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
              btn.innerText = `STOPPING IN ${countdown}S...`;
            } else {
              clearInterval(interval);
              chrome.runtime.sendMessage({ action: 'stopFocus' }, () => {
                renderFocusPage(container);
              });
            }
          }, 1000);
          btn.innerText = `STOPPING IN ${countdown}S...`;
        });
    });
  } else {
    container.innerHTML = `
      <div class="glass-card widget-card" style="text-align: center; padding: 60px 20px; min-height: 420px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-style: dashed; border-color: var(--glass-border); background: transparent;">
        <div style="font-size: 60px; margin-bottom: 24px; color: var(--accent); opacity: 0.5;">⬢</div>
        <div class="widget-title" style="font-size: 18px; margin-bottom: 12px; color: var(--text);">START FOCUS SESSION</div>
        <div style="font-size: 13px; color: var(--muted); font-weight: 600; margin-bottom: 40px; max-width: 280px; line-height: 1.6;">Activate a focus timer to block distracting domains across your network.</div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%; max-width: 400px;">
          ${[
            { m: 15, tag: 'Quick Sprint' },
            { m: 25, tag: 'Pomodoro' },
            { m: 45, tag: 'Deep Work' },
            { m: 90, tag: 'Marathon' },
          ]
            .map(
              (p) => `
            <button class="btn-premium start-focus" data-mins="${p.m}" style="display:flex; flex-direction:column; align-items:center; padding: 24px 16px; min-height: 120px; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); box-shadow: none;">
              <span style="font-size: 24px; font-weight: 900; color: var(--text); line-height: 1.1;">${p.m}M</span>
              <span style="font-size: 10px; color: var(--muted); margin-top: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${p.tag}</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.start-focus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = btn.getAttribute('data-mins');
        btn.innerText = 'STARTING...';
        btn.disabled = true;
        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: parseInt(mins, 10) },
          () => {
            renderFocusPage(container);
          },
        );
      });
    });
  }

  // Real-Time Refresh
  if (window.__focusInterval) {
    clearInterval(window.__focusInterval);
  }
  window.__focusInterval = setInterval(() => {
    const activeTab = document.querySelector('[data-tab="focus"].active');
    if (activeTab) {
      renderFocusPage(container);
    }
  }, 1000);
}
