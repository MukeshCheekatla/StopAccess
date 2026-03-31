import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';

export async function renderFocusPopup(container) {
  const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
  const isFocusing = focusEnd > Date.now();

  if (isFocusing) {
    const remaining = Math.ceil((focusEnd - Date.now()) / 60000);
    container.innerHTML = `
      <div class="glass-card widget-card" style="text-align: center; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 240px; border-color: rgba(124, 111, 247, 0.4);">
        <div style="font-size: 50px; margin-bottom: 20px; filter: drop-shadow(0 0 12px var(--accent));">🛡️</div>
        <div class="widget-title" style="font-size: 14px; color: var(--text);">DEEP FOCUS ACTIVE</div>
        
        <div style="margin: 24px 0;">
           <div style="font-size: 60px; font-weight: 900; line-height: 1; letter-spacing: -2px; color: var(--text);">${remaining}</div>
           <div style="font-size: 9px; font-weight: 800; color: var(--accent); letter-spacing: 1px; text-transform: uppercase;">MINUTES REMAINING</div>
        </div>

        <button class="btn-premium" id="stopFocus" style="background: rgba(255,255,255,0.02); color: var(--muted); box-shadow: none; border-color: rgba(255,255,255,0.05); font-size: 10px; padding: 6px 12px;">ABORT SESSION</button>
      </div>
    `;

    container.querySelector('#stopFocus')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'stopFocus' }, () =>
        renderFocusPopup(container),
      );
    });
  } else {
    container.innerHTML = `
      <div class="glass-card widget-card" style="text-align: center; padding: 32px 16px; min-height: 240px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-style: dashed; border-color: var(--glass-border); background: transparent;">
        <div style="font-size: 40px; margin-bottom: 16px;">⏳</div>
        <div class="widget-title" style="font-size: 14px; margin-bottom: 8px; color: var(--text);">IGNITE DEEP FOCUS</div>
        <div style="font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 24px; max-width: 220px; line-height: 1.5;">Immediate network-wide synchronization lock.</div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%;">
          ${[
            { m: 15, tag: 'Quick' },
            { m: 25, tag: 'Pomo' },
            { m: 45, tag: 'Deep' },
            { m: 90, tag: 'Flow' },
          ]
            .map(
              (p) => `
            <button class="btn-premium start-focus" data-mins="${p.m}" style="display:flex; flex-direction:column; align-items:center; padding: 14px 10px; min-height: 80px; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); box-shadow: none;">
              <span style="font-size: 18px; font-weight: 900; color: var(--text); line-height: 1.1;">${p.m}M</span>
              <span style="font-size: 9px; color: var(--muted); margin-top: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${p.tag}</span>
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
        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: parseInt(mins, 10) },
          () => renderFocusPopup(container),
        );
      });
    });
  }

  // Real-Time Refresh
  clearInterval(window.__focusPopupInterval);
  window.__focusPopupInterval = setInterval(() => {
    if (document.querySelector('[data-tab="focus"].active')) {
      renderFocusPopup(container);
    }
  }, 10000);
}
