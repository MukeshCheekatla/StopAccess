/**
 * BlocklistsSection & Library Modal
 * Management for NextDNS blocklists with centered discovery library.
 */

import { escapeHtml } from '@stopaccess/core';
import type { NextDNSBlocklist } from '@stopaccess/types';
import {
  renderSectionBadge,
  renderSectionTitleRow,
  UI_TOKENS,
} from '../../../lib/ui';

// Icons
const iconList =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
const iconSearch =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const iconDatabase =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>';
const iconRefresh =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
const iconClose =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

export function renderBlocklistsSection(
  activeBlocklists: NextDNSBlocklist[],
  available: any[] = [],
): string {
  const activeIds = new Set(activeBlocklists.map((b) => b.id));

  const RECOMMENDED_IDS = [
    'nextdns-recommended',
    'oisd',
    'easylist',
    'adguard',
    'hagezi-multi-pro',
    '1hosts-lite',
  ];

  const displayLists = available
    .filter(
      (list) => activeIds.has(list.id) || RECOMMENDED_IDS.includes(list.id),
    )
    .sort((a, b) => {
      const aActive = activeIds.has(a.id);
      const bActive = activeIds.has(b.id);
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      return (b.entries || 0) - (a.entries || 0);
    });

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      ${renderSectionTitleRow(
        iconList,
        '#818cf8',
        'Ad &amp; Tracker Blocklists',
        renderSectionBadge(`${activeIds.size} ACTIVE`),
      )}

      <div class="fg-flex fg-items-center fg-gap-3 fg-mb-6">
        <div class="fg-flex-1 fg-relative">
          <span class="fg-absolute fg-left-4 fg-top-1/2 fg--translate-y-1/2 fg-text-[var(--muted)]">
            ${iconSearch}
          </span>
          <input 
            type="text" 
            id="blocklist-search-main"
            placeholder="Search filtered lists..."
            class="fg-w-full fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-2xl fg-py-3 fg-pl-11 fg-pr-4 fg-text-sm fg-outline-none focus:fg-border-[var(--accent)] fg-transition-all"
            style="color: var(--fg-text);"
          >
        </div>
        <button id="open-blocklist-drawer" class="fg-px-5 fg-py-3 fg-rounded-2xl fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-transition-all hover:fg-opacity-80"
          style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text);">
          + Add Filter
        </button>
      </div>

      <div id="blocklists-grid-main" class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${displayLists
          .map((list) => renderBlocklistCard(list, activeIds.has(list.id)))
          .join('')}
      </div>
    </div>

    <!-- Centered Library Modal -->
    <div id="blocklist-drawer-overlay" class="fg-fixed fg-inset-0 fg-z-[1000] fg-transition-all fg-duration-300 fg-flex fg-items-center fg-justify-center" 
      style="display: none; background: rgba(0,0,0,0.4); backdrop-filter: blur(12px);">
      
      <div id="blocklist-drawer" class="fg-relative fg-w-[720px] fg-max-h-[85vh] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-shadow-[0_32px_64px_rgba(0,0,0,0.5)] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
        
        <!-- Header -->
        <div class="fg-p-8 fg-border-b fg-border-white/[0.05] fg-flex fg-items-center fg-justify-between">
          <div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; color: #818cf8; margin-bottom: 4px; letter-spacing: 3px;">Discovery</div>
            <div style="${
              UI_TOKENS.TEXT.HERO
            }; color: white; font-size: 1.5rem;">Blocklist Library</div>
          </div>
          <button id="close-blocklist-drawer" class="fg-p-3 fg-rounded-2xl hover:fg-bg-white/[0.05] fg-text-[var(--muted)] fg-transition-all">
            ${iconClose}
          </button>
        </div>

        <!-- Search -->
        <div class="fg-px-8 fg-pb-6 fg-pt-2">
          <div class="fg-relative">
            <span class="fg-absolute fg-left-5 fg-top-1/2 fg--translate-y-1/2 fg-text-[var(--muted)]">
              ${iconSearch}
            </span>
            <input 
              type="text" 
              id="blocklist-search-drawer"
              placeholder="Search ${
                available.length
              } blocklists by name, developer or domains..."
              class="fg-w-full fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[20px] fg-py-4 fg-pl-14 fg-pr-6 fg-text-[15px] fg-outline-none focus:fg-border-[var(--accent)] fg-transition-all"
              style="color: var(--fg-text);"
            >
          </div>
        </div>

        <!-- Scrollable List -->
        <div id="blocklist-drawer-list" class="fg-flex-1 fg-overflow-y-auto fg-px-8 fg-pb-8 fg-flex fg-flex-col fg-gap-3">
          ${available
            .sort((a, b) => (b.entries || 0) - (a.entries || 0))
            .map((list) => renderBlocklistRow(list, activeIds.has(list.id)))
            .join('')}
        </div>

        <!-- Footer -->
        <div class="fg-px-8 fg-py-5 fg-bg-[var(--fg-glass-bg)] fg-border-t fg-border-[var(--fg-glass-border)] fg-flex fg-justify-between fg-items-center">
          <div style="${UI_TOKENS.TEXT.LABEL}; opacity: 0.6;">
            Total Library Score: <span style="color: white;">${
              available.length
            } Lists</span>
          </div>
          <div style="${UI_TOKENS.TEXT.LABEL}; opacity: 0.6;">
            Sorted by Popularity
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Advanced Asset Selector with Hardcoded Quality Overrides
 * This guarantees icons for major blocklists.
 */
