/**
 * DomainProtectionSection
 * Renders: DNS Rebinding, IDN Homographs, Typosquatting, DGA, NRD, DDNS, Parking
 */

import { escapeHtml } from '@focusgate/core';
import type { NextDNSSecuritySettings } from '@focusgate/types';

interface DomainToggle {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
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
    description:
      'Prevents attackers from controlling your local network via DNS.',
    icon: svgRefresh,
  },
  {
    key: 'idnHomographs',
    label: 'IDN Homograph Attacks',
    description: 'Block look-alike domains using foreign characters.',
    icon: svgType,
  },
  {
    key: 'typosquatting',
    label: 'Typosquatting Protection',
    description: 'Block domains designed to catch common URL typos.',
    icon: svgKeyboard,
  },
  {
    key: 'dga',
    label: 'Domain Generation Algorithms',
    description: 'Block algorithmically generated domains used by malware.',
    icon: svgSliders,
  },
  {
    key: 'nrd',
    label: 'Newly Registered Domains',
    description:
      'Block domains registered in the last 30 days (often malicious).',
    icon: svgClock,
  },
  {
    key: 'ddns',
    label: 'Dynamic DNS',
    description: 'Block dynamic DNS hostnames used in attacks.',
    icon: svgWifi,
  },
  {
    key: 'parking',
    label: 'Parked Domains',
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
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
        <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
          <span class="fg-text-[var(--accent)]">${svgGlobe}</span> Domain Protection
        </div>
        <span class="fg-text-[9px] fg-font-black fg-uppercase fg-tracking-[0.8px] fg-py-[3px] fg-px-[10px] fg-rounded-full" style="background: rgba(255,255,255,0.05); color: var(--muted); border: 1px solid rgba(255,255,255,0.07);">${activeCount}/${total} ACTIVE</span>
      </div>
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
      style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);"
      onmouseenter="this.style.transform='translateY(-2px)';this.style.background='rgba(255,255,255,0.05)'"
      onmouseleave="this.style.transform='';this.style.background='rgba(255,255,255,0.03)'"
    >
      <!-- Icon (Left) -->
      <div class="fg-relative fg-shrink-0">
        <span class="fg-text-[var(--accent)]">${toggle.icon}</span>
      </div>

      <!-- Content (Middle) -->
      <div class="fg-flex-1 fg-min-w-0">
        <div class="fg-text-[13px] fg-font-bold fg-mb-[2px] fg-leading-[1.3] fg-text-[var(--text)] fg-truncate">
          ${escapeHtml(toggle.label)}
        </div>
        <div class="fg-text-[10px] fg-text-[var(--muted)] fg-leading-[1.4] fg-line-clamp-2">
          ${escapeHtml(toggle.description)}
        </div>
      </div>

      <!-- Toggle (Right) -->
      <div class="fg-shrink-0">
        <button
          class="security-toggle-btn fg-relative fg-shrink-0 fg-cursor-pointer ${
            active ? 'active' : ''
          }"
          data-key="${toggle.key}"
          aria-checked="${active}"
          role="switch"
          style="width: 32px; height: 18px; border-radius: 9px; border: none;
            background: ${active ? 'var(--green)' : 'rgba(255,255,255,0.1)'};
            transition: background 0.2s ease; outline: none;"
        >
          <span style="position: absolute; top: 2px; left: ${
            active ? '16px' : '2px'
          };
            width: 14px; height: 14px; border-radius: 50%;
            background: white; transition: left 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
        </button>
      </div>
    </div>
  `;
}
