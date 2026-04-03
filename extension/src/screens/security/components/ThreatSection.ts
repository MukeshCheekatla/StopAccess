/**
 * ThreatSection
 * Renders: Threat Intelligence, AI Detection, Google Safe Browsing, Cryptojacking
 */

import { escapeHtml } from '@focusgate/core';
import type { NextDNSSecuritySettings } from '@focusgate/types';

interface ThreatToggle {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
  description: string;
  icon: string;
}

const THREAT_TOGGLES: ThreatToggle[] = [
  {
    key: 'threatIntelligenceFeeds',
    label: 'Threat Intelligence Feeds',
    description: 'Block domains from known threat intelligence databases.',
    icon: '🛡️',
  },
  {
    key: 'aiThreatDetection',
    label: 'AI Threat Detection',
    description: 'Machine learning powered detection of malicious domains.',
    icon: '🤖',
  },
  {
    key: 'googleSafeBrowsing',
    label: 'Google Safe Browsing',
    description: 'Protect against phishing and malware sites via Google.',
    icon: '🔍',
  },
  {
    key: 'cryptojacking',
    label: 'Cryptojacking Protection',
    description: 'Block sites that mine cryptocurrency using your device.',
    icon: '⛏️',
  },
];

export function renderThreatSection(settings: NextDNSSecuritySettings): string {
  return `
    <div class="app-card" style="margin-bottom: 16px;">
      <div class="section-title" style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
        <span>🎯</span> Threat Protection
      </div>
      <div style="display: flex; flex-direction: column; gap: 0;">
        ${THREAT_TOGGLES.map((t, i) =>
          renderToggleRow(
            t,
            settings[t.key] as boolean,
            i < THREAT_TOGGLES.length - 1,
          ),
        ).join('')}
      </div>
    </div>
  `;
}

function renderToggleRow(
  toggle: ThreatToggle,
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
        ${renderToggleSwitch(toggle.key, active)}
      </div>
    </div>
  `;
}

function renderToggleSwitch(key: string, active: boolean): string {
  return `
    <button
      class="security-toggle-btn ${active ? 'active' : ''}"
      data-key="${key}"
      aria-checked="${active}"
      role="switch"
      style="
        width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
        background: ${active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'};
        position: relative; transition: background 0.2s ease; flex-shrink: 0;
        outline: none;
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
  `;
}
