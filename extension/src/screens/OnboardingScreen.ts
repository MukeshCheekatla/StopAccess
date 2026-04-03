import { extensionAdapter as storage } from '../background/platformAdapter';

/**
 * Onboarding Screen for FocusGate Extension
 * Welcomes new users and guides them through the first setup.
 */

export async function renderOnboarding(container, onComplete) {
  let step = 1;

  function renderStep() {
    if (step === 1) {
      container.innerHTML = `
        <div class="glass-card widget-card" style="padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px; border-color: rgba(255, 255, 255, 0.1);">
          <div style="font-size: 80px; margin-bottom: 32px; color: var(--accent); filter: drop-shadow(0 0 20px var(--accent));">⬢</div>
          <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 12px; color: var(--text); letter-spacing: -1px;">FocusGate</h1>
          <p style="color: var(--muted); line-height: 1.8; margin-bottom: 40px; font-weight: 600; max-width: 320px;">
            Professional focus management. Precision-engineered for deep concentration performance.
          </p>
          <button class="btn-premium" id="nextStep" style="width: 100%; height: 50px; font-size: 14px;">INITIALIZE MISSION</button>
        </div>
      `;
    } else if (step === 2) {
      container.innerHTML = `
        <div class="glass-card widget-card" style="padding: 60px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px;">
          <div style="font-size: 60px; margin-bottom: 24px; color: var(--accent);">⬢</div>
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 32px; color: var(--text);">PROTECTION ENVELOPE</h1>
          
          <div class="glass-card" style="margin-bottom: 16px; width: 100%; text-align: left; cursor: pointer; border: 1px solid var(--glass-border); padding: 20px; background: rgba(255,255,255,0.02);" id="pickLevel1">
            <div style="font-weight: 800; color: var(--text); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">STANDARD (Browser-Only)</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; line-height: 1.5;">Fast setup. Blocks within the browser only. Zero credentials required.</div>
          </div>
          
          <div class="glass-card" style="margin-bottom: 32px; width: 100%; text-align: left; cursor: pointer; border: 1px solid rgba(124, 111, 247, 0.2); background: rgba(255, 255, 255, 0.03); padding: 20px;" id="pickLevel2">
            <div style="font-weight: 800; color: var(--accent); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">STRONG (Global Sync)</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; line-height: 1.5;">NextDNS-powered. Network-wide enforcement across all devices.</div>
          </div>
          
          <button class="btn-premium" id="prevStep" style="background:none; border:none; color:var(--muted); font-size:11px;">RETURN TO BEGINNING</button>
        </div>
      `;
    } else if (step === 3) {
      container.innerHTML = `
        <div class="glass-card widget-card" style="padding: 60px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 480px;">
          <div style="font-size: 64px; margin-bottom: 32px; color: var(--green);">✦</div>
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 12px; color: var(--text);">ENABLING PROTOCOL</h1>
          <p style="color: var(--muted); line-height: 1.8; margin-bottom: 40px; font-weight: 600; max-width: 280px;">
            Your status is now ready for deep work. Engaged for performance.
          </p>
          <button class="btn-premium" id="finishOnboarding" style="width: 100%; height: 50px; font-size: 14px; background: var(--green);">LAUNCH HUB</button>
        </div>
      `;
    }
    attachHandlers();
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
        await storage.set('fg_sync_mode', 'browser');
        await storage.set('fg_onboarding_done', 'true');
        step = 3;
        renderStep();
      });

    container.querySelector('#pickLevel2')?.addEventListener('click', () => {
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
