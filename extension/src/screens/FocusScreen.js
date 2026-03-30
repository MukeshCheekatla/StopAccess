import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';

export async function renderFocusScreen(container) {
  const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
  const isFocusing = focusEnd > Date.now();

  if (isFocusing) {
    const remaining = Math.ceil((focusEnd - Date.now()) / 60000);
    container.innerHTML = `
      <div class="dash-hero" style="flex-direction: column; text-align: center; gap: 20px;">
        <div class="empty-icon" style="opacity: 1; font-size: 64px;">🛡️</div>
        <div>
          <div class="title">Deep Focus Active</div>
          <div class="sub">No distractions. Just progress.</div>
        </div>
        <div class="hero-stat">
          <div class="val" style="text-align: center;">${remaining}</div>
          <div class="lbl" style="text-align: center;">MINUTES TO GO</div>
        </div>
        <button class="btn-outline" id="stopFocus" style="border-color: var(--muted); opacity: 0.5;">
          Stop Session Early
        </button>
      </div>
    `;

    container
      .querySelector('#stopFocus')
      ?.addEventListener('click', async () => {
        const btn = container.querySelector('#stopFocus');
        btn.innerText = 'Removing shield...';
        btn.disabled = true;

        chrome.runtime.sendMessage({ action: 'stopFocus' }, () => {
          renderFocusScreen(container); // Smooth transition, no reload
        });
      });
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <h2 style="color: var(--text); margin-bottom: 8px;">Start Focused Block</h2>
        <p style="margin-bottom: 32px; max-width: 240px;">Shut down all restricted sites for a set period. No exceptions.</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%;">
          ${[15, 25, 45, 60]
            .map(
              (m) => `
            <button class="btn start-focus" data-mins="${m}">${m} min</button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.start-focus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = btn.getAttribute('data-mins');
        btn.innerText = 'Igniting...';
        btn.disabled = true;

        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: parseInt(mins, 10) },
          () => {
            renderFocusScreen(container); // Smooth transition, no reload
          },
        );
      });
    });
  }
}
