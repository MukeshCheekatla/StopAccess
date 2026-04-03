/**
 * SecurityPage
 * Full dashboard tab for NextDNS Security settings.
 */

import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../background/platformAdapter';
import { createSecurityVM } from '../../../../packages/viewmodels/src/useSecurityVM';
import { renderThreatSection } from './components/ThreatSection';
import { renderDomainProtectionSection } from './components/DomainProtectionSection';
import { renderContentProtectionSection } from './components/ContentProtectionSection';
import { renderTldManager } from './components/TldManager';
import { toast } from '../../lib/toast';
import { buildDashboardTabPath } from '@focusgate/core';
import type { NextDNSSecuritySettings } from '@focusgate/types';

const vm = createSecurityVM(storage, nextDNSApi);

export async function renderSecurityPage(
  container: HTMLElement,
): Promise<void> {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div class="loader"></div>
    </div>
  `;

  const { settings, isConfigured, error } = await vm.load();

  if (!isConfigured) {
    container.innerHTML = renderNotConfigured();
    container
      .querySelector('#btn_goto_settings_from_security')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
    return;
  }

  if (error || !settings) {
    container.innerHTML = renderError(error ?? 'Unknown error');
    container
      .querySelector('#btn_retry_security')
      ?.addEventListener('click', () => {
        renderSecurityPage(container);
      });
    return;
  }

  const activeCount = await vm.getActiveCount();
  const totalCount = 12;

  container.innerHTML = `
    <!-- Score Bar -->
    <div style="margin-bottom: 24px;">
      <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06);
        border-radius: 6px; overflow: hidden;">
        <div id="security_score_bar" style="
          width: ${Math.round((activeCount / totalCount) * 100)}%;
          height: 100%;
          background: ${
            activeCount >= 10
              ? 'var(--green)'
              : activeCount >= 6
              ? 'var(--yellow)'
              : 'var(--red)'
          };
          border-radius: 6px;
          transition: width 0.4s ease;
        "></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 6px;
        font-size: 10px; color: var(--muted); font-weight: 700; text-transform: uppercase;">
        <span>Protection Level</span>
        <span id="security_level_text" style="color: ${
          activeCount >= 10
            ? 'var(--green)'
            : activeCount >= 6
            ? 'var(--yellow)'
            : 'var(--red)'
        };">
          ${
            activeCount >= 10
              ? 'STRONG'
              : activeCount >= 6
              ? 'MODERATE'
              : 'WEAK'
          }
        </span>
      </div>
    </div>

    <!-- Sections -->
    <div id="security_sections_container">
      ${renderThreatSection(settings)}
      ${renderDomainProtectionSection(settings)}
      ${renderContentProtectionSection(settings)}
      ${renderTldManager(settings.tlds || [])}
    </div>

    <!-- Enable All / Disable All -->
    <div style="display: flex; gap: 10px; margin-top: 8px; margin-bottom: 24px;">
      <button class="btn" id="btn_enable_all_security"
        style="flex: 1; background: rgba(0,196,140,0.1); color: var(--green);
          border: 1px solid rgba(0,196,140,0.2);">
        Enable All
      </button>
      <button class="btn btn-outline" id="btn_disable_all_security"
        style="flex: 1; border-color: rgba(255,71,87,0.2); color: var(--red);">
        Disable All
      </button>
    </div>
  `;

  attachHandlers(container, settings);
}

function attachHandlers(
  container: HTMLElement,
  _settings: NextDNSSecuritySettings,
): void {
  // Toggle buttons
  container.querySelectorAll('.security-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-key') as keyof Omit<
        NextDNSSecuritySettings,
        'tlds'
      >;
      const currentActive = btn.classList.contains('active');
      const newValue = !currentActive;

      // Optimistic UI
      updateToggleUI(btn as HTMLElement, newValue);

      const result = await vm.toggleSetting(key, newValue);
      if (!result.ok) {
        // Revert
        updateToggleUI(btn as HTMLElement, currentActive);
        toast.error(result.error ?? 'Failed to update setting');
      } else {
        // Update the score summary
        const newCount = await vm.getActiveCount();
        const scoreBar = container.querySelector(
          '#security_score_bar',
        ) as HTMLElement;
        const levelText = container.querySelector(
          '#security_level_text',
        ) as HTMLElement;

        if (scoreBar) {
          scoreBar.style.width = `${Math.round((newCount / 12) * 100)}%`;
        }
        if (levelText) {
          levelText.style.color =
            newCount >= 10
              ? 'var(--green)'
              : newCount >= 6
              ? 'var(--yellow)'
              : 'var(--red)';
          levelText.innerText =
            newCount >= 10 ? 'STRONG' : newCount >= 6 ? 'MODERATE' : 'WEAK';
        }
      }
    });
  });

  // Row click â†’ same as button click
  container.querySelectorAll('.security-toggle-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const btn = row.querySelector('.security-toggle-btn') as HTMLElement;
      if (btn && e.target !== btn) {
        btn.click();
      }
    });
  });

  // TLD Add
  const tldInput = container.querySelector('#tld_input') as HTMLInputElement;
  container
    .querySelector('#btn_add_tld')
    ?.addEventListener('click', async () => {
      const raw = tldInput?.value?.trim().toLowerCase().replace(/^\./, '');
      if (!raw) {
        toast.error('Enter a TLD like "ru" or "cn"');
        return;
      }
      const btn = container.querySelector('#btn_add_tld') as HTMLButtonElement;
      btn.innerText = 'Adding...';
      btn.disabled = true;

      const result = await vm.addTld(raw);
      if (result.ok) {
        tldInput.value = '';
        toast.success(`.${raw} blocked`);
        renderSecurityPage(container);
      } else {
        toast.error(result.error ?? 'Failed to add TLD');
        btn.innerText = 'Block TLD';
        btn.disabled = false;
      }
    });

  // TLD Enter key
  tldInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      (container.querySelector('#btn_add_tld') as HTMLButtonElement)?.click();
    }
  });

  // TLD Quick-add
  container.querySelectorAll('.tld-quick-add').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const result = await vm.addTld(id);
      if (result.ok) {
        toast.success(`.${id} blocked`);
        renderSecurityPage(container);
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  });

  // TLD Remove
  container.querySelectorAll('.tld-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const result = await vm.removeTld(id);
      if (result.ok) {
        toast.success(`.${id} unblocked`);
        renderSecurityPage(container);
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  });

  // Enable All
  container
    .querySelector('#btn_enable_all_security')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btn_enable_all_security',
      ) as HTMLButtonElement;
      btn.innerText = 'Enabling...';
      btn.disabled = true;

      const keys: (keyof Omit<NextDNSSecuritySettings, 'tlds'>)[] = [
        'threatIntelligenceFeeds',
        'aiThreatDetection',
        'googleSafeBrowsing',
        'cryptojacking',
        'dnsRebinding',
        'idnHomographs',
        'typosquatting',
        'dga',
        'nrd',
        'ddns',
        'parking',
        'csam',
      ];

      const patch = Object.fromEntries(keys.map((k) => [k, true])) as any;
      const res = (await nextDNSApi.patchSecurity(patch)) as any;
      if (res && !res.error) {
        toast.success('All protections enabled');
        renderSecurityPage(container);
      } else {
        toast.error('Failed to enable all');
        btn.innerText = 'Enable All';
        btn.disabled = false;
      }
    });

  // Disable All
  container
    .querySelector('#btn_disable_all_security')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btn_disable_all_security',
      ) as HTMLButtonElement;
      btn.innerText = 'Disabling...';
      btn.disabled = true;

      const keys: (keyof Omit<NextDNSSecuritySettings, 'tlds'>)[] = [
        'threatIntelligenceFeeds',
        'aiThreatDetection',
        'googleSafeBrowsing',
        'cryptojacking',
        'dnsRebinding',
        'idnHomographs',
        'typosquatting',
        'dga',
        'nrd',
        'ddns',
        'parking',
        'csam',
      ];

      const patch = Object.fromEntries(keys.map((k) => [k, false])) as any;
      const res = (await nextDNSApi.patchSecurity(patch)) as any;
      if (res && !res.error) {
        toast.success('All protections disabled');
        renderSecurityPage(container);
      } else {
        toast.error('Failed to disable all');
        btn.innerText = 'Disable All';
        btn.disabled = false;
      }
    });
}

function updateToggleUI(btn: HTMLElement, active: boolean): void {
  btn.setAttribute('aria-checked', String(active));
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--accent)';
  } else {
    btn.classList.remove('active');
    btn.style.background = 'rgba(255,255,255,0.1)';
  }
  const knob = btn.querySelector('span') as HTMLElement;
  if (knob) {
    knob.style.left = active ? '23px' : '3px';
  }
}

function renderNotConfigured(): string {
  return `
    <div class="app-card" style="background: rgba(255,184,0,0.05);
      border-color: rgba(255,184,0,0.2); text-align: center; padding: 40px 24px;">
      <div style="font-size: 40px; margin-bottom: 16px;">ðŸ”</div>
      <div style="font-size: 16px; font-weight: 900; color: var(--yellow); margin-bottom: 8px;">
        NextDNS Required
      </div>
      <div style="font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 20px;">
        Connect your NextDNS account in Settings to manage security protections.
      </div>
      <button class="btn" id="btn_goto_settings_from_security"
        style="background: rgba(255,184,0,0.1); color: var(--yellow);
          border: 1px solid rgba(255,184,0,0.2);">
        Open Settings â†’
      </button>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="app-card" style="background: rgba(255,71,87,0.05);
      border-color: rgba(255,71,87,0.2); text-align: center; padding: 40px 24px;">
      <div style="font-size: 40px; margin-bottom: 16px;">âš ï¸</div>
      <div style="font-size: 16px; font-weight: 900; color: var(--red); margin-bottom: 8px;">
        Failed to Load
      </div>
      <div style="font-size: 12px; color: var(--muted); margin-bottom: 20px;">${message}</div>
      <button class="btn btn-outline" id="btn_retry_security">Retry</button>
    </div>
  `;
}
