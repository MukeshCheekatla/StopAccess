import { renderSectionCard as Card } from '../../../ui/components/SectionCard';
import { pinGate } from '../../../lib/pinGate';

export async function renderAccessTab(container: HTMLElement) {
  const { extensionAdapter: storage } = await import(
    '../../../background/platformAdapter'
  );
  const currentPin = await storage.getString('guardian_pin');
  const isOk = !!currentPin;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 850; color: var(--text);">Guardian PIN</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;">Establish a 4-digit numeric code required for any significant configuration changes.</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="password" id="guardian_pin_input" placeholder="----" maxlength="4" class="input-premium" style="width: 100px; text-align: center; letter-spacing: 6px; font-weight: 850; font-size: 14px; height: 44px; border-radius: 12px;">
          <button class="btn-premium" id="btn_save_pin" style="height: 44px; padding: 0 20px; font-size: 11px; background: var(--accent); box-shadow: 0 4px 12px rgba(0,196,140,0.2);">SET PIN</button>
        </div>
      </div>

      ${
        isOk
          ? `
        <div style="display: flex; justify-content: flex-end; padding-top: 16px;">
          <button id="btn_clear_pin" style="background:none; border:none; color:var(--red); font-size:10px; font-weight:850; cursor:pointer; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">
            DEACTIVATE SECURITY LAYER
          </button>
        </div>
      `
          : ''
      }

    </div>
  `;

  container.innerHTML = Card({
    label: 'Shield Integrity',
    title: 'Access Control',
    description:
      'Protect your focus directives with a local authorization perimeter.',
    badge: {
      text: isOk ? 'SHIELDED' : 'UNPROTECTED',
      variant: isOk ? 'active' : 'warning',
    },
    content,
  });

  // Attach handlers
  container
    .querySelector('#btn_save_pin')
    ?.addEventListener('click', async () => {
      const input = container.querySelector(
        '#guardian_pin_input',
      ) as HTMLInputElement;
      const pin = input.value.trim();
      const ok = await pinGate.setPin(pin);
      if (ok) {
        input.value = '';
        renderAccessTab(container);
      }
    });

  container
    .querySelector('#btn_clear_pin')
    ?.addEventListener('click', async () => {
      const ok = await pinGate.clearPin();
      if (ok) {
        renderAccessTab(container);
      }
    });
}
