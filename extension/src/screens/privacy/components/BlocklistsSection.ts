/**
 * BlocklistsSection
 * All known NextDNS blocklists with toggle + description.
 */

import type { NextDNSBlocklist } from '@focusgate/types';

interface BlocklistMeta {
  id: string;
  name: string;
  description: string;
  size: string;
  recommended?: boolean;
}

// Known NextDNS blocklists
export const KNOWN_BLOCKLISTS: BlocklistMeta[] = [
  {
    id: 'nextdns-recommended',
    name: 'NextDNS Ads & Trackers',
    description:
      'Curated by NextDNS. Best balance of coverage and compatibility.',
    size: '~200K domains',
    recommended: true,
  },
  {
    id: 'oisd',
    name: 'OISD',
    description: 'Balanced blocklist. Minimal false positives.',
    size: '~280K domains',
    recommended: true,
  },
  {
    id: 'easylist',
    name: 'EasyList',
    description: 'The classic ad-blocking list used by uBlock and AdBlock.',
    size: '~120K domains',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    description: 'Tracking protection companion to EasyList.',
    size: '~50K domains',
  },
  {
    id: 'adguard',
    name: 'AdGuard Simplified',
    description: 'DNS-compatible version of AdGuard filters.',
    size: '~60K domains',
  },
  {
    id: 'adguard-mobile',
    name: 'AdGuard Mobile Ads',
    description: 'Filters specifically targeting mobile app ads.',
    size: '~25K domains',
  },
  {
    id: 'notracking',
    name: 'No-Tracking',
    description: 'Focused on preventing tracking and surveillance.',
    size: '~80K domains',
  },
  {
    id: 'abpvn',
    name: 'ABPVN',
    description: 'Vietnamese language adblock list.',
    size: '~15K domains',
  },
  {
    id: 'steven-black',
    name: 'Steven Black',
    description: 'Amalgamation of multiple reputable hosts files.',
    size: '~60K domains',
  },
  {
    id: 'hostsfile',
    name: 'The Hosts File',
    description: 'Classic hosts-file-based ad and malware blocking.',
    size: '~40K domains',
  },
];

export function renderBlocklistsSection(
  activeBlocklists: NextDNSBlocklist[],
): string {
  const activeIds = new Set(activeBlocklists.map((b) => b.id));

  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top: 0; display:flex;
        align-items:center; gap:8px;">
        <span>🚫</span> Ad & Tracker Blocklists
        <span style="margin-left:auto; font-size:11px; font-weight:700;
          color:var(--muted); background:rgba(255,255,255,0.05);
          padding:2px 8px; border-radius:10px;">
          ${activeIds.size} ACTIVE
        </span>
      </div>

      <div style="font-size:12px; color:var(--muted); margin-bottom:16px;
        line-height:1.4;">
        Blocklists filter ads and trackers at the DNS level across all
        devices on your profile.
      </div>

      <div style="display:flex; flex-direction:column; gap:0;">
        ${KNOWN_BLOCKLISTS.map((list, i) => {
          const active = activeIds.has(list.id);
          const showDivider = i < KNOWN_BLOCKLISTS.length - 1;
          return `
            <div style="display:flex; align-items:center;
              justify-content:space-between; padding:14px 0;
              ${
                showDivider
                  ? 'border-bottom:1px solid rgba(255,255,255,0.04);'
                  : ''
              }">
              <div style="flex:1; min-width:0; margin-right:16px;">
                <div style="display:flex; align-items:center; gap:6px;
                  margin-bottom:2px;">
                  <span style="font-size:13px; font-weight:700;
                    color:var(--text);">${list.name}</span>
                  ${
                    list.recommended
                      ? `<span style="font-size:9px; padding:1px 6px;
                        border-radius:10px; background:rgba(0,196,140,0.1);
                        color:var(--green); border:1px solid rgba(0,196,140,0.2);
                        font-weight:800;">RECOMMENDED</span>`
                      : ''
                  }
                </div>
                <div style="font-size:11px; color:var(--muted);
                  line-height:1.3; margin-bottom:4px;">
                  ${list.description}
                </div>
                <div style="font-size:10px; color:rgba(255,255,255,0.25);
                  font-weight:700;">
                  ${list.size}
                </div>
              </div>
              <button
                class="blocklist-toggle-btn ${active ? 'active' : ''}"
                data-id="${list.id}"
                data-active="${active}"
                aria-checked="${active}"
                role="switch"
                style="width:44px; height:24px; border-radius:12px;
                  border:none; cursor:pointer; flex-shrink:0;
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
