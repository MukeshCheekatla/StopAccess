import type { NextDNSParentalControlSettings } from '@stopaccess/types';
import { COLORS } from '@/ui/theme/designTokens';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
  renderInfoTooltip,
  UI_TOKENS,
} from '@/ui/ui';
import { ICONS } from '@/ui/svgicons';

const iconSearch = ICONS.SEARCH;
const iconYoutube = ICONS.YOUTUBE;
const iconShield = ICONS.SHIELD;

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
      color: COLORS.blue,
    },
    {
      key: 'youtubeRestrictedMode',
      label: 'YouTube Restricted Mode',
      tooltip:
        "Enables YouTube's restricted mode to hide potentially mature videos and comments.",
      desc: 'Filter out mature videos on YouTube.',
      icon: iconYoutube,
      active: parental.youtubeRestrictedMode,
      color: COLORS.red,
    },
    {
      key: 'blockBypass',
      label: 'Block Bypass Methods',
      tooltip:
        'Prevents the use of tunnels like VPNs, Tor, and proxies that users might use to circumvent your DNS policies.',
      desc: 'Block VPNs, proxies, and Tor.',
      icon: iconShield,
      active: parental.blockBypass,
      color: COLORS.indigo,
    },
  ];

  const activeCount = controls.filter((c) => c.active).length;

  return `
    <div class="fg-p-2 fg-mb-4">
      ${renderSectionTitleRow(
        iconShield,
        COLORS.blue,
        'Parental Control',
        renderSectionBadge(`${activeCount} Active`),
      )}

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${controls
          .map(
            (ctrl) => `
          <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-bg-[${
            COLORS.surfaceHover
          }]"
            data-key="${ctrl.key}"
            style="background: ${COLORS.glassBg}; border: 1px solid ${
              COLORS.glassBorder
            };"
          >
            <div class="fg-relative fg-shrink-0">
              <span style="color: ${ctrl.color};">${ctrl.icon}</span>
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
