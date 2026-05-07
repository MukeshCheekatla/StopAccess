import { COLORS } from '@/ui/theme/designTokens';
/**
 * ContentProtectionSection
 * Renders: CSAM protection (and future content toggles)
 */

import type { NextDNSSecuritySettings } from '@stopaccess/types';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
  renderInfoTooltip,
} from '@/ui/ui';
import { ICONS } from '@/ui/Icons';

export function renderContentProtectionSection(
  settings: NextDNSSecuritySettings,
): string {
  const active = settings.csam;

  return `
    <div class="fg-p-2 fg-mb-4">
      ${renderSectionTitleRow(
        ICONS.LOCK,
        COLORS.red,
        'Content Protection',
        renderSectionBadge(active ? '1 Active' : '0 Active'),
      )}

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-bg-[${
          COLORS.surfaceHover
        }]"
          data-key="csam"
          style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  };"
        >
          <!-- Icon (Left) -->
          <div class="fg-relative fg-shrink-0">
            <span class="fg-text-[var(--muted)]">${ICONS.SLASH}</span>
          </div>

          <!-- Content (Middle) -->
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
              <div class="fg-text-sm fg-font-bold fg-leading-[1.3] fg-text-[var(--text)]">
                Block CSAM
              </div>
              ${renderInfoTooltip(
                'Blocks access to known Child Sexual Abuse Material (CSAM) domains using industry-standard safety lists from organizations like the NCMEC.',
              )}
            </div>
            <div class="fg-text-[11px] fg-text-[${
              COLORS.text
            }] fg-opacity-60 fg-leading-snug">
              Block child sexual abuse material.
            </div>
            <div class="fg-inline-block fg-text-[10px] fg-font-black fg-tracking-[1px]  fg-mt-[5px] fg-px-2 fg-py-[2px] fg-rounded-[10px]" style="background: ${
              COLORS.emeraldSoft
            }; color: var(--green); border: 1px solid ${COLORS.emeraldBorder};">
              RECOMMENDED
            </div>
          </div>

          <div class="fg-shrink-0">
            ${renderToggleSwitch('csam', active)}
          </div>
        </div>
      </div>
    </div>
  `;
}
