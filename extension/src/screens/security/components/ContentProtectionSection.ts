/**
 * ContentProtectionSection
 * Renders: CSAM protection (and future content toggles)
 */

import type { NextDNSSecuritySettings } from '@focusgate/types';

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
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
        <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
          <span class="fg-text-[#ef4444]">${iconLock}</span> Content Protection
        </div>
        <span class="fg-text-[9px] fg-font-black fg-uppercase fg-tracking-[0.8px] fg-py-[3px] fg-px-[10px] fg-rounded-full" style="background: rgba(255,255,255,0.05); color: var(--muted); border: 1px solid rgba(255,255,255,0.07);">${
          active ? '1 ACTIVE' : '0 ACTIVE'
        }</span>
      </div>

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150"
          data-key="csam"
          style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"
          onmouseenter="this.style.transform='translateY(-2px)';this.style.background='rgba(255,255,255,0.05)'"
          onmouseleave="this.style.transform='';this.style.background='rgba(255,255,255,0.03)'"
        >
          <!-- Icon (Left) -->
          <div class="fg-relative fg-shrink-0">
            <span class="fg-text-[var(--muted)]">${iconSlash}</span>
          </div>

          <!-- Content (Middle) -->
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-text-[13px] fg-font-bold fg-mb-[2px] fg-leading-[1.3] fg-text-[var(--text)]">
              Block CSAM
            </div>
            <div class="fg-text-[10px] fg-text-[var(--muted)] fg-leading-snug">
              Block child sexual abuse material.
            </div>
            <div class="fg-inline-block fg-text-[8px] fg-font-black fg-tracking-[1px] fg-uppercase fg-mt-[5px] fg-px-2 fg-py-[2px] fg-rounded-[10px]" style="background: rgba(0,196,140,0.1); color: var(--green); border: 1px solid rgba(0,196,140,0.2);">
              RECOMMENDED
            </div>
          </div>

          <!-- Toggle (Right) -->
          <div class="fg-shrink-0">
            <button
              class="security-toggle-btn fg-relative fg-shrink-0 fg-cursor-pointer ${
                active ? 'active' : ''
              }"
              data-key="csam"
              aria-checked="${active}"
              role="switch"
              style="width: 32px; height: 18px; border-radius: 9px; border: none;
                background: ${
                  active ? 'var(--green)' : 'rgba(255,255,255,0.1)'
                };
                transition: background 0.2s ease; outline: none;"
            >
              <span style="position: absolute; top: 2px; left: ${
                active ? '16px' : '2px'
              };
                width: 14px; height: 14px; border-radius: 50%;
                background: white; transition: left 0.2s ease;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
