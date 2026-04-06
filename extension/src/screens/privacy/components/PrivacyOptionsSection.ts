/**
 * PrivacyOptionsSection
 * Disguised trackers + allow affiliate toggles — no emojis.
 */

import type { NextDNSPrivacySettings } from '@focusgate/types';

const iconSettings =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const iconEyeOff =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
const iconLink =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

export function renderPrivacyOptionsSection(
  settings: NextDNSPrivacySettings,
): string {
  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
        <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
          <span class="fg-text-[#6366f1]">${iconSettings}</span> Privacy Settings
        </div>
      </div>

      <div class="fg-grid fg-grid-cols-3 fg-gap-3">
        <!-- Disguised Trackers -->
        <div 
          class="privacy-option-card fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-transition-all fg-cursor-pointer"
          data-key="disguisedTrackers"
          style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"
          onmouseenter="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(-2px)'"
          onmouseleave="this.style.background='rgba(255,255,255,0.03)'; this.style.transform=''"
        >
          <div class="fg-shrink-0 fg-text-[#818cf8]">${iconEyeOff}</div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-text-[13px] fg-font-bold fg-text-[var(--text)] fg-mb-[1px] fg-truncate">Block Disguised Third-Party Trackers</div>
            <div class="fg-text-[10px] fg-text-[var(--muted)] fg-leading-tight fg-line-clamp-2">Automatically detect and block third-party trackers disguising themselves as first-party.</div>
          </div>
          <button
            class="privacy-option-toggle ${
              settings.disguisedTrackers ? 'active' : ''
            } fg-relative fg-shrink-0 fg-cursor-pointer"
            data-key="disguisedTrackers"
            aria-checked="${settings.disguisedTrackers}"
            role="switch"
            style="width: 32px; height: 18px; border-radius: 9px; border: none;
              background: ${
                settings.disguisedTrackers
                  ? 'var(--green)'
                  : 'rgba(255,255,255,0.1)'
              };
              transition: background 0.2s; outline: none;"
          >
            <span style="position: absolute; top: 2px; left: ${
              settings.disguisedTrackers ? '16px' : '2px'
            };
              width: 14px; height: 14px; border-radius: 50%;
              background: white; transition: left 0.2s;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
          </button>
        </div>

        <!-- Allow Affiliate -->
        <div 
          class="privacy-option-card fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-transition-all fg-cursor-pointer"
          data-key="allowAffiliate"
          style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"
          onmouseenter="this.style.background='rgba(255,255,255,0.05)'; this.style.transform='translateY(-2px)'"
          onmouseleave="this.style.background='rgba(255,255,255,0.03)'; this.style.transform=''"
        >
          <div class="fg-shrink-0 fg-text-[#818cf8]">${iconLink}</div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-text-[13px] fg-font-bold fg-text-[var(--text)] fg-mb-[1px] fg-truncate">Allow Affiliate & Tracking Links</div>
            <div class="fg-text-[10px] fg-text-[var(--muted)] fg-leading-tight fg-line-clamp-2">Allow affiliate & tracking domains common on deals websites, in emails or in search results.</div>
          </div>
          <button
            class="privacy-option-toggle ${
              settings.allowAffiliate ? 'active' : ''
            } fg-relative fg-shrink-0 fg-cursor-pointer"
            data-key="allowAffiliate"
            aria-checked="${settings.allowAffiliate}"
            role="switch"
            style="width: 32px; height: 18px; border-radius: 9px; border: none;
              background: ${
                settings.allowAffiliate
                  ? 'var(--green)'
                  : 'rgba(255,255,255,0.1)'
              };
              transition: background 0.2s; outline: none;"
          >
            <span style="position: absolute; top: 2px; left: ${
              settings.allowAffiliate ? '16px' : '2px'
            };
              width: 14px; height: 14px; border-radius: 50%;
              background: white; transition: left 0.2s;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}
