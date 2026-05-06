/**
import { COLORS } from '../../../ui/theme/designTokens';
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
} from '../../../ui/ui';
import { COLORS } from '../../../ui/theme/designTokens';
import { ICONS } from '../../../ui/Icons';

interface DomainToggle {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
  tooltip: string; // Glossary text
  description: string;
  icon: string; // inline SVG string
  color: string; // CSS color string/variable
  isBeta?: boolean;
}

// Inline SVG icons — no emojis
const iconRefresh = ICONS.REFRESH;
const iconType = ICONS.TYPE;
const iconKeyboard = ICONS.KEYBOARD;
const iconSliders = ICONS.SLIDERS;
const iconClock = ICONS.CLOCK;
const iconWifi = ICONS.WIFI;
const iconPause = ICONS.PAUSE;
const iconGlobe = ICONS.GLOBE;
const iconSlash = ICONS.SLASH;

const DOMAIN_TOGGLES: DomainToggle[] = [
  {
    key: 'dnsRebinding',
    label: 'DNS Rebinding Protection',
    tooltip:
      'Prevents malicious websites from using your browser to attack local network devices, IoT gadgets, and home routers.',
    description:
      'Prevents attackers from controlling your local network via DNS.',
    icon: iconRefresh,
    color: COLORS.securityRebinding,
  },
  {
    key: 'idnHomographs',
    label: 'IDN Homograph Attacks',
    tooltip:
      "Blocks 'look-alike' domains that use similar characters from different alphabets to impersonate legitimate sites (phishing).",
    description: 'Block look-alike domains using foreign characters.',
    icon: iconType,
    color: COLORS.securityPhishing,
  },
  {
    key: 'typosquatting',
    label: 'Typosquatting Protection',
    tooltip:
      'Detects and blocks common misspellings of popular websites designed to trick you into visiting malicious clones.',
    description: 'Block domains designed to catch common URL typos.',
    icon: iconKeyboard,
    color: COLORS.securityTyposquatting,
  },
  {
    key: 'dga',
    label: 'Domain Generation Algorithms',
    tooltip:
      'Blocks algorithmically generated domains used by malware to communicate with command-and-control servers.',
    description: 'Block algorithmically generated domains used by malware.',
    icon: iconSliders,
    color: COLORS.securityDGA,
  },
  {
    key: 'nrd',
    label: 'Newly Registered Domains',
    tooltip:
      'Protects against newly registered domains (less than 30 days old), which are frequently used for short-lived malicious campaigns.',
    description:
      'Block domains registered in the last 30 days (often malicious).',
    icon: iconClock,
    color: COLORS.securityNRD,
  },
  {
    key: 'ddns',
    label: 'Dynamic DNS',
    tooltip:
      'Blocks hostnames from dynamic DNS providers, which are often utilized to host malicious content or malware payloads.',
    description: 'Block dynamic DNS hostnames used in attacks.',
    icon: iconWifi,
    color: COLORS.securityDDNS,
    isBeta: true,
  },
  {
    key: 'parking',
    label: 'Parked Domains',
    tooltip:
      'Blocks domains that are inactive or show ads, preventing potential tracking and reducing general network clutter.',
    description: 'Block inactive parked domains used for ads or tracking.',
    icon: iconPause,
    color: COLORS.securityParking,
  },
  {
    key: 'csam',
    label: 'Block CSAM',
    tooltip:
      'Blocks access to known Child Sexual Abuse Material (CSAM) domains using industry-standard safety lists from organizations like the NCMEC.',
    description: 'Block child sexual abuse material.',
    icon: iconSlash,
    color: COLORS.securityCSAM,
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
    <div class="fg-p-2 fg-mb-4">
      ${renderSectionTitleRow(
        iconGlobe,
        'var(--accent)',
        'Domain Protection',
        renderSectionBadge(`${activeCount}/${total} Active`),
      )}
      <div class="fg-grid fg-grid-cols-2 fg-gap-2">
        ${DOMAIN_TOGGLES.map((t, i) =>
          renderToggleRow(t, settings[t.key] as boolean, i),
        ).join('')}
      </div>
    </div>
  `;
}

function renderToggleRow(
  toggle: DomainToggle,
  active: boolean,
  index?: number,
): string {
  const align = index !== undefined && index % 2 !== 0 ? 'right' : 'center';

  return `
    <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150 hover:fg--translate-y-0.5 hover:fg-bg-[${
      COLORS.surfaceHover
    }]"
      data-key="${toggle.key}"
      style="background: ${COLORS.glassBg}; border: 1px solid ${
    COLORS.glassBorder
  };"
    >
      <!-- Icon (Left) -->
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
          ${renderInfoTooltip(toggle.tooltip ?? '', 'up', align)}
        </div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        }; opacity: 0.6; line-height: 1.4;" class="fg-line-clamp-2">
          ${escapeHtml(toggle.description)}
        </div>
        ${
          toggle.key === 'csam'
            ? `
          <div class="fg-inline-block fg-text-[8px] fg-font-black fg-tracking-[1px] fg-mt-[5px] fg-px-2 fg-py-[2px] fg-rounded-[10px]" style="background: ${COLORS.emeraldSoft}; color: var(--green); border: 1px solid ${COLORS.emeraldBorder};">
            RECOMMENDED
          </div>
        `
            : ''
        }
      </div>

      <!-- Toggle (Right) -->
      <div class="fg-shrink-0">
        ${renderToggleSwitch(toggle.key, active)}
      </div>
    </div>
  `;
}
