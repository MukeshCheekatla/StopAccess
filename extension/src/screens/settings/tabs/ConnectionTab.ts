import { toast } from '../../../lib/toast';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';
import { pinGate } from '../../../lib/pinGate';

export async function renderConnectionTab(container: HTMLElement) {
  const { loadSettingsData, connectNextDNSAction } = await import(
    '../../../../../packages/viewmodels/src/useSettingsVM'
  );
  const { profileId, apiKey } = await loadSettingsData();
  const isOk = !!(profileId && apiKey);

  const content = `
    <div class="field-group" style="display: flex; flex-direction: column; gap: 20px;">
      <div>
        <label class="field-label" style="font-size: 11px; margin-bottom: 8px;">Profile ID</label>
        <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input-premium" style="height: 52px; font-size: 15px; border-radius: 16px;">
      </div>
      <div>
        <label class="field-label" style="font-size: 11px; margin-bottom: 8px;">API Key</label>
        <input type="password" id="cfg_apiKey" value="${apiKey}" placeholder="••••••••••••••••" class="input-premium" style="height: 52px; font-size: 15px; border-radius: 16px;">
      </div>
    </div>
    
    <div id="connection_feedback" style="display: none; padding: 16px; border-radius: 16px; font-size: 12px; font-weight: 700; margin-top: 24px; border: 1px solid transparent; background: rgba(0,0,0,0.1); line-height: 1.6;"></div>
    
    <button class="btn-premium" id="btn_save_config" style="width: 100%; justify-content: center; height: 56px; border-radius: 18px; font-size: 14px; margin-top: 24px; background: var(--accent); box-shadow: 0 10px 20px rgba(0,196,140,0.2);">
      SAVE & TEST CONNECTION
    </button>
  `;

  container.innerHTML = Card({
    label: 'NextDNS Credentials',
    title: 'Cloud Handshake',
    description:
      'Connect your unique NextDNS configuration profile to enable cloud-hardened enforcement.',
    badge: {
      text: isOk ? 'LINKED' : 'DISCONNECTED',
      variant: isOk ? 'active' : 'error',
    },
    content,
  });

  // Attach handlers
  container
    .querySelector('#btn_save_config')
    ?.addEventListener('click', async () => {
      const pid = (
        container.querySelector('#cfg_profile') as HTMLInputElement
      ).value.trim();
      const key = (
        container.querySelector('#cfg_apiKey') as HTMLInputElement
      ).value.trim();
      const feedback = container.querySelector(
        '#connection_feedback',
      ) as HTMLElement;
      const btn = container.querySelector(
        '#btn_save_config',
      ) as HTMLButtonElement;

      if (!pid || !key) {
        toast.error('Both Profile ID and API Key are mandatory.');
        return;
      }

      const pinCheck = await pinGate.checkPin('Update NextDNS Credentials');
      if (!pinCheck.allowed) {
        return;
      }

      btn.innerText = 'SYNCHRONIZING...';
      btn.disabled = true;
      feedback.style.display = 'block';
      feedback.innerText = 'Verifying cloud signal...';
      feedback.style.borderColor = 'var(--glass-border)';

      try {
        const result = await connectNextDNSAction(pid, key);
        if (result.ok) {
          feedback.style.color = 'var(--green)';
          feedback.style.borderColor = 'rgba(0,196,140,0.1)';
          feedback.innerHTML =
            '<strong>Connection Optimal</strong><br>Handshake verified. Nodes synchronized.';
          btn.innerText = 'CONNECTED';
          toast.success('Sync complete.');
          chrome.runtime.sendMessage({ action: 'manualSync' });
        } else {
          throw new Error(result.error || 'Lost connection during handshake.');
        }
      } catch (err: any) {
        feedback.style.color = 'var(--red)';
        feedback.style.borderColor = 'rgba(255,0,0,0.1)';
        feedback.innerText = `Error: ${err.message}`;
        btn.innerText = 'RETRY CONNECTION';
        btn.disabled = false;
      }
    });
}
