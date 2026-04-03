/**
 * SecurityPopup
 * Compact security view for popup (300x500px).
 */

import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../background/platformAdapter';
import { createSecurityVM } from '../../../../packages/viewmodels/src/useSecurityVM';
import { buildDashboardTabPath } from '@focusgate/core';
import { toast } from '../../lib/toast';
import type { NextDNSSecuritySettings } from '@focusgate/types';

const vm = createSecurityVM(storage, nextDNSApi);

const CRITICAL_TOGGLES: {
  key: keyof Omit<NextDNSSecuritySettings, 'tlds'>;
  label: string;
  icon: string;
}[] = [
  { key: 'threatIntelligenceFeeds', label: 'Threat Feeds', icon: '🛡️' },
  { key: 'aiThreatDetection', label: 'AI Detection', icon: '🤖' },
  { key: 'googleSafeBrowsing', label: 'Safe Browsing', icon: '🔍' },
];

export async function renderSecurityPopup(
  container: HTMLElement,
): Promise<void> {
  if (!container) {
    return;
  }

  const { settings, isConfigured } = await vm.load();
  const activeCount = isConfigured ? await vm.getActiveCount() : 0;
  const totalCount = 12;

  if (!isConfigured) {
    container.innerHTML = `
      <div class="glass-card" style="margin-bottom:16px; text-align:center; padding:20px;">
        <div style="font-size:28px; margin-bottom:8px;">🔐</div>
        <div style="font-size:12px; font-weight:800; color:var(--yellow);">NextDNS Required</div>
        <div style="font-size:11px; color:var(--muted); margin-top:4px;">
          Connect in Settings to manage security.
        </div>
        <button class="btn-premium" id="btn_goto_settings_sec"
          style="width:100%; margin-top:12px; font-size:10px; justify-content:center;">
          OPEN SETTINGS
        </button>
      </div>
    `;
    container
      .querySelector('#btn_goto_settings_sec')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
    return;
  }

  const scoreColor =
    activeCount >= 10
      ? 'var(--green)'
      : activeCount >= 6
      ? 'var(--yellow)'
      : 'var(--red)';

  const scoreLabel =
    activeCount >= 10 ? 'STRONG' : activeCount >= 6 ? 'MODERATE' : 'WEAK';

  container.innerHTML = `
    <!-- Score card -->
    <div class="glass-card" style="margin-bottom:16px; padding:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between;
        margin-bottom:12px;">
        <div style="font-size:10px; font-weight:800; color:var(--muted);
          letter-spacing:1px; text-transform:uppercase;">
          Security Score
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:18px; font-weight:900; color:${scoreColor};">
            ${activeCount}/${totalCount}
          </span>
          <span style="font-size:9px; font-weight:800; padding:2px 7px;
            border-radius:10px; background:${scoreColor}22; color:${scoreColor};
            border:1px solid ${scoreColor}44;">
            ${scoreLabel}
          </span>
        </div>
      </div>

      <!-- Progress bar -->
      <div style="width:100%; height:4px; background:rgba(255,255,255,0.06);
        border-radius:4px; overflow:hidden; margin-bottom:16px;">
        <div style="width:${Math.round((activeCount / totalCount) * 100)}%;
          height:100%; background:${scoreColor}; border-radius:4px;
          transition:width 0.4s ease;"></div>
      </div>

      <!-- Critical toggles -->
      <div style="display:flex; flex-direction:column; gap:0;">
        ${
          settings
            ? CRITICAL_TOGGLES.map((t, i) => {
                const active = settings[t.key] as boolean;
                return `
                <div style="display:flex; align-items:center;
                  justify-content:space-between; padding:10px 0;
                  ${
                    i < CRITICAL_TOGGLES.length - 1
                      ? 'border-bottom:1px solid rgba(255,255,255,0.04);'
                      : ''
                  }">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:14px;">${t.icon}</span>
                    <span style="font-size:12px; font-weight:700;
                      color:var(--text);">${t.label}</span>
                  </div>
                  <button
                    class="security-popup-toggle ${active ? 'active' : ''}"
                    data-key="${t.key}"
                    style="width:36px; height:20px; border-radius:10px; border:none;
                      cursor:pointer; position:relative; transition:background 0.2s;
                      background:${
                        active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'
                      };
                      outline:none; flex-shrink:0;"
                  >
                    <span style="position:absolute; top:2px;
                      left:${active ? '18px' : '2px'};
                      width:16px; height:16px; border-radius:50%;
                      background:white; transition:left 0.2s;
                      box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
                  </button>
                </div>
              `;
              }).join('')
            : '<div style="color:var(--muted); font-size:11px;">Loading...</div>'
        }
      </div>
    </div>

    <!-- Open full settings -->
    <button class="btn-premium" id="btn_open_security_page"
      style="width:100%; font-size:10px; justify-content:center;
        background:rgba(255,255,255,0.02); box-shadow:none;
        border-color:var(--glass-border);">
      MANAGE ALL PROTECTIONS →
    </button>
  `;

  // Handlers
  container.querySelectorAll('.security-popup-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key') as keyof Omit<
        NextDNSSecuritySettings,
        'tlds'
      >;
      const active = btn.classList.contains('active');
      const newValue = !active;

      // Optimistic UI
      applyPopupToggleUI(btn as HTMLElement, newValue);

      const result = await vm.toggleSetting(key, newValue);
      if (!result.ok) {
        applyPopupToggleUI(btn as HTMLElement, active);
        toast.error(result.error ?? 'Failed');
      }
    });
  });

  container
    .querySelector('#btn_open_security_page')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('security')),
      });
    });
}

function applyPopupToggleUI(btn: HTMLElement, active: boolean): void {
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--accent)';
  } else {
    btn.classList.remove('active');
    btn.style.background = 'rgba(255,255,255,0.1)';
  }
  const knob = btn.querySelector('span') as HTMLElement;
  if (knob) {
    knob.style.left = active ? '18px' : '2px';
  }
}
