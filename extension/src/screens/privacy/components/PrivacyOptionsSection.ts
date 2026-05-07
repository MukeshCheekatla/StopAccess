/**
import { COLORS } from '@/ui/theme/designTokens';
 * PrivacyOptionsSection
 * Disguised trackers + allow affiliate toggles — no emojis.
 */

import type { NextDNSPrivacySettings } from '@stopaccess/types';
import { UI_TOKENS, renderPillToggle, renderSectionTitleRow } from '@/ui/ui';
import { COLORS } from '@/ui/theme/designTokens';
import { ICONS } from '@/ui/svgicons';

export function renderPrivacyOptionsSection(
  settings: NextDNSPrivacySettings,
): string {
  return `
    <div class="fg-p-2 fg-h-full">
      ${renderSectionTitleRow(
        ICONS.SETTINGS,
        'var(--fg-primary-blue)',
        'Privacy Settings',
      )}

      <div style="${
        UI_TOKENS.TEXT.SUBTEXT
      }; margin-bottom: 20px; line-height: 1.5;">
        Configure advanced protection features to neutralize hidden trackers and preserve your identity.
      </div>

      <div class="fg-grid fg-grid-cols-1 fg-gap-3">
        <!-- Disguised Trackers -->
        <div 
          class="privacy-option-card fg-flex fg-items-center fg-gap-4 fg-p-6 fg-rounded-3xl fg-transition-all fg-cursor-pointer"
          data-key="disguisedTrackers"
          style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  };"
        >
          <div class="fg-shrink-0 fg-w-10 fg-h-10 fg-rounded-2xl fg-bg-[${
            COLORS.indigoSoft
          }] fg-flex fg-items-center fg-justify-center fg-text-[${
    COLORS.indigo
  }]">
            ${ICONS.EYE_OFF}
          </div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-flex fg-items-center fg-gap-2 fg-mb-1">
              <span class="fg-truncate" style="${
                UI_TOKENS.TEXT.CARD_TITLE
              }">Block Disguised Trackers</span>
              <span class="fg-tooltip" data-tooltip="Automatically detect and block third-party trackers disguising themselves as first-party to circumvent recent browser's privacy protections like ITP.">
                <span class="fg-text-[${COLORS.text}] fg-opacity-40">${
    ICONS.INFO
  }</span>
              </span>
            </div>
            <div style="${
              UI_TOKENS.TEXT.SUBTEXT
            } line-height: 1.5;">Detect and block third-party trackers disguising themselves as first-party.</div>
          </div>
          ${renderPillToggle('disguisedTrackers', settings.disguisedTrackers)}
        </div>

        <!-- Allow Affiliate -->
        <div 
          class="privacy-option-card fg-flex fg-items-center fg-gap-4 fg-p-6 fg-rounded-3xl fg-transition-all fg-cursor-pointer"
          data-key="allowAffiliate"
          style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  };"
        >
          <div class="fg-shrink-0 fg-w-10 fg-h-10 fg-rounded-2xl fg-bg-sky-400/10 fg-flex fg-items-center fg-justify-center fg-text-sky-400">
            ${ICONS.LINK}
          </div>
          <div class="fg-flex-1 fg-min-w-0">
             <div class="fg-flex fg-items-center fg-gap-2 fg-mb-1">
              <span class="fg-truncate" style="${
                UI_TOKENS.TEXT.CARD_TITLE
              }">Allow Affiliate Links</span>
               <span class="fg-tooltip" data-tooltip="Allow affiliate & tracking domains common on deals websites, in emails or in search results. Those usually only get called after manually clicking on a link. Your IP address will automatically be hidden from those websites to preserve your privacy.">
                <span class="fg-text-[${COLORS.text}] fg-opacity-40">${
    ICONS.INFO
  }</span>
              </span>
            </div>
            <div style="${
              UI_TOKENS.TEXT.SUBTEXT
            } line-height: 1.5;">Allow affiliate and tracking domains commonly used for deals or search results.</div>
          </div>
          ${renderPillToggle('allowAffiliate', settings.allowAffiliate)}
        </div>
      </div>
    </div>
  `;
}
