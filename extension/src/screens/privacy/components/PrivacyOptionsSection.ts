/**
 * PrivacyOptionsSection
 * Disguised trackers + allow affiliate toggles.
 */

import type { NextDNSPrivacySettings } from '@focusgate/types';

export function renderPrivacyOptionsSection(
  settings: NextDNSPrivacySettings,
): string {
  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top:0; display:flex;
        align-items:center; gap:8px;">
        <span>⚙️</span> Privacy Options
      </div>

      <div style="display:flex; flex-direction:column; gap:0;">

        <!-- Disguised Trackers -->
        <div style="display:flex; align-items:center; justify-content:space-between;
          padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="flex:1; min-width:0; margin-right:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text);
              margin-bottom:2px;">
              Block Disguised Trackers
            </div>
            <div style="font-size:11px; color:var(--muted); line-height:1.4;">
              Block third-party trackers that disguise themselves as
              first-party (CNAME cloaking).
            </div>
            <div style="margin-top:6px; display:inline-block; font-size:9px;
              padding:2px 8px; border-radius:10px;
              background:rgba(0,196,140,0.1); color:var(--green);
              border:1px solid rgba(0,196,140,0.2); font-weight:800;">
              RECOMMENDED
            </div>
          </div>
          <button
            class="privacy-option-toggle ${
              settings.disguisedTrackers ? 'active' : ''
            }"
            data-key="disguisedTrackers"
            aria-checked="${settings.disguisedTrackers}"
            role="switch"
            style="width:44px; height:24px; border-radius:12px; border:none;
              cursor:pointer; flex-shrink:0;
              background:${
                settings.disguisedTrackers
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.1)'
              };
              position:relative; transition:background 0.2s; outline:none;"
          >
            <span style="position:absolute; top:3px;
              left:${settings.disguisedTrackers ? '23px' : '3px'};
              width:18px; height:18px; border-radius:50%;
              background:white; transition:left 0.2s;
              box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </button>
        </div>

        <!-- Allow Affiliate -->
        <div style="display:flex; align-items:center; justify-content:space-between;
          padding:14px 0;">
          <div style="flex:1; min-width:0; margin-right:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text);
              margin-bottom:2px;">
              Allow Affiliate Links
            </div>
            <div style="font-size:11px; color:var(--muted); line-height:1.4;">
              Allow affiliate tracking links to pass through. Disable to
              block all affiliate tracking.
            </div>
          </div>
          <button
            class="privacy-option-toggle ${
              settings.allowAffiliate ? 'active' : ''
            }"
            data-key="allowAffiliate"
            aria-checked="${settings.allowAffiliate}"
            role="switch"
            style="width:44px; height:24px; border-radius:12px; border:none;
              cursor:pointer; flex-shrink:0;
              background:${
                settings.allowAffiliate
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.1)'
              };
              position:relative; transition:background 0.2s; outline:none;"
          >
            <span style="position:absolute; top:3px;
              left:${settings.allowAffiliate ? '23px' : '3px'};
              width:18px; height:18px; border-radius:50%;
              background:white; transition:left 0.2s;
              box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </button>
        </div>

      </div>
    </div>
  `;
}