function getBestIconUrl(list: any): string | null {
  const { website, description, id, name } = list;
  const n = (name || '').toLowerCase();
  const i = (id || '').toLowerCase();

  // High-Resolution Research Overrides
  if (i === 'oisd' || n.includes('oisd')) {
    return 'https://oisd.nl/favicon.ico';
  }
  if (i === 'easylist' || n.includes('easylist') || i.includes('easyprivacy')) {
    return 'https://avatars.githubusercontent.com/u/1018861?s=64&v=4';
  }
  if (i.includes('adguard') || n.includes('adguard')) {
    return 'https://cdn.adguard.com/public/Adguard/logos/favicon.ico';
  }
  if (i === 'abpvn' || n.includes('abpvn')) {
    return 'https://abpvn.com/icon.png';
  }
  if (i.includes('hagezi') || n.includes('hagezi')) {
    return 'https://avatars.githubusercontent.com/u/74640102?s=64&v=4';
  }
  if (i.includes('1hosts') || n.includes('1hosts')) {
    return 'https://avatars.githubusercontent.com/u/61344401?s=64&v=4';
  }
  if (i.includes('lightswitch05') || n.includes('lightswitch05')) {
    return 'https://www.github.developerdan.com/img/GitHub-Mark-120px-plus.png';
  }
  if (
    i.includes('steven-black') ||
    n.includes('steven black') ||
    i.includes('stevenblack')
  ) {
    return 'https://avatars.githubusercontent.com/u/36511?s=64&v=4';
  }
  if (i === 'hblock' || n.includes('hblock')) {
    return 'https://icon.horse/icon/hblock.molinero.dev';
  }

  // Fallback to domain scraping
  let domain: string | null = null;
  if (website && typeof website === 'string') {
    try {
      const clean = website.trim().split(' ')[0];
      const url = clean.startsWith('http') ? clean : 'https://' + clean;
      domain = new URL(url).hostname;
    } catch {
      /* ignore */
    }
  }
  if (!domain && description) {
    const urlRegex =
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]{2,}\.[a-z]{2,})(?:\/|$)/i;
    const match = description.match(urlRegex);
    if (match) {
      domain = match[1];
    }
  }

  if (domain) {
    if (domain === 'github.com' || domain === 'gitlab.com') {
      return `https://unavatar.io/${domain}`;
    }
    return `https://icon.horse/icon/${domain}`;
  }

  return null;
}

