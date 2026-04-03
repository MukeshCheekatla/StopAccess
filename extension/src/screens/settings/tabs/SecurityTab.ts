import { toast } from '../../../lib/toast';
import { renderToggle as Toggle } from '../../../ui/components/Toggle';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';
import { pinGate } from '../../../lib/pinGate';

export async function renderSecurityTab(container: HTMLElement) {
  const { loadSecuritySettingsAction, updateSecuritySettingsAction } =
    await import('../../../../../packages/viewmodels/src/useSettingsVM');
  const { security: settings, isConfigured } =
    await loadSecuritySettingsAction();

  if (!isConfigured) {
    container.innerHTML = Card({
      label: 'Security Intelligence',
      title: 'Nodes Offline',
      description:
        'You must link a NextDNS Profile before configuring cloud-level security modules.',
      badge: { text: 'UNCONFIGURED', variant: 'error' },
      content:
        '<button class="btn-premium" onclick="window.location.hash=\'#settings/connection\'">LINK PROFILE</button>',
    });
    return;
  }

  const securityItems = [
    {
      id: 'threatIntelligenceFeeds',
      label: 'Threat Intelligence Feeds',
      desc: 'Blocks domains known to host malware or phishing.',
    },
    {
      id: 'aiThreatDetection',
      label: 'AI Threat Detection',
      desc: 'Uses machine learning to identify new threats in real-time.',
    },
    {
      id: 'googleSafeBrowsing',
      label: 'Google Safe Browsing',
      desc: 'Syncs with Google’s malware & phishing database.',
    },
    {
      id: 'cryptojacking',
      label: 'Cryptojacking Protection',
      desc: 'Blocks browser-based crypto miners.',
    },
    {
      id: 'dnsRebinding',
      label: 'DNS Rebinding Protection',
      desc: 'Prevents external domains from mapping to local IPs.',
    },
    {
      id: 'typosquatting',
      label: 'Typosquatting Protection',
      desc: 'Blocks deliberate misspellings of popular domains.',
    },
    {
      id: 'dga',
      label: 'DGA Protection',
      desc: 'Blocks algorithmically generated domain names.',
    },
  ];

  const content = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${securityItems
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
            id: `sec_${item.id}`,
            checked: !!(settings as any)[item.id],
            dataKind: 'security',
            dataId: item.id,
          })}
        </div>
      `,
        )
        .join('')}
    </div>
  `;

  container.innerHTML = Card({
    label: 'Cloud Defense',
    title: 'Security Hardening',
    description:
      'Configure real-time domain interception and malware defense at the network level.',
    badge: { text: 'ACTIVE SHIELD', variant: 'active' },
    content,
  });

  // Attach handlers
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const el = e.target as HTMLInputElement;
      const key = el.getAttribute('data-id');
      const wasChecked = !el.checked;

      const pinCheck = await pinGate.checkPin(`Modify Security: ${key}`);
      if (!pinCheck.allowed) {
        el.checked = wasChecked;
        return;
      }

      el.disabled = true;
      try {
        const nextSettings = { ...settings, [key]: el.checked };
        const result = await updateSecuritySettingsAction(nextSettings);
        if (result.ok) {
          toast.success(`${key} updated.`);
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
