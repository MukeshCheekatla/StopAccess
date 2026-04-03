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

export function renderTldManager(tlds: NextDNSTld[]): string {
  const activeIds = new Set(tlds.map((t) => t.id.toLowerCase()));
  const suggestions = COMMON_RISKY_TLDS.filter((t) => !activeIds.has(t.id));

  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
        <span>🌍</span> Blocked TLDs
        <span style="margin-left: auto; font-size: 11px; font-weight: 700;
          color: var(--muted); background: rgba(255,255,255,0.05);
          padding: 2px 8px; border-radius: 10px; letter-spacing: 0.5px;">
          ${tlds.length} BLOCKED
        </span>
      </div>

      <div style="font-size: 12px; color: var(--muted); margin-bottom: 16px; line-height: 1.4;">
        Block all domains under specific top-level domains.
        Use with caution — this affects ALL sites under that TLD.
      </div>

      <!-- Add TLD input -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <input
          type="text"
          id="tld_input"
          placeholder="e.g. ru, cn, xyz"
          class="input"
          style="flex: 1; text-transform: lowercase;"
          maxlength="20"
        >
        <button class="btn" id="btn_add_tld" style="padding: 0 16px; white-space: nowrap;">
          Block TLD
        </button>
      </div>

      <!-- Quick-add suggestions -->
      ${
        suggestions.length > 0
          ? `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 10px; font-weight: 800; color: var(--muted);
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Common Risky TLDs
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${suggestions
              .slice(0, 8)
              .map(
                (t) => `
              <button
                class="btn btn-outline tld-quick-add"
                data-id="${t.id}"
                style="padding: 4px 10px; font-size: 11px; border-radius: 20px;
                  border-color: rgba(255,255,255,0.08); color: var(--text);"
              >
                + ${t.label}
              </button>
            `,
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <!-- Active TLD list -->
      ${
        tlds.length > 0
          ? `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${tlds
            .map(
              (tld) => `
            <div style="display: flex; align-items: center; justify-content: space-between;
              padding: 10px 12px; background: rgba(255,71,87,0.05);
              border: 1px solid rgba(255,71,87,0.15); border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px;">🌍</span>
                <span style="font-size: 13px; font-weight: 700; color: var(--text);">
                  .${tld.id}
                </span>
                <span style="font-size: 9px; padding: 2px 6px; border-radius: 4px;
                  background: rgba(255,71,87,0.1); color: var(--red); font-weight: 800;">
                  BLOCKED
                </span>
              </div>
              <button
                class="btn-outline tld-remove"
                data-id="${tld.id}"
                style="padding: 4px 10px; font-size: 11px;
                  border-color: rgba(255,71,87,0.2); color: var(--red);"
              >
                Remove
              </button>
            </div>
          `,
            )
            .join('')}
        </div>
      `
          : `
        <div style="text-align: center; padding: 24px; color: var(--muted); font-size: 12px;
          border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🌍</div>
          No TLDs blocked. Use the quick-add suggestions above.
        </div>
      `
      }
    </div>
  `;
}
