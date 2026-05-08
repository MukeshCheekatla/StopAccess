import { COLORS } from '@/ui/theme/designTokens';
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
  UI_ICONS,
  renderBrandLogo,
} from '@/ui/ui';

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
    <div class="fg-p-2 fg-mb-4">
      ${renderSectionTitleRow(
        UI_ICONS.LIST,
        COLORS.indigo,
        'Ad &amp; Tracker Blocklists',
        renderSectionBadge(`${activeIds.size} Active`),
      )}

      <div class="fg-flex fg-items-center fg-gap-3 fg-mb-6">
        <div class="fg-flex-1 fg-relative">
          <span class="fg-absolute fg-left-4 fg-top-1/2 fg--translate-y-1/2 fg-text-[var(--muted)]">
            ${UI_ICONS.SEARCH}
          </span>
          <input 
            type="text" 
            id="blocklist-search-main"
            placeholder="Search filtered lists..."
            class="fg-w-full fg-bg-[${COLORS.glassBg}] fg-border fg-border-[${
    COLORS.glassBorder
  }] fg-rounded-2xl fg-py-3 fg-pl-11 fg-pr-4 fg-text-sm fg-outline-none focus:fg-border-[var(--accent)] fg-transition-all"
            style="color: ${COLORS.text};"
          >
        </div>
        <button id="open-blocklist-drawer" class="fg-px-5 fg-py-3 fg-rounded-2xl fg-text-[11px] fg-font-black  fg-tracking-widest fg-transition-all hover:fg-opacity-80"
          style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  }; color: ${COLORS.text};">
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
      style="display: none; background: ${
        COLORS.overlay
      }; backdrop-filter: blur(12px);">
      
      <div id="blocklist-drawer" class="fg-relative fg-w-[720px] fg-max-h-[85vh] fg-bg-[${
        COLORS.surface
      }] fg-border fg-border-[${
    COLORS.glassBorder
  }] fg-rounded-[32px] fg-shadow-[0_32px_64px_var(--fg-shadow-strong)] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
        
        <!-- Header -->
        <div class="fg-p-8 fg-border-b fg-border-[var(--fg-white-wash)] fg-flex fg-items-center fg-justify-between">
          <div>
            <div style="${UI_TOKENS.TEXT.LABEL}; color: ${
    COLORS.indigo
  }; margin-bottom: 4px; letter-spacing: 3px;">Discovery</div>
            <div style="${UI_TOKENS.TEXT.HERO}; color: ${
    COLORS.text
  }; font-size: 1.5rem;">Blocklist Library</div>
          </div>
          <button id="close-blocklist-drawer" class="fg-p-3 fg-rounded-2xl hover:fg-bg-[var(--fg-white-wash)] fg-text-[var(--muted)] fg-transition-all">
            ${UI_ICONS.CLOSE}
          </button>
        </div>

        <!-- Search -->
        <div class="fg-px-8 fg-pb-6 fg-pt-2">
          <div class="fg-relative">
            <span class="fg-absolute fg-left-5 fg-top-1/2 fg--translate-y-1/2 fg-text-[var(--muted)]">
              ${UI_ICONS.SEARCH}
            </span>
            <input 
              type="text" 
              id="blocklist-search-drawer"
              placeholder="Search ${
                available.length
              } blocklists by name, developer or domains..."
              class="fg-w-full fg-bg-[${COLORS.glassBg}] fg-border fg-border-[${
    COLORS.glassBorder
  }] fg-rounded-[20px] fg-py-4 fg-pl-14 fg-pr-6 fg-text-[15px] fg-outline-none focus:fg-border-[var(--accent)] fg-transition-all"
              style="color: ${COLORS.text};"
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
        <div class="fg-px-8 fg-py-5 fg-bg-[${
          COLORS.glassBg
        }] fg-border-t fg-border-[${
    COLORS.glassBorder
  }] fg-flex fg-justify-between fg-items-center">
          <div style="${UI_TOKENS.TEXT.LABEL}; opacity: 0.6;">
            Total Library Score: <span style="color: ${COLORS.text};">${
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

  // Professional Logo Overrides (Avoid developer avatars as they can be confusing for 'all' blocks)
  if (i === 'oisd' || n.includes('oisd')) {
    return 'https://oisd.nl/favicon.ico';
  }
  if (i.includes('adguard') || n.includes('adguard')) {
    return 'https://cdn.adguard.com/public/Adguard/logos/favicon.ico';
  }
  if (i === 'abpvn' || n.includes('abpvn')) {
    return 'https://abpvn.com/icon.png';
  }
  if (i.includes('hagezi') || n.includes('hagezi')) {
    // Hagezi's distinctive logo if available, or just fallback
    return 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/logo.png';
  }
  if (i === 'nextdns-recommended' || n.includes('nextdns recommended')) {
    return 'https://nextdns.io/static/favicon/favicon-32x32.png';
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
): string {
  return renderBrandLogo(
    domainCandidate || 'unknown',
    undefined,
    sizePx,
    iconUrl || undefined,
    UI_ICONS.DATABASE,
  );
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

  const iconHtml = getIconHtml(iconUrl, domain, 24);

  return `
    <div
      class="blocklist-card fg-flex fg-flex-col fg-p-4 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-200"
      data-id="${list.id}"
      data-active="${active}"
      data-name="${escapeHtml((list.name || '').toLowerCase())}"
      data-desc="${escapeHtml((list.description || '').toLowerCase())}"
      style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  }; min-height: 110px;"
    >
      <div class="fg-flex fg-items-start fg-gap-3 fg-mb-3">
        <div class="fg-shrink-0 fg-mt-1">${iconHtml}</div>
        <div class="fg-flex-1 fg-min-w-0">
          <div class="fg-flex fg-items-center fg-gap-1.5 fg-mb-[1px]">
            <div style="${UI_TOKENS.TEXT.CARD_TITLE}; color: ${
    COLORS.text
  };" class="fg-truncate">${escapeHtml(list.name)}</div>
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
            active ? 'var(--fg-emerald-strong)' : COLORS.glassBg
          }; border: 1px solid ${
    active ? 'var(--fg-emerald-border-strong)' : COLORS.glassBorder
  }; color: ${active ? 'var(--green)' : COLORS.muted};">
          ${active ? UI_ICONS.CHECK : UI_ICONS.PLUS}
        </button>
      </div>
      <div class="fg-mt-auto fg-flex fg-items-center fg-gap-3 fg-pt-2 fg-border-t fg-border-[${
        COLORS.glassBorder
      }]">
        <div class="fg-flex fg-items-center fg-gap-1">
          <span class="fg-text-[${COLORS.text}] fg-opacity-40">${
    UI_ICONS.DATABASE
  }</span>
          <span class="fg-text-[11px] fg-font-black fg-text-[${
            COLORS.text
          }] fg-opacity-90">${entriesStr}</span>
        </div>
        <div class="fg-flex fg-items-center fg-gap-1">
          <span class="fg-text-[${COLORS.text}] fg-opacity-40">${
    UI_ICONS.REFRESH
  }</span>
          <span class="fg-text-[10px] fg-font-bold fg-text-[${
            COLORS.text
          }] fg-opacity-70">${updatedStr}</span>
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

  const iconHtml = getIconHtml(iconUrl, domain, 32);
  const websiteHtml = domain
    ? `<span class="fg-text-[var(--fg-primary-blue)] fg-mr-1.5">${domain}</span>`
    : '';

  return `
    <div class="blocklist-row fg-flex fg-items-center fg-gap-5 fg-p-6 fg-rounded-2xl hover:fg-bg-[${
      COLORS.glassBg
    }] fg-transition-all fg-border fg-border-transparent hover:fg-border-[${
    COLORS.glassBorder
  }]" 
      data-id="${list.id}" data-active="${active}" data-name="${escapeHtml(
    (list.name || '').toLowerCase(),
  )}" data-desc="${escapeHtml((list.description || '').toLowerCase())}">
      
      <div class="fg-shrink-0 fg-w-12 fg-h-12 fg-flex fg-items-center fg-justify-center">
        ${iconHtml}
      </div>

      <div class="fg-flex-1 fg-min-w-0">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-1.5">
          <div class="fg-flex fg-items-center fg-gap-3">
             <div class="fg-text-[17px] fg-font-black fg-text-[${
               COLORS.text
             }]">${escapeHtml(list.name)}</div>
             ${
               active
                 ? '<span class="fg-bg-[' +
                   COLORS.indigoSoft +
                   '] fg-text-[var(--fg-primary-blue)] fg-text-[9px] fg-font-black  fg-tracking-widest fg-px-2 fg-py-0.5 fg-rounded-md">Active</span>'
                 : ''
             }
          </div>
          <button class="blocklist-toggle-btn ${
            active ? 'active' : ''
          }" data-id="${list.id}" data-active="${active}" 
            style="padding: 6px 16px; border-radius: 8px; ${
              UI_TOKENS.TEXT.BADGE
            }
            background: ${active ? COLORS.red : COLORS.blue}; color: ${
    COLORS.onAccent
  }; border: none; transition: all 0.2s;">
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
          <span style="color: ${
            COLORS.text
          }; opacity: 0.8;">${entriesRaw.toLocaleString()} entries</span>
          <span class="fg-opacity-40 fg-mx-1.5">•</span>
          <span style="color: ${
            COLORS.text
          }; opacity: 0.8;">Updated ${updatedStr}</span>
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