function getUpdateDate(list: any): Date | null {
  const raw =
    list.updatedOn || list.lastUpdate || list.updated || list.last_update;
  if (!raw) {
    return null;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d;
  }
  const val = Number(raw);
  if (!isNaN(val) && val < 10000000000) {
    return new Date(val * 1000);
  }
  return null;
}

/**
 * Generates the layered icon HTML with failover logic (Secure Delegated Style).
 */
function getIconHtml(
  iconUrl: string | null,
  domainCandidate: string | null,
  sizePx: number = 24,
  imgSizePx: number = 20,
): string {
  if (!iconUrl) {
    return `<div class="fg-text-[var(--muted)]" style="width: ${sizePx}px; height: ${sizePx}px; display: flex; align-items: center; justify-content: center;">${iconDatabase}</div>`;
  }

  return `
    <div class="fg-relative fg-flex fg-items-center fg-justify-center" style="width: ${sizePx}px; height: ${sizePx}px;">
      <div class="placeholder-icon fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-text)]" style="opacity: 0.5; z-index: 1;">
        ${iconDatabase}
      </div>
      <img src="${iconUrl}" data-domain="${
    domainCandidate || ''
  }" data-type="blocklist" style="width: ${imgSizePx}px; height: ${imgSizePx}px; object-fit: contain; z-index: 2; border-radius: 20%; display: none;" crossorigin="anonymous">
    </div>
  `;
}

function renderBlocklistCard(list: any, active: boolean): string {
  const iconUrl = getBestIconUrl(list);
  const domain = extractDomainOnly(list);
  const entriesRaw = list.entries || 0;
  const entriesStr =
    entriesRaw >= 1000000
      ? (entriesRaw / 1000000).toFixed(1) + 'M'
      : entriesRaw >= 1000
      ? (entriesRaw / 1000).toFixed(1) + 'K'
      : entriesRaw.toLocaleString();
  const updatedDate = getUpdateDate(list);
  const updatedStr = updatedDate ? formatDateRelative(updatedDate) : 'Recently';

  const iconHtml = getIconHtml(iconUrl, domain, 24, 20);

  return `
    <div
      class="blocklist-card fg-flex fg-flex-col fg-p-4 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-200"
      data-id="${list.id}"
      data-active="${active}"
      style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); min-height: 110px;"
    >
      <div class="fg-flex fg-items-start fg-gap-3 fg-mb-3">
        <div class="fg-shrink-0 fg-mt-1">${iconHtml}</div>
        <div class="fg-flex-1 fg-min-w-0">
          <div class="fg-flex fg-items-center fg-gap-1.5 fg-mb-[1px]">
            <div style="${
              UI_TOKENS.TEXT.CARD_TITLE
            }; color: white;" class="fg-truncate">${escapeHtml(list.name)}</div>
          </div>
          <div style="${
            UI_TOKENS.TEXT.SUBTEXT
          }; border: none;" class="fg-line-clamp-2">${escapeHtml(
    list.description || 'Verified Filter',
  )}</div>
        </div>
        <button class="blocklist-toggle-btn ${
          active ? 'active' : ''
        }" data-id="${list.id}" data-active="${active}" 
          style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${
            active ? 'rgba(0,196,140,0.15)' : 'var(--fg-glass-bg)'
          }; border: 1px solid ${
    active ? 'rgba(0,196,140,0.4)' : 'var(--fg-glass-border)'
  }; color: ${active ? 'var(--green)' : 'var(--fg-muted)'};">
          ${
            active
              ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
              : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
          }
        </button>
      </div>
      <div class="fg-mt-auto fg-flex fg-items-center fg-gap-3 fg-pt-2 fg-border-t fg-border-[var(--fg-glass-border)]">
        <div class="fg-flex fg-items-center fg-gap-1">
          <span class="fg-text-[var(--fg-text)] fg-opacity-40">${iconDatabase}</span>
          <span class="fg-text-[11px] fg-font-black fg-text-white/90">${entriesStr}</span>
        </div>
        <div class="fg-flex fg-items-center fg-gap-1">
          <span class="fg-text-[var(--fg-text)] fg-opacity-40">${iconRefresh}</span>
          <span class="fg-text-[10px] fg-font-bold fg-text-white/70">${updatedStr}</span>
        </div>
      </div>
    </div>
  `;
}

