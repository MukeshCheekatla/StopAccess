/**
 * NativeTrackersSection
 * Per-vendor native tracking toggles — 3-column grid with real brand icons.
 */

import type { NextDNSNativeTracking } from '@stopaccess/types';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
  UI_TOKENS,
  UI_ICONS,
  renderBrandLogo,
} from '../../../ui/ui';
import { COLORS } from '../../../ui/theme/designTokens';

interface VendorMeta {
  id: string;
  name: string;
  description: string;
  domain: string; // for favicon lookup
}

export const KNOWN_NATIVE_TRACKERS: VendorMeta[] = [
  {
    id: 'apple',
    name: 'Apple',
    description: 'Block Apple telemetry & analytics.',
    domain: 'apple.com',
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Block Google analytics & Firebase.',
    domain: 'google.com',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    description: 'Block Samsung device telemetry.',
    domain: 'samsung.com',
  },
  {
    id: 'huawei',
    name: 'Huawei',
    description: 'Block Huawei tracking services.',
    domain: 'huawei.com',
  },
  {
    id: 'windows',
    name: 'Windows',
    description: 'Block Microsoft/Windows telemetry.',
    domain: 'microsoft.com',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    description: 'Block Xiaomi MIUI analytics.',
    domain: 'mi.com',
  },
  {
    id: 'alexa',
    name: 'Amazon Alexa',
    description: 'Block Alexa device tracking.',
    domain: 'amazon.com',
  },
  {
    id: 'roku',
    name: 'Roku',
    description: 'Block Roku TV ad targeting.',
    domain: 'roku.com',
  },
];

export function renderNativeTrackersSection(
  activeTrackers: NextDNSNativeTracking[],
): string {
  const activeIds = new Set(activeTrackers.map((t) => t.id));

  return `
    <div class="fg-p-2 fg-h-full">
      ${renderSectionTitleRow(
        UI_ICONS.WIFI,
        'var(--accent)',
        'Native Tracking Protection',
        renderSectionBadge(`${activeIds.size} Active`),
      )}

      <div style="${
        UI_TOKENS.TEXT.SUBTEXT
      }; margin-bottom: 20px; line-height: 1.5;">
        Block tracking built into devices and operating systems —
        even without any apps running.
      </div>

      <div class="fg-grid fg-grid-cols-2 fg-gap-2">
        ${KNOWN_NATIVE_TRACKERS.map((vendor) => {
          const active = activeIds.has(vendor.id);

          return `
            <div
              class="security-toggle-row native-toggle-card fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-opacity-80"
              data-id="${vendor.id}"
              style="background: ${COLORS.glassBg}; border: 1px solid ${
            COLORS.glassBorder
          };"
            >
              <!-- Icon on the left (No box) -->
              ${renderBrandLogo(vendor.domain, vendor.name, 40)}

               <div class="fg-flex-1 fg-min-w-0">
                 <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
                   <div style="${
                     UI_TOKENS.TEXT.CARD_TITLE
                   }" class="fg-truncate">
                     ${vendor.name}
                   </div>
                   ${
                     active
                       ? '<span class="fg-shrink-0" style="width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;"></span>'
                       : ''
                   }
                 </div>
                 <div style="${
                   UI_TOKENS.TEXT.SUBTEXT
                 }; opacity: 0.6; line-height: 1.3;" class="fg-line-clamp-1">
                   ${vendor.description}
                 </div>
               </div>

              <div class="fg-shrink-0">
                ${renderToggleSwitch(vendor.id, active, 'native-toggle-btn')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
