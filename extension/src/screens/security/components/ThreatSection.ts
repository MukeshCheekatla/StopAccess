import { COLORS } from '../../../lib/designTokens';
/**
 * ThreatSection
 * Renders: Threat Intelligence, AI Detection, Google Safe Browsing, Cryptojacking
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

interface ThreatToggle {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
  tooltip: string; // Glossary text
  description: string;
  icon: string; // inline SVG string
  color: string;
  isBeta?: boolean;
}

// Inline SVG icons — no emojis
const svgShield =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const svgCpu =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/></svg>';
const svgSearch =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const svgZap =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
const svgTarget =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';

const THREAT_TOGGLES: ThreatToggle[] = [
  {
    key: 'threatIntelligenceFeeds',
    label: 'Threat Intelligence Feeds',
    tooltip:
      'Blocks domains from known malware, phishing, and command-and-control databases updated hourly.',
    description: 'Block domains from known threat intelligence databases.',
    icon: svgShield,
    color: '#3b82f6',
  },
  {
    key: 'aiThreatDetection',
    label: 'AI Threat Detection',
    tooltip:
      'Uses predictive machine learning to stop zero-day attacks and newly registered malicious domains.',
    description: 'Machine learning powered detection of malicious domains.',
    icon: svgCpu,
    color: '#a855f7',
    isBeta: true,
  },
  {
    key: 'googleSafeBrowsing',
    label: 'Google Safe Browsing',
    tooltip:
      'Cloud-based URL filtering that warns you about malicious websites across the entire web.',
    description: 'Protect against phishing and malware sites via Google.',
    icon: svgSearch,
    color: '#10b981',
  },
  {
    key: 'cryptojacking',
    label: 'Cryptojacking Protection',
    tooltip:
      "Prevents websites from hijacking your device's power to mine cryptocurrency without consent.",
    description: 'Block sites that mine cryptocurrency using your device.',
    icon: svgZap,
    color: '#f59e0b',
  },
];

export function renderThreatSection(settings: NextDNSSecuritySettings): string {
  const activeCount = THREAT_TOGGLES.filter(
    (t) => settings[t.key] as boolean,
  ).length;
  const total = THREAT_TOGGLES.length;

  return `
    <div class="fg-p-2 fg-mb-4">
      ${renderSectionTitleRow(
        svgTarget,
        COLORS.indigo,
        'Threat Protection',
        renderSectionBadge(`${activeCount}/${total} Active`),
      )}
      <div class="fg-grid fg-grid-cols-1 fg-gap-2">
        ${THREAT_TOGGLES.map((t) =>
          renderToggleRow(t, settings[t.key] as boolean),
        ).join('')}
      </div>
    </div>
  `;
}

function renderToggleRow(toggle: ThreatToggle, active: boolean): string {
  return `
    <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-bg-[${
      COLORS.surfaceHover
    }]"
      data-key="${toggle.key}"
      style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  };"
    >
      <!-- Icon and Indicator (Left) -->
      <div class="fg-relative fg-shrink-0">
        <span style="color: ${toggle.color};">${toggle.icon}</span>
      </div>

      <!-- Content (Middle) -->
       <div class="fg-flex-1 fg-min-w-0">
         <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
           <div style="${UI_TOKENS.TEXT.CARD_TITLE}" class="fg-truncate">
             ${escapeHtml(toggle.label)}
           </div>
           ${
             toggle.isBeta
               ? `
             <span class="fg-text-[7px] fg-font-black fg-px-1.5 fg-py-0.5 fg-rounded-md fg-bg-[${COLORS.accentSoft}] fg-text-[${COLORS.accent}] fg-ml-1 fg-tracking-wider" style="border: 1px solid var(--fg-nav-border);">
               BETA
             </span>
           `
               : ''
           }
           ${renderInfoTooltip(toggle.tooltip ?? '', 'up', 'right')}
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
