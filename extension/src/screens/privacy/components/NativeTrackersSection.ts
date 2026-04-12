/**
 * NativeTrackersSection
 * Per-vendor native tracking toggles — 3-column grid with real brand icons.
 */

import type { NextDNSNativeTracking } from '@stopaccess/types';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
} from '../../../lib/ui';

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

const iconWifi =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';

export function renderNativeTrackersSection(
  activeTrackers: NextDNSNativeTracking[],
): string {
  const activeIds = new Set(activeTrackers.map((t) => t.id));

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      ${renderSectionTitleRow(
        iconWifi,
        'var(--accent)',
        'Native Tracking Protection',
        renderSectionBadge(`${activeIds.size} ACTIVE`),
      )}

      <div class="fg-text-[11px] fg-text-[var(--muted)] fg-mb-5 fg-leading-[1.5]">
        Block tracking built into devices and operating systems —
        even without any apps running.
      </div>

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${KNOWN_NATIVE_TRACKERS.map((vendor) => {
          const active = activeIds.has(vendor.id);
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${vendor.domain}&sz=64`;

          return `
            <div
              class="security-toggle-row native-toggle-card fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150"
              data-id="${vendor.id}"
              style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"
              onmouseenter="this.style.transform='translateY(-2px)'; this.style.opacity='0.8'"
              onmouseleave="this.style.transform=''; this.style.opacity='1'"
            >
              <!-- Icon on the left (No box) -->
              <div class="fg-shrink-0 fg-flex fg-items-center fg-justify-center" style="width: 40px; height: 40px;">
                <img
                  src="${faviconUrl}"
                  alt="${vendor.name}"
                  style="width: 32px; height: 32px; object-fit: contain;"
                  onerror="this.style.display='none'"
                >
              </div>

              <!-- Content in the middle -->
              <div class="fg-flex-1 fg-min-w-0">
                <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
                  <div class="fg-text-[13px] fg-font-bold fg-leading-tight fg-text-[var(--text)]">
                    ${vendor.name}
                  </div>
                  ${
                    active
                      ? '<span class="fg-shrink-0" style="width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;"></span>'
                      : ''
                  }
                </div>
                <div class="fg-text-[10px] fg-text-[var(--muted)] fg-leading-snug fg-line-clamp-1">
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
