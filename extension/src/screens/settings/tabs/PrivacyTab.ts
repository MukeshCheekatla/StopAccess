import { toast } from '../../../lib/toast';
import { renderToggle as Toggle } from '../../../ui/components/Toggle';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';

export async function renderPrivacyTab(container: HTMLElement) {
  const { loadPrivacySettingsAction, updatePrivacySettingsAction } =
    await import('../../../../../packages/viewmodels/src/useSettingsVM');
  const { privacy: settings, isConfigured } = await loadPrivacySettingsAction();

  if (!isConfigured) {
    container.innerHTML = Card({
      label: 'Privacy Logic',
      title: 'Nodes Offline',
      description:
        'You must link a NextDNS Profile before configuring tracker and ad blocking.',
      badge: { text: 'UNCONFIGURED', variant: 'error' },
      content:
        '<button class="btn-premium" onclick="window.location.hash=\'#settings/connection\'">LINK PROFILE</button>',
    });
    return;
  }

  const items = [
    {
      id: 'disguisedTrackers',
      label: 'Disguised Trackers',
      desc: 'Blocks CNAME-based trackers.',
    },
    {
      id: 'allowAffiliateLinks',
      label: 'Allow Affiliate Links',
      desc: 'Enable to avoid breaking affiliate redirects.',
    },
    {
      id: 'blockPage',
      label: 'Custom Block Page',
      desc: 'Display a dashboard-styled block page for filtered nodes.',
    },
  ];

  const content = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${items
        .map(
          (item) => `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div>
            <div style="font-size: 14px; font-weight: 850; color: var(--text);">${
              item.label
            }</div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;">${
              item.desc
            }</div>
          </div>
          ${Toggle({
            id: `priv_${item.id}`,
            checked: !!(settings as any)[item.id],
            dataKind: 'privacy',
            dataId: item.id,
          })}
        </div>
      `,
        )
        .join('')}
    </div>
  `;

  container.innerHTML = Card({
    label: 'Privacy Hardening',
    title: 'Anonymization Perimeters',
    description:
      'Configure real-time tracker interception and ad-space neutralization.',
    badge: { text: 'ACTIVE PERIMETER', variant: 'active' },
    content,
  });

  // Attach handlers
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const el = e.target as HTMLInputElement;
      const key = el.getAttribute('data-id');
      const wasChecked = !el.checked;

      el.disabled = true;
      try {
        const nextSettings = { ...settings, [key]: el.checked };
        const result = await updatePrivacySettingsAction(nextSettings);
        if (result.ok) {
          toast.info(`${key} updated.`);
        } else {
          throw new Error(result.error);
        }
      } catch (err: any) {
        toast.error(`Sync Fail: ${err.message}`);
        el.checked = wasChecked;
      } finally {
        el.disabled = false;
      }
    });
  });
}
