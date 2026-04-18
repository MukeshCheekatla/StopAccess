import type { NextDNSParentalControlSettings } from '@stopaccess/types';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
  renderInfoTooltip,
  UI_TOKENS,
} from '../../../lib/ui';

const iconSearch =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const iconYoutube =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 11.72 1 11.72s0 3.58.46 5.3a2.78 2.78 0 0 0 1.94 2C5.12 19.44 12 19.44 12 19.44s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.3 23 11.72 23 11.72s0-3.58-.46-5.3z"/><polygon points="9.75 15.02 15.5 11.72 9.75 8.42 9.75 15.02"/></svg>';
const iconShield =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

export function renderParentalSection(
  parental: NextDNSParentalControlSettings | null,
): string {
  if (!parental) {
    return '';
  }

  const controls = [
    {
      key: 'safeSearch',
      label: 'SafeSearch',
      tooltip:
        'Forces "SafeSearch" across search engines like Google, Bing, and DuckDuckGo to filter out explicit content.',
      desc: 'Filter explicit results on search engines.',
      icon: iconSearch,
      active: parental.safeSearch,
    },
    {
      key: 'youtubeRestrictedMode',
      label: 'YouTube Restricted Mode',
      tooltip:
        "Enables YouTube's restricted mode to hide potentially mature videos and comments.",
      desc: 'Filter out mature videos on YouTube.',
      icon: iconYoutube,
      active: parental.youtubeRestrictedMode,
    },
    {
      key: 'blockBypass',
      label: 'Block Bypass Methods',
      tooltip:
        'Prevents the use of tunnels like VPNs, Tor, and proxies that users might use to circumvent your DNS policies.',
      desc: 'Block VPNs, proxies, and Tor.',
      icon: iconShield,
      active: parental.blockBypass,
    },
  ];

  const activeCount = controls.filter((c) => c.active).length;

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      ${renderSectionTitleRow(
        iconShield,
        'var(--fg-blue)',
        'Parental Control',
        renderSectionBadge(`${activeCount} Active`),
      )}

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${controls
          .map(
            (ctrl) => `
          <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-bg-[var(--fg-surface-hover)]"
            data-key="${ctrl.key}"
            style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"
          >
            <div class="fg-relative fg-shrink-0">
              <span class="fg-text-[var(--muted)]">${ctrl.icon}</span>
            </div>

             <div class="fg-flex-1 fg-min-w-0">
               <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
                 <div style="${UI_TOKENS.TEXT.CARD_TITLE}">
                   ${ctrl.label}
                 </div>
                 ${renderInfoTooltip(ctrl.tooltip || '')}
               </div>
               <div style="${
                 UI_TOKENS.TEXT.SUBTEXT
               }; border: none; line-height: 1.4; opacity: 0.6;">
                 ${ctrl.desc}
               </div>
             </div>

            <div class="fg-shrink-0">
              ${renderToggleSwitch(ctrl.key, ctrl.active)}
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}
