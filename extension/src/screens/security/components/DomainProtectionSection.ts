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
  icon: string;
}

const DOMAIN_TOGGLES: DomainToggle[] = [
  {
    key: 'dnsRebinding',
    label: 'DNS Rebinding Protection',
    description:
      'Prevents attackers from controlling your local network via DNS.',
    icon: '🔄',
  },
  {
    key: 'idnHomographs',
    label: 'IDN Homograph Attacks',
    description: 'Block look-alike domains using foreign characters.',
    icon: '🔤',
  },
  {
    key: 'typosquatting',
    label: 'Typosquatting Protection',
    description: 'Block domains designed to catch common URL typos.',
    icon: '⌨️',
  },
  {
    key: 'dga',
    label: 'Domain Generation Algorithms',
    description: 'Block algorithmically generated domains used by malware.',
    icon: '🧮',
  },
  {
    key: 'nrd',
    label: 'Newly Registered Domains',
    description:
      'Block domains registered in the last 30 days (often malicious).',
    icon: '🆕',
  },
  {
    key: 'ddns',
    label: 'Dynamic DNS',
    description: 'Block dynamic DNS hostnames used in attacks.',
    icon: '📡',
  },
  {
    key: 'parking',
    label: 'Parked Domains',
    description: 'Block inactive parked domains used for ads or tracking.',
    icon: '🅿️',
  },
];

export function renderDomainProtectionSection(
  settings: NextDNSSecuritySettings,
): string {
  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
        <span>🌐</span> Domain Protection
      </div>
      <div style="display: flex; flex-direction: column; gap: 0;">
        ${DOMAIN_TOGGLES.map((t, i) =>
          renderToggleRow(
            t,
            settings[t.key] as boolean,
            i < DOMAIN_TOGGLES.length - 1,
          ),
        ).join('')}
      </div>
    </div>
  `;
}

function renderToggleRow(
  toggle: DomainToggle,
  active: boolean,
  showDivider: boolean,
): string {
  return `
    <div class="security-toggle-row" data-key="${toggle.key}"
      style="display: flex; align-items: center; justify-content: space-between;
             padding: 14px 0; ${
               showDivider
                 ? 'border-bottom: 1px solid rgba(255,255,255,0.04);'
                 : ''
             }
             cursor: pointer; transition: opacity 0.15s ease;">
      <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
        <span style="font-size: 18px; margin-top: 1px; flex-shrink: 0;">${
          toggle.icon
        }</span>
        <div style="min-width: 0;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px;">
            ${escapeHtml(toggle.label)}
          </div>
          <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">
            ${escapeHtml(toggle.description)}
          </div>
        </div>
      </div>
      <div style="margin-left: 16px; flex-shrink: 0;">
        <button
          class="security-toggle-btn ${active ? 'active' : ''}"
          data-key="${toggle.key}"
          aria-checked="${active}"
          role="switch"
          style="
            width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
            background: ${active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'};
            position: relative; transition: background 0.2s ease; flex-shrink: 0; outline: none;
          "
        >
          <span style="
            position: absolute; top: 3px;
            left: ${active ? '23px' : '3px'};
            width: 18px; height: 18px; border-radius: 50%;
            background: white; transition: left 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          "></span>
        </button>
      </div>
    </div>
  `;
}
