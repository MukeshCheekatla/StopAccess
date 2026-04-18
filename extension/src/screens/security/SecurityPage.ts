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
import {
  renderCloudBanner,
  renderErrorCard,
  applyToggleUI,
} from '../../lib/ui';

const vm = createSecurityVM(storage, nextDNSApi);

export async function renderSecurityPage(
  container: HTMLElement,
): Promise<void> {
  if (!container) {
    return;
  }

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

  // Idempotent Shell Guard
  if (!container.querySelector('#securityShell')) {
    container.innerHTML = `
      <div id="securityShell" class="fg-animate-fade-in fg-py-1">
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
  } else {
    // In-place update if shell exists
    const sectionsContainer = container.querySelector(
      '#security_sections_container',
    );
    if (sectionsContainer) {
      sectionsContainer.innerHTML = `
        ${renderThreatSection(settings || ({} as any))}
        ${renderDomainProtectionSection(settings || ({} as any))}
        ${renderContentProtectionSection(settings || ({} as any))}
        ${renderParentalSection(parental)}
        ${renderTldManager((settings?.tlds as any) || [])}
      `;
      // Re-attach handlers if inner content was replaced
      attachHandlers(container, settings);
    }
  }
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
      applyToggleUI(btn as HTMLElement, newValue);

      const result = await vm.toggleSetting(key, newValue);
      if (!result.ok) {
        // Revert
        applyToggleUI(btn as HTMLElement, currentActive);
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

function renderLocalModeBanner(): string {
  return renderCloudBanner(
    'Local Performance Mode',
    'Cloud-level security layers are currently inactive. Connect your NextDNS account to enable global protection.',
    'btn_upgrade_cloud',
    'Upgrade to Cloud',
    'var(--fg-yellow)',
  );
}

function renderError(message: string): string {
  return renderErrorCard(message, 'btn_retry_security');
}
