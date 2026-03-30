/**
 * Onboarding Screen for FocusGate Extension
 * Welcomes new users and guides them through the first setup.
 */

export async function renderOnboarding(container, onComplete) {
  let step = 1;

  function renderStep() {
    container.style.opacity = 0;
    setTimeout(() => {
      if (step === 1) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 24px;">🛡️</div>
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; color: var(--text);">Welcome to FocusGate</h1>
            <p style="color: var(--muted); line-height: 1.6; margin-bottom: 32px;">
              The most powerful open-source distraction blocker for your browser and network.
            </p>
            <button class="btn" id="nextStep" style="width: 100%; padding: 14px;">Get Started</button>
          </div>
        `;
      } else if (step === 2) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px;">
            <div style="font-size: 48px; margin-bottom: 24px;">⚔️</div>
            <h1 style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text);">Choose Your Level</h1>
            <div class="app-card" style="margin-bottom: 12px; text-align: left; cursor: pointer; border: 1px solid var(--border);" id="pickLevel1">
              <div style="font-weight: 700; color: var(--text); font-size: 14px;">Level 1: Browser Only</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Swift setup. Rules apply only to this Chrome instance. No account needed.</div>
            </div>
            <div class="app-card" style="margin-bottom: 32px; text-align: left; cursor: pointer; border: 1px solid var(--accent); background: rgba(124, 111, 247, 0.05);" id="pickLevel2">
              <div style="font-weight: 700; color: var(--accent); font-size: 14px;">Level 2: Hybrid (Recommended)</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Connect NextDNS for network-wide protection and deep analytics.</div>
            </div>
            <button class="btn btn-outline" id="prevStep" style="width: 100%; margin-top: 12px;">Back</button>
          </div>
        `;
      } else if (step === 3) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 40px 20px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 24px;">🚀</div>
            <h1 style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text);">You're Ready</h1>
            <p style="color: var(--muted); line-height: 1.6; margin-bottom: 32px;">
              Add your first domain to the blocklist in the "Apps" tab to start focusing.
            </p>
            <button class="btn" id="finishOnboarding" style="width: 100%; padding: 14px;">Enter Dashboard</button>
          </div>
        `;
      }

      container.style.opacity = 1;
      attachHandlers();
    }, 200);
  }

  function attachHandlers() {
    container.querySelector('#nextStep')?.addEventListener('click', () => {
      step = 2;
      renderStep();
    });

    container.querySelector('#prevStep')?.addEventListener('click', () => {
      step = 1;
      renderStep();
    });

    container
      .querySelector('#pickLevel1')
      ?.addEventListener('click', async () => {
        const { extensionAdapter: storage } = await import(
          '../background/platformAdapter.js'
        );
        await storage.set('fg_sync_mode', 'browser');
        await storage.set('fg_onboarding_done', 'true');
        step = 3;
        renderStep();
      });

    container.querySelector('#pickLevel2')?.addEventListener('click', () => {
      // Go to settings after onboarding
      onComplete('settings');
    });

    container
      .querySelector('#finishOnboarding')
      ?.addEventListener('click', () => {
        onComplete('dash');
      });
  }

  renderStep();
}
