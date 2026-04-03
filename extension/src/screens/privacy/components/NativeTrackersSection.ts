/**
 * NativeTrackersSection
 * Per-vendor native tracking toggles.
 */

import type { NextDNSNativeTracking } from '@focusgate/types';

interface VendorMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const KNOWN_NATIVE_TRACKERS: VendorMeta[] = [
  {
    id: 'apple',
    name: 'Apple',
    description: 'Block Apple telemetry, analytics and tracking.',
    icon: '🍎',
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Block Google analytics, Firebase and ad tracking.',
    icon: '🔵',
  },
  {
    id: 'samsung',
    name: 'Samsung',
    description: 'Block Samsung device telemetry and analytics.',
    icon: '📱',
  },
  {
    id: 'huawei',
    name: 'Huawei',
    description: 'Block Huawei telemetry and tracking services.',
    icon: '📡',
  },
  {
    id: 'windows',
    name: 'Windows',
    description: 'Block Microsoft/Windows telemetry and diagnostics.',
    icon: '🪟',
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    description: 'Block Xiaomi MIUI analytics and tracking.',
    icon: '📲',
  },
  {
    id: 'alexa',
    name: 'Amazon Alexa',
    description: 'Block Amazon Alexa device tracking.',
    icon: '🔊',
  },
  {
    id: 'roku',
    name: 'Roku',
    description: 'Block Roku TV analytics and ad targeting.',
    icon: '📺',
  },
];

export function renderNativeTrackersSection(
  activeTrackers: NextDNSNativeTracking[],
): string {
  const activeIds = new Set(activeTrackers.map((t) => t.id));

  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top:0; display:flex;
        align-items:center; gap:8px;">
        <span>📡</span> Native Tracking Protection
        <span style="margin-left:auto; font-size:11px; font-weight:700;
          color:var(--muted); background:rgba(255,255,255,0.05);
          padding:2px 8px; border-radius:10px;">
          ${activeIds.size} ACTIVE
        </span>
      </div>

      <div style="font-size:12px; color:var(--muted); margin-bottom:16px;
        line-height:1.4;">
        Block tracking built into devices and operating systems.
        These phones home even without any apps running.
      </div>

      <div style="display:flex; flex-direction:column; gap:0;">
        ${KNOWN_NATIVE_TRACKERS.map((vendor, i) => {
          const active = activeIds.has(vendor.id);
          const showDivider = i < KNOWN_NATIVE_TRACKERS.length - 1;
          return `
            <div style="display:flex; align-items:center;
              justify-content:space-between; padding:12px 0;
              ${
                showDivider
                  ? 'border-bottom:1px solid rgba(255,255,255,0.04);'
                  : ''
              }">
              <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <span style="font-size:20px; flex-shrink:0;">${
                  vendor.icon
                }</span>
                <div style="min-width:0;">
                  <div style="font-size:13px; font-weight:700;
                    color:var(--text); margin-bottom:2px;">
                    ${vendor.name}
                  </div>
                  <div style="font-size:11px; color:var(--muted); line-height:1.3;">
                    ${vendor.description}
                  </div>
                </div>
              </div>
              <button
                class="native-toggle-btn ${active ? 'active' : ''}"
                data-id="${vendor.id}"
                data-active="${active}"
                aria-checked="${active}"
                role="switch"
                style="width:44px; height:24px; border-radius:12px;
                  border:none; cursor:pointer; flex-shrink:0; margin-left:16px;
                  background:${
                    active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'
                  };
                  position:relative; transition:background 0.2s; outline:none;"
              >
                <span style="position:absolute; top:3px;
                  left:${active ? '23px' : '3px'};
                  width:18px; height:18px; border-radius:50%;
                  background:white; transition:left 0.2s;
                  box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
