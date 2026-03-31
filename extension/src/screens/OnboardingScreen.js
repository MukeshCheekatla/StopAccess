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
          <div class="glass-card widget-card" style="padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px; border-color: rgba(124, 111, 247, 0.4);">
            <div style="font-size: 80px; margin-bottom: 32px; color: var(--accent); filter: drop-shadow(0 0 20px var(--accent));">⬢</div>
            <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 12px; color: var(--text); letter-spacing: -1px;">FocusGate</h1>
            <p style="color: var(--muted); line-height: 1.8; margin-bottom: 40px; font-weight: 600; max-width: 320px;">
              A professional focus management tool. Precision-engineered for deep concentration.
            </p>
            <button class="btn-premium" id="nextStep" style="width: 100%; height: 50px; font-size: 14px;">INITIALIZE MISSION</button>
          </div>
        `;
      } else if (step === 2) {
        container.innerHTML = `
          <div class="glass-card widget-card" style="padding: 60px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px;">
            <div style="font-size: 60px; margin-bottom: 24px; color: var(--accent);">⬢</div>
            <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 32px; color: var(--text);">PROTECTION LEVEL</h1>
            
            <div class="glass-card" style="margin-bottom: 16px; width: 100%; text-align: left; cursor: pointer; border: 1px solid var(--glass-border); padding: 20px; background: rgba(255,255,255,0.02);" id="pickLevel1">
              <div style="font-weight: 800; color: var(--text); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">LOCAL SHIELD</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; line-height: 1.5;">Browser-only blockade. Swift setup. Zero account overhead.</div>
            </div>
            
            <div class="glass-card" style="margin-bottom: 32px; width: 100%; text-align: left; cursor: pointer; border: 1px solid var(--accent); background: rgba(124, 111, 247, 0.05); padding: 20px;" id="pickLevel2">
              <div style="font-weight: 800; color: var(--accent); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">HYBRID COMMAND</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; line-height: 1.5;">Network-wide synchronization via NextDNS integration.</div>
            </div>
            
            <button class="btn-premium" id="prevStep" style="background:none; border:none; color:var(--muted); font-size:11px; transition: color 0.2s;">RETURN TO BASE</button>
          </div>
        `;
      } else if (step === 3) {
        container.innerHTML = `
          <div class="glass-card widget-card" style="padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px; border-color: var(--green);">
            <div style="font-size: 64px; margin-bottom: 32px; color: var(--accent); filter: drop-shadow(0 0 20px var(--accent));">⬢</div>
            <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 12px; color: var(--text);">ALL SYSTEMS GO</h1>
            <p style="color: var(--muted); line-height: 1.8; margin-bottom: 40px; font-weight: 600; max-width: 280px;">
              Your focus perimeter is established. Head to the Command Center to begin your mission.
            </p>
            <button class="btn-premium" id="finishOnboarding" style="width: 100%; height: 50px; font-size: 14px; background: var(--green); box-shadow: 0 8px 24px rgba(113, 113, 122, 0.2);">ENGAGE DASHBOARD</button>
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
