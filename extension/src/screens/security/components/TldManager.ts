/**
 * TldManager
 * Renders blocked TLD list with add/remove functionality.
 */

import type { NextDNSTld } from '@focusgate/types';

// Common TLDs to suggest
const COMMON_RISKY_TLDS = [
  { id: 'ru', label: '.ru — Russia' },
  { id: 'cn', label: '.cn — China' },
  { id: 'cf', label: '.cf — Central African Republic' },
  { id: 'ga', label: '.ga — Gabon' },
  { id: 'ml', label: '.ml — Mali' },
  { id: 'tk', label: '.tk — Tokelau' },
  { id: 'pw', label: '.pw — Palau' },
  { id: 'top', label: '.top — Generic' },
  { id: 'xyz', label: '.xyz — Generic' },
  { id: 'loan', label: '.loan — Generic' },
  { id: 'accountants', label: '.accountants' },
];

const iconGlobe =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

export function renderTldManager(tlds: NextDNSTld[]): string {
  const activeIds = new Set(tlds.map((t) => t.id.toLowerCase()));
  const suggestions = COMMON_RISKY_TLDS.filter((t) => !activeIds.has(t.id));

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
        <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
          <span class="fg-text-[#fbbf24]">${iconGlobe}</span> Blocked TLDs
        </div>
        <span class="fg-text-[9px] fg-font-black fg-uppercase fg-tracking-[0.8px] fg-py-[3px] fg-px-[10px] fg-rounded-full" style="background: rgba(255,255,255,0.05); color: var(--muted); border: 1px solid rgba(255,255,255,0.07);">${
          tlds.length
        } BLOCKED</span>
      </div>

      <div class="fg-text-[11px] fg-text-[var(--muted)] fg-mb-5 fg-leading-[1.5]">
        Block all domains under specific top-level domains. 
        <span class="fg-text-[var(--yellow)] fg-opacity-80">Useful for blocking high-risk regions or generic extension abuse.</span>
      </div>

      <!-- TLD Input Area -->
      <div class="fg-flex fg-gap-2 fg-mb-6 fg-p-3 fg-rounded-2xl" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
        <input
          type="text"
          id="tld_input"
          placeholder="Enter TLD (e.g. ru, cn)"
          class="input fg-flex-1"
          style="text-transform: lowercase; font-weight: 700; height: 38px; background: transparent; border: none; padding-left: 12px; outline: none; font-size: 13px; color: var(--text);"
          maxlength="20"
        >
        <button class="btn fg-px-5 fg-font-black fg-text-[11px] fg-uppercase fg-tracking-wider" id="btn_add_tld" style="height: 38px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: white;">
          Block TLD
        </button>
      </div>

      <!-- Quick Sugestions Grid -->
      ${
        suggestions.length > 0
          ? `
        <div class="fg-mb-6">
          <div class="fg-text-[9px] fg-font-black fg-text-[var(--muted)] fg-uppercase fg-tracking-[1.2px] fg-mb-3 fg-opacity-60">
            Quick Block Suggestions
          </div>
          <div class="fg-grid fg-grid-cols-4 fg-gap-2">
            ${suggestions
              .slice(0, 8)
              .map(
                (t) => `
              <button
                class="tld-quick-add fg-text-[11px] fg-rounded-xl fg-px-3 fg-py-2 fg-transition-all fg-cursor-pointer fg-font-bold fg-text-left"
                data-id="${t.id}"
                style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: var(--text);"
                onmouseenter="this.style.background='rgba(255,255,255,0.08)'; this.style.transform='translateY(-1px)'"
                onmouseleave="this.style.background='rgba(255,255,255,0.03)'; this.style.transform=''"
              >
                <div class="fg-opacity-60 fg-text-[9px] fg-uppercase fg-mb-[2px]">.${
                  t.id
                }</div>
                <div class="fg-truncate fg-text-[10px]">${
                  t.label.split('—')[1]?.trim() || t.id
                }</div>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <!-- Active Block List Grid -->
      ${
        tlds.length > 0
          ? `
        <div class="fg-grid fg-grid-cols-3 fg-gap-2">
          ${tlds
            .map(
              (tld) => `
            <div class="active-tld-card fg-flex fg-flex-col fg-gap-3 fg-p-4 fg-rounded-2xl fg-transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
              <div class="fg-flex fg-items-center fg-justify-between">
                <div class="fg-flex fg-items-center fg-gap-2">
                  <span style="color: var(--muted); opacity: 0.6; transform: scale(0.8);">${iconGlobe}</span>
                  <span class="fg-text-[14px] fg-font-black fg-text-[var(--text)]">
                    .${tld.id}
                  </span>
                </div>
                <div class="fg-w-[5px] fg-h-[5px] fg-rounded-full" style="background: var(--red); box-shadow: 0 0 5px var(--red);"></div>
              </div>
              <button
                class="tld-remove fg-text-[9px] fg-w-full fg-py-[6px] fg-rounded-xl fg-transition-all fg-cursor-pointer fg-font-black fg-uppercase fg-tracking-wider"
                data-id="${tld.id}"
                style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); color: var(--muted);"
                onmouseenter="this.style.background='rgba(255,71,87,0.08)'; this.style.color='var(--red)'; this.style.borderColor='rgba(255,71,87,0.15)';"
                onmouseleave="this.style.background='rgba(255,255,255,0.02)'; this.style.color='var(--muted)'; this.style.borderColor='rgba(255,255,255,0.06)';"
              >
                UNBLOCK
              </button>
            </div>
          `,
            )
            .join('')}
        </div>
      `
          : `
        <div class="fg-text-center fg-p-8 fg-text-[var(--muted)] fg-text-xs fg-rounded-3xl" style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08);">
          <div style="color: var(--muted); opacity: 0.3;" class="fg-mb-3 fg-flex fg-justify-center">${iconGlobe}</div>
          No top-level domains are blocked.
        </div>
      `
      }
    </div>
  `;
}
