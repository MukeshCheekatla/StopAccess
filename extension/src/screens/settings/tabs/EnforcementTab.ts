import { toast } from '../../../lib/toast';
import { renderToggle as Toggle } from '../../../ui/components/Toggle';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';
import { pinGate } from '../../../lib/pinGate';
import { checkGuard } from '../../../background/sessionGuard';

export async function renderEnforcementTab(container: HTMLElement) {
  const { loadSettingsData, setSyncModeAction, setStrictModeAction } =
    await import('../../../../../packages/viewmodels/src/useSettingsVM');
  const { syncMode: mode, strict } = await loadSettingsData();
  const guardRes = await checkGuard('change_settings');
  const isLocked = !guardRes.allowed;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 40px;">
      
      <!-- MODE SELECTION -->
      <div>
        <div class="field-label" style="margin-bottom: 12px;">Enforcement Strategy</div>
        <div class="enforcement-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0;">
          <div class="enforcement-card ${mode === 'browser' ? 'active' : ''} ${
    isLocked ? 'locked' : ''
  }" data-mode="browser" style="padding: 20px; border-radius: 16px;">
            <div class="enforcement-level" style="font-weight: 850; letter-spacing: 0.5px;">STANDARD</div>
            <div class="enforcement-tag" style="opacity: 0.6; font-size: 10px; margin-top: 4px;">BROWSER ENGINE</div>
            <div class="enforcement-desc" style="font-size: 11px; margin-top: 10px; opacity: 0.8; line-height: 1.5;">Fast, local intercepts using browser-native blocking. No cloud sync required.</div>
          </div>
          <div class="enforcement-card ${mode === 'profile' ? 'active' : ''} ${
    isLocked ? 'locked' : ''
  }" data-mode="profile" style="padding: 20px; border-radius: 16px;">
            <div class="enforcement-level" style="font-weight: 850; letter-spacing: 0.5px;">STRONG</div>
            <div class="enforcement-tag" style="opacity: 0.6; font-size: 10px; margin-top: 4px;">CLOUD HARDENED</div>
            <div class="enforcement-desc" style="font-size: 11px; margin-top: 10px; opacity: 0.8; line-height: 1.5;">Full NextDNS integration for network-wide enforcement. Maximum friction.</div>
          </div>
        </div>
      </div>

      <!-- STRICT MODE -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-top: 32px; border-top: 1px solid var(--glass-border);">
        <div>
          <div style="font-size: 14px; font-weight: 850; color: var(--text);">Strict Enforcement</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;">Prevent settings tampering and rule deletion during active focus sessions.</div>
        </div>
        ${Toggle({
          id: 'chk_strict',
          checked: strict,
          disabled: isLocked,
        })}
      </div>

    </div>
  `;

  container.innerHTML = Card({
    label: 'Engine Perimeters',
    title: 'Lockdown Directives',
    description:
      'Determine the intensity of domain blocking and prevention of interface tampering.',
    badge: {
      text: isLocked ? 'LOCKED' : 'CONFIGURABLE',
      variant: isLocked ? 'warning' : 'active',
    },
    content,
  });

  // Attach handlers
  container.querySelectorAll('.enforcement-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const targetMode = card.getAttribute('data-mode')!;
      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      const pinCheck = await pinGate.checkPin(
        `Change Enforcement Mode: ${targetMode}`,
      );
      if (!pinCheck.allowed) {
        return;
      }

      await setSyncModeAction(targetMode);
      renderEnforcementTab(container);
    });
  });

  container
    .querySelector('#chk_strict')
    ?.addEventListener('change', async (e) => {
      const el = e.target as HTMLInputElement;
      const isChecked = el.checked;

      if (!isChecked) {
        const pinRes = await pinGate.checkPin('Disable Strict Mode');
        if (!pinRes.allowed) {
          el.checked = true;
          return;
        }
      }

      await setStrictModeAction(isChecked);
      toast.info(`Strict Mode ${isChecked ? 'Activated' : 'Suspended'}`);
    });
}
