/**
 * ContentProtectionSection
 * Renders: CSAM protection (and future content toggles)
 */

import type { NextDNSSecuritySettings } from '@focusgate/types';

export function renderContentProtectionSection(
  settings: NextDNSSecuritySettings,
): string {
  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
        <span>🔒</span> Content Protection
      </div>
      <div style="display: flex; flex-direction: column; gap: 0;">

        <div class="security-toggle-row" data-key="csam"
          style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; cursor: pointer;">
          <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
            <span style="font-size: 18px; margin-top: 1px; flex-shrink: 0;">🚫</span>
            <div style="min-width: 0;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px;">
                Block CSAM
              </div>
              <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">
                Block child sexual abuse material using industry databases.
              </div>
              <div style="margin-top: 6px; display: inline-block; font-size: 9px; padding: 2px 8px;
                border-radius: 10px; background: rgba(0,196,140,0.1); color: var(--green);
                border: 1px solid rgba(0,196,140,0.2); font-weight: 800; letter-spacing: 0.5px;">
                ALWAYS RECOMMENDED
              </div>
            </div>
          </div>
          <div style="margin-left: 16px; flex-shrink: 0;">
            <button
              class="security-toggle-btn ${settings.csam ? 'active' : ''}"
              data-key="csam"
              aria-checked="${settings.csam}"
              role="switch"
              style="
                width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
                background: ${
                  settings.csam ? 'var(--green)' : 'rgba(255,255,255,0.1)'
                };
                position: relative; transition: background 0.2s ease; flex-shrink: 0; outline: none;
              "
            >
              <span style="
                position: absolute; top: 3px;
                left: ${settings.csam ? '23px' : '3px'};
                width: 18px; height: 18px; border-radius: 50%;
                background: white; transition: left 0.2s ease;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              "></span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}
