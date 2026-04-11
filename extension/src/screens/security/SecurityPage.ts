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
import { renderParentalSection } from './components/ParentalSection';
import { renderTldManager } from './components/TldManager';
import { toast } from '../../lib/toast';
import { buildDashboardTabPath } from '@stopaccess/core';
import type { NextDNSSecuritySettings } from '@stopaccess/types';

const iconLock =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconAlert =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

const vm = createSecurityVM(storage, nextDNSApi);

export async function renderSecurityPage(
  container: HTMLElement,
): Promise<void> {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="fg-flex fg-items-center fg-justify-center fg-p-10">
      <div class="loader"></div>
    </div>
  `;

  const { settings, parental, isConfigured, error } = await vm.load();

  // Onboarding Bridge: Allow viewing in Local Mode
  const isLocalMode = !isConfigured;

  if (error) {
    container.innerHTML = renderError(error ?? 'Unknown error');
    container
      .querySelector('#btn_retry_security')
      ?.addEventListener('click', () => {
        renderSecurityPage(container);
      });
    return;
  }

  container.innerHTML = `
    ${isLocalMode ? renderLocalModeBanner() : ''}
    <!-- Sections -->
    <div id="security_sections_container" class="${
      isLocalMode ? 'fg-opacity-50 fg-pointer-events-none' : ''
    }">
      ${renderThreatSection(settings || ({} as any))}
      ${renderDomainProtectionSection(settings || ({} as any))}
      ${renderContentProtectionSection(settings || ({} as any))}
      ${renderParentalSection(parental)}
      ${renderTldManager((settings?.tlds as any) || [])}
    </div>
  `;

  if (isLocalMode) {
    container
      .querySelector('#btn_upgrade_cloud')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
  }

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
      }
    });
  });

  // Row click → same as button click
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
}

function updateToggleUI(btn: HTMLElement, active: boolean): void {
  btn.setAttribute('aria-checked', String(active));
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--green)';
    btn.style.border = '1px solid var(--green)';
  } else {
    btn.classList.remove('active');
    btn.style.background = 'var(--fg-glass-bg)';
    btn.style.border = '1px solid var(--fg-glass-border)';
  }
  const knob = btn.querySelector('span') as HTMLElement;
  if (knob) {
    knob.style.left = active ? '16px' : '2px';
  }
}

function renderLocalModeBanner(): string {
  return `
    <div class="glass-card fg-mb-8 fg-p-8 fg-flex fg-items-center fg-justify-between" style="border-color: var(--fg-yellow); background: rgba(245, 158, 11, 0.05);">
      <div class="fg-flex fg-items-center fg-gap-5">
        <div class="fg-w-12 fg-h-12 fg-rounded-2xl fg-bg-[var(--fg-yellow)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-yellow)]">
          ${iconLock}
        </div>
        <div>
          <div class="fg-text-lg fg-font-black fg-text-white">Local Performance Mode</div>
          <div class="fg-text-sm fg-text-[var(--fg-text)] fg-opacity-70 fg-mt-1">Cloud-level security layers are currently inactive. Connect your NextDNS account to enable global protection.</div>
        </div>
      </div>
      <button class="btn-premium fg-px-8" id="btn_upgrade_cloud" style="background: var(--fg-yellow); color: #000; font-weight: 900;">
        Upgrade to Cloud
      </button>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="app-card fg-text-center fg-py-10 fg-px-6" style="background: var(--fg-glass-bg); border-color: var(--fg-glass-border);">
      <div class="fg-mb-4 fg-text-[var(--red)] fg-flex fg-justify-center">${iconAlert}</div>
      <div class="fg-text-base fg-font-black fg-text-[var(--red)] fg-mb-2">Failed to Load</div>
      <div class="fg-text-xs fg-text-[var(--muted)] fg-mb-5">${message}</div>
      <button class="btn btn-outline" id="btn_retry_security">Retry</button>
    </div>
  `;
}
