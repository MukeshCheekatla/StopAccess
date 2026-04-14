/**
 * DomainProtectionSection
 * Renders: DNS Rebinding, IDN Homographs, Typosquatting, DGA, NRD, DDNS, Parking
 */

import { escapeHtml } from '@stopaccess/core';
import type { NextDNSSecuritySettings } from '@stopaccess/types';
import {
  renderToggleSwitch,
  renderSectionBadge,
  renderSectionTitleRow,
  renderInfoTooltip,
  UI_TOKENS,
} from '../../../lib/ui';

interface DomainToggle {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
  tooltip: string; // Glossary text
  description: string;
  icon: string; // inline SVG string
}

// Inline SVG icons — no emojis
const svgRefresh =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
const svgType =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>';
const svgKeyboard =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/><line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/><line x1="6" y1="14" x2="6.01" y2="14"/><line x1="18" y1="14" x2="18.01" y2="14"/><line x1="10" y1="14" x2="14" y2="14"/></svg>';
const svgSliders =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
const svgClock =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const svgWifi =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
const svgPause =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
const svgGlobe =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

const DOMAIN_TOGGLES: DomainToggle[] = [
  {
    key: 'dnsRebinding',
    label: 'DNS Rebinding Protection',
    tooltip:
      'Prevents malicious websites from using your browser to attack local network devices, IoT gadgets, and home routers.',
    description:
      'Prevents attackers from controlling your local network via DNS.',
    icon: svgRefresh,
  },
  {
    key: 'idnHomographs',
    label: 'IDN Homograph Attacks',
    tooltip:
      "Blocks 'look-alike' domains that use similar characters from different alphabets to impersonate legitimate sites (phishing).",
    description: 'Block look-alike domains using foreign characters.',
    icon: svgType,
  },
  {
    key: 'typosquatting',
    label: 'Typosquatting Protection',
    tooltip:
      'Detects and blocks common misspellings of popular websites designed to trick you into visiting malicious clones.',
    description: 'Block domains designed to catch common URL typos.',
    icon: svgKeyboard,
  },
  {
    key: 'dga',
    label: 'Domain Generation Algorithms',
    tooltip:
      'Blocks algorithmically generated domains used by malware to communicate with command-and-control servers.',
    description: 'Block algorithmically generated domains used by malware.',
    icon: svgSliders,
  },
  {
    key: 'nrd',
    label: 'Newly Registered Domains',
    tooltip:
      'Protects against newly registered domains (less than 30 days old), which are frequently used for short-lived malicious campaigns.',
    description:
      'Block domains registered in the last 30 days (often malicious).',
    icon: svgClock,
  },
  {
    key: 'ddns',
    label: 'Dynamic DNS',
    tooltip:
      'Blocks hostnames from dynamic DNS providers, which are often utilized to host malicious content or malware payloads.',
    description: 'Block dynamic DNS hostnames used in attacks.',
    icon: svgWifi,
  },
  {
    key: 'parking',
    label: 'Parked Domains',
    tooltip:
      'Blocks domains that are inactive or show ads, preventing potential tracking and reducing general network clutter.',
    description: 'Block inactive parked domains used for ads or tracking.',
    icon: svgPause,
  },
];

export function renderDomainProtectionSection(
  settings: NextDNSSecuritySettings,
): string {
  const activeCount = DOMAIN_TOGGLES.filter(
    (t) => settings[t.key] as boolean,
  ).length;
  const total = DOMAIN_TOGGLES.length;

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      ${renderSectionTitleRow(
        svgGlobe,
        'var(--accent)',
        'Domain Protection',
        renderSectionBadge(`${activeCount}/${total} Active`),
      )}
      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${DOMAIN_TOGGLES.map((t) =>
          renderToggleRow(t, settings[t.key] as boolean),
        ).join('')}
      </div>
    </div>
  `;
}

function renderToggleRow(toggle: DomainToggle, active: boolean): string {
  return `
    <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150"
      data-key="${toggle.key}"
      style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"
      onmouseenter="this.style.transform='translateY(-2px)';this.style.opacity='0.8'"
      onmouseleave="this.style.transform='';this.style.opacity='1'"
    >
      <!-- Icon (Left) -->
      <div class="fg-relative fg-shrink-0">
        <span class="fg-text-[var(--accent)]">${toggle.icon}</span>
      </div>

      <!-- Content (Middle) -->
      <div class="fg-flex-1 fg-min-w-0">
        <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
          <div style="${UI_TOKENS.TEXT.CARD_TITLE}" class="fg-truncate">
            ${escapeHtml(toggle.label)}
          </div>
          ${renderInfoTooltip(toggle.tooltip ?? '')}
        </div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        }; opacity: 0.6; line-height: 1.4;" class="fg-line-clamp-2">
          ${escapeHtml(toggle.description)}
        </div>
      </div>

      <!-- Toggle (Right) -->
      <div class="fg-shrink-0">
        ${renderToggleSwitch(toggle.key, active)}
      </div>
    </div>
  `;
}
