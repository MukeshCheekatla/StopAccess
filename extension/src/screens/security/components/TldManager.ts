/**
 * TldManager
 * Renders blocked TLD list with add/remove functionality.
 */

import type { NextDNSTld } from '@stopaccess/types';

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
    <div class="glass-card fg-mb-6 fg-p-8 fg-rounded-[32px] fg-relative fg-overflow-hidden">
      <!-- Decorative background glow -->
      <div class="fg-absolute fg-top-[-20px] fg-right-[-20px] fg-w-32 fg-h-32 fg-rounded-full fg-bg-[var(--yellow)] fg-opacity-5 fg-blur-3xl"></div>

      <div class="fg-flex fg-items-center fg-justify-between fg-mb-6">
        <div class="fg-flex fg-items-center fg-gap-3">
          <div class="fg-w-10 fg-h-10 fg-rounded-2xl fg-bg-[var(--yellow)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--yellow)]">
            ${iconGlobe}
          </div>
          <div>
            <div class="fg-flex fg-items-center fg-gap-2">
              <div class="fg-text-sm fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight">Global Shield</div>
              <div
                class="fg-tooltip fg-info-icon"
                data-tooltip="Enhance security by blocking entire top-level domains (TLDs) like .ru, .cn, or .top to prevent access to high-risk regions and malicious extensions."
              >
                i
              </div>
            </div>
            <div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase fg-tracking-widest">TLD Blocker</div>
          </div>
        </div>
        <div class="fg-flex fg-items-center fg-gap-2">
           <span class="fg-text-[11px] fg-font-black fg-text-[var(--yellow)] fg-bg-[var(--yellow)]/10 fg-px-3 fg-py-1 fg-rounded-full" style="border: 1px solid rgba(251,191,36,0.15);">
            ${tlds.length} BLOCKED
           </span>
        </div>
      </div>

      <div class="fg-text-[11px] fg-text-[var(--muted)] fg-mb-8 fg-leading-relaxed fg-max-w-[420px]">
        Enhance your network security by blocking entire top-level domains. 
        <span class="fg-text-[var(--fg-text)] fg-font-bold">Prevents access to high-risk regions and malicious generic extensions.</span>
      </div>

      <!-- TLD Creative Input -->
      <div class="fg-relative fg-mb-8">
        <div class="fg-flex fg-items-center fg-gap-3 fg-p-2 fg-rounded-[20px] fg-transition-all fg-duration-300 focus-within:fg-ring-2 focus-within:fg-ring-[var(--yellow)]/20" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
          <div class="fg-pl-4 fg-text-[var(--fg-muted)] fg-font-black fg-text-sm">.</div>
          <input
            type="text"
            id="tld_input"
            placeholder="enter extension (e.g. ru, cn, top)"
            class="fg-flex-1 fg-bg-transparent fg-border-none fg-outline-none fg-text-sm fg-font-bold fg-p-2 fg-text-[var(--fg-text)]"
            style="text-transform: lowercase;"
            maxlength="20"
          >
          <button id="btn_add_tld" class="fg-bg-[var(--yellow)]/10 fg-text-[var(--yellow)] fg-text-[11px] fg-font-black fg-px-6 fg-py-3 fg-rounded-xl fg-transition-all hover:fg-bg-[var(--yellow)]/20 fg-uppercase fg-tracking-wider" style="border: 1px solid rgba(251,191,36,0.2);">
            Block
          </button>
        </div>
      </div>

      <!-- Quick Suggestions Section -->
      ${
        suggestions.length > 0
          ? `
        <div class="fg-mb-8">
          <div class="fg-text-[11px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-40 fg-uppercase fg-tracking-[1.5px] fg-mb-4">
            Suggested Blockpoints
          </div>
          <div class="fg-flex fg-flex-wrap fg-gap-2">
            ${suggestions
              .slice(0, 10)
              .map(
                (t) => `
              <button
                class="tld-quick-add fg-flex fg-items-center fg-gap-2 fg-px-4 fg-py-2 fg-rounded-xl fg-transition-all fg-cursor-pointer fg-font-bold hover:fg-translate-y-[-1px] hover:fg-opacity-80"
                data-id="${t.id}"
                style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text);"
              >
                <span class="fg-text-[var(--yellow)] fg-text-xs">.</span>
                <span class="fg-text-[11px]">${t.id}</span>
                <span class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-40 fg-font-black">Add</span>
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <!-- Active Shield List -->
      <div class="fg-mt-4">
        <div class="fg-text-[11px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-40 fg-uppercase fg-tracking-[1.5px] fg-mb-4">
          Currently Shadowed
        </div>
        ${
          tlds.length > 0
            ? `
          <div class="fg-flex fg-flex-wrap fg-gap-3">
            ${tlds
              .map(
                (tld) => `
              <div class="fg-group fg-flex fg-items-center fg-gap-3 fg-pl-4 fg-pr-2 fg-py-2 fg-rounded-xl fg-transition-all fg-relative" 
                style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15);">
                <div class="fg-w-1.5 fg-h-1.5 fg-rounded-full fg-bg-[var(--red)] fg-animate-pulse"></div>
                <div class="fg-text-[13px] fg-font-black fg-text-[var(--fg-text)]">.${tld.id}</div>
                <button
                  class="tld-remove fg-w-7 fg-h-7 fg-rounded-lg fg-flex fg-items-center fg-justify-center fg-transition-all hover:fg-bg-[var(--red)]/10"
                  data-id="${tld.id}"
                  title="Unblock ${tld.id}"
                  style="border: none; background: transparent; color: var(--fg-muted);"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : `
          <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-py-10 fg-rounded-3xl fg-opacity-40" style="border: 1px dashed var(--fg-glass-border);">
             <div class="fg-mb-2">${iconGlobe}</div>
             <div class="fg-text-[11px] fg-font-bold fg-uppercase fg-tracking-wider">No Regions Restricted</div>
          </div>
        `
        }
      </div>
    </div>
  `;
}
