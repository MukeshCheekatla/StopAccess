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
} from '../../../lib/ui';

const iconLock =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconSlash =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';

export function renderContentProtectionSection(
  settings: NextDNSSecuritySettings,
): string {
  const active = settings.csam;

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      ${renderSectionTitleRow(
        iconLock,
        '#ef4444',
        'Content Protection',
        renderSectionBadge(active ? '1 Active' : '0 Active'),
      )}

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150"
          data-key="csam"
          style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"
          onmouseenter="this.style.transform='translateY(-2px)';this.style.opacity='0.8'"
          onmouseleave="this.style.transform='';this.style.opacity='1'"
        >
          <!-- Icon (Left) -->
          <div class="fg-relative fg-shrink-0">
            <span class="fg-text-[var(--muted)]">${iconSlash}</span>
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
            <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-leading-snug">
              Block child sexual abuse material.
            </div>
            <div class="fg-inline-block fg-text-[10px] fg-font-black fg-tracking-[1px]  fg-mt-[5px] fg-px-2 fg-py-[2px] fg-rounded-[10px]" style="background: rgba(0,196,140,0.1); color: var(--green); border: 1px solid rgba(0,196,140,0.2);">
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