function renderBlocklistRow(list: any, active: boolean): string {
  const iconUrl = getBestIconUrl(list);
  const domain = extractDomainOnly(list);
  const entriesRaw = list.entries || 0;
  const updatedDate = getUpdateDate(list);
  const updatedStr = updatedDate ? formatDateRelative(updatedDate) : 'Recently';

  const iconHtml = getIconHtml(iconUrl, domain, 32, 28);
  const websiteHtml = domain
    ? `<span class="fg-text-[#4f46e5] fg-mr-1.5">${domain}</span>`
    : '';

  return `
    <div class="blocklist-row fg-flex fg-items-center fg-gap-5 fg-p-6 fg-rounded-2xl hover:fg-bg-[var(--fg-glass-bg)] fg-transition-all fg-border fg-border-transparent hover:fg-border-[var(--fg-glass-border)]" 
      data-id="${list.id}" data-active="${active}" data-name="${escapeHtml(
    (list.name || '').toLowerCase(),
  )}" data-desc="${escapeHtml((list.description || '').toLowerCase())}">
      
      <div class="fg-shrink-0 fg-w-12 fg-h-12 fg-flex fg-items-center fg-justify-center">
        ${iconHtml}
      </div>

      <div class="fg-flex-1 fg-min-w-0">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-1.5">
          <div class="fg-flex fg-items-center fg-gap-3">
             <div class="fg-text-[17px] fg-font-black fg-text-white">${escapeHtml(
               list.name,
             )}</div>
             ${
               active
                 ? '<span class="fg-bg-[#4f46e5]/[0.15] fg-text-[#4f46e5] fg-text-[9px] fg-font-black fg-uppercase fg-tracking-widest fg-px-2 fg-py-0.5 fg-rounded-md">Active</span>'
                 : ''
             }
          </div>
          <button class="blocklist-toggle-btn ${
            active ? 'active' : ''
          }" data-id="${list.id}" data-active="${active}" 
            style="padding: 6px 16px; border-radius: 8px; font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; 
            background: ${
              active ? '#ef4444' : '#3b82f6'
            }; color: white; border: none; transition: all 0.2s;">
            ${active ? 'Remove' : 'Add'}
          </button>
        </div>

         <div style="${
           UI_TOKENS.TEXT.SUBTEXT
         }; border: none;" class="fg-text-sm fg-mb-2.5 fg-line-clamp-2 fg-leading-relaxed">${escapeHtml(
    list.description || '',
  )}</div>
        
        <div style="${
          UI_TOKENS.TEXT.LABEL
        }; text-transform: none; font-weight: 500; opacity: 0.7;">
          ${websiteHtml}
          ${domain ? '<span class="fg-opacity-40 fg-mx-1.5">•</span>' : ''}
          <span style="color: rgba(255,255,255,0.8);">${entriesRaw.toLocaleString()} entries</span>
          <span class="fg-opacity-40 fg-mx-1.5">•</span>
          <span style="color: rgba(255,255,255,0.8);">Updated ${updatedStr}</span>
        </div>
      </div>
    </div>
  `;
}

function extractDomainOnly(list: any): string | null {
  const { website, description } = list;
  if (website && typeof website === 'string') {
    try {
      const clean = website.trim().split(' ')[0];
      return new URL(clean.startsWith('http') ? clean : 'https://' + clean)
        .hostname;
    } catch {
      /* ignore */
    }
  }
  if (description) {
    const urlRegex =
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]{2,}\.[a-z]{2,})(?:\/|$)/i;
    const match = description.match(urlRegex);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function formatDateRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 365) {
    return Math.floor(diffDays / 365) + 'y ago';
  }
  if (diffDays > 30) {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return 'Just now';
}
