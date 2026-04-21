import { COLORS } from '../../lib/designTokens';
/**
 * PrivacyPage
 * Full dashboard tab for NextDNS Privacy settings.
 */

import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../background/platformAdapter';
import { createPrivacyVM } from '../../../../packages/viewmodels/src/usePrivacyVM';
import { renderBlocklistsSection } from './components/BlocklistsSection';
import { renderNativeTrackersSection } from './components/NativeTrackersSection';
import { renderPrivacyOptionsSection } from './components/PrivacyOptionsSection';
import { toast } from '../../lib/toast';
import { buildDashboardTabPath } from '@stopaccess/core';
import {
  renderCloudBanner,
  renderErrorCard,
  applyToggleUI,
  applyCardToggleUI,
  attachGlobalIconListeners,
} from '../../lib/ui';
import { prefetchIconCache } from '../../lib/iconCache';

const vm = createPrivacyVM(storage, nextDNSApi);

export async function renderPrivacyPage(container: HTMLElement): Promise<void> {
  if (!container) {
    return;
  }

  // Remove blocking loader to ensure instant dashboard display
  if (!container.innerHTML) {
    container.innerHTML =
      '<div class="fg-max-w-[800px] fg-mx-auto fg-animate-fade-in fg-py-12"></div>';
  }

  const [{ settings, isConfigured, error }, availableBlocklists] =
    await Promise.all([vm.load(), vm.getAvailableBlocklists()]);

  // Handle icon cache prefetch separately
  prefetchIconCache();

  // Onboarding Bridge: Allow viewing in Local Mode
  const isLocalMode = !isConfigured;

  if (error) {
    container.innerHTML = renderErrorCard(
      error ?? 'Unknown error',
      'btn_retry_privacy',
    );
    container
      .querySelector('#btn_retry_privacy')
      ?.addEventListener('click', () => renderPrivacyPage(container));
    return;
  }

  const privacySettings =
    settings ||
    ({
      disguisedTrackers: false,
      allowAffiliate: false,
      natives: [],
      blocklists: [],
    } as any);

  container.innerHTML = `
    ${isLocalMode ? renderLocalModeBanner() : ''}

    <div id="privacy_content_container" class="${
      isLocalMode ? 'fg-opacity-50 fg-pointer-events-none' : ''
    }">
      <!-- Sections -->
      <div class="fg-grid fg-grid-cols-1 lg:fg-grid-cols-[1.8fr_1fr] fg-gap-4 fg-mb-4">
        <div>
           ${renderNativeTrackersSection(privacySettings.natives ?? [])}
        </div>
        <div>
           ${renderPrivacyOptionsSection(privacySettings)}
        </div>
      </div>
      <div id="privacy_blocklists_section">
        ${renderBlocklistsSection(
          privacySettings.blocklists ?? [],
          availableBlocklists,
        )}
      </div>
    </div>
  `;

  if (isLocalMode) {
    container
      .querySelector('#btn_upgrade_cloud_privacy')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
  }

  attachHandlers(container);
  attachGlobalIconListeners(container);
}

function attachHandlers(container: HTMLElement): void {
  // Blocklist Search (Main Section)
  const searchMain = container.querySelector(
    '#blocklist-search-main',
  ) as HTMLInputElement;
  const gridMain = container.querySelector(
    '#blocklists-grid-main',
  ) as HTMLElement;
  if (searchMain && gridMain) {
    searchMain.addEventListener('input', () => {
      const q = searchMain.value.toLowerCase().trim();
      const cards = gridMain.querySelectorAll('.blocklist-card');
      cards.forEach((card: any) => {
        const nameEl = card.querySelector('.fg-font-bold') as HTMLElement;
        const name = nameEl ? (nameEl.textContent || '').toLowerCase() : '';
        if (name.includes(q)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Blocklist Drawer Discovery
  const drawerOverlay = container.querySelector(
    '#blocklist-drawer-overlay',
  ) as HTMLElement;
  const drawer = container.querySelector('#blocklist-drawer') as HTMLElement;
  const openDrawerBtn = container.querySelector('#open-blocklist-drawer');
  const closeDrawerBtn = container.querySelector('#close-blocklist-drawer');

  const openDrawer = () => {
    if (!drawerOverlay || !drawer) {
      return;
    }
    drawerOverlay.style.display = 'flex';
    setTimeout(() => {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }, 10);
  };

  const closeDrawer = () => {
    if (!drawerOverlay || !drawer) {
      return;
    }
    drawer.style.opacity = '0';
    drawer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      drawerOverlay.style.display = 'none';
    }, 300);
  };

  if (openDrawerBtn) {
    openDrawerBtn.addEventListener('click', openDrawer);
  }
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawerBtnClick);
  }
  function closeDrawerBtnClick() {
    closeDrawer();
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) {
        closeDrawer();
      }
    });

    // Use standardized icon caching listeners from UI library
    attachGlobalIconListeners(container);
  }

  // Drawer Search
  const searchDrawer = container.querySelector(
    '#blocklist-search-drawer',
  ) as HTMLInputElement;
  const drawerList = container.querySelector(
    '#blocklist-drawer-list',
  ) as HTMLElement;
  if (searchDrawer && drawerList) {
    searchDrawer.addEventListener('input', () => {
      const q = searchDrawer.value.toLowerCase().trim();
      const rows = drawerList.querySelectorAll('.blocklist-row');
      rows.forEach((row: any) => {
        const name = row.getAttribute('data-name') || '';
        const desc = row.getAttribute('data-desc') || '';
        if (name.includes(q) || desc.includes(q)) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Blocklist card & row clicks
  container
    .querySelectorAll('.blocklist-card, .blocklist-row')
    .forEach((el) => {
      el.addEventListener('click', async (e) => {
        const btn = el.querySelector('.blocklist-toggle-btn') as HTMLElement;
        if (!btn || e.target === btn || btn.contains(e.target as Node)) {
          return;
        }
        btn.click();
      });
    });

  container.querySelectorAll('.blocklist-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id')!;
      const active = btn.getAttribute('data-active') === 'true';

      const card = btn.closest('.blocklist-card') as HTMLElement;
      applyCardToggleUI(card, btn as HTMLElement, !active);

      let result: { ok: boolean; error?: string };
      if (!active) {
        result = await vm.addBlocklist(id);
        if (result.ok) {
          toast.success(`${id} enabled`);
        }
      } else {
        result = await vm.removeBlocklist(id);
        if (result.ok) {
          toast.success(`${id} removed`);
        }
      }

      if (!result.ok) {
        applyCardToggleUI(card, btn as HTMLElement, active); // revert
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });

  // Native tracker card clicks
  container.querySelectorAll('.native-toggle-card').forEach((card) => {
    card.addEventListener('click', async (e) => {
      const btn = card.querySelector('.native-toggle-btn') as HTMLElement;
      if (!btn) {
        return;
      }
      if (e.target === btn || btn.contains(e.target as Node)) {
        return;
      }
      btn.click();
    });
  });

  container.querySelectorAll('.native-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-key')!;
      const active = btn.getAttribute('aria-checked') === 'true';

      applyToggleUI(btn as HTMLElement, !active);

      let result: { ok: boolean; error?: string };
      if (!active) {
        result = await vm.addNativeTracking(id);
        if (result.ok) {
          toast.success(`${id} tracking blocked`);
        }
      } else {
        result = await vm.removeNativeTracking(id);
        if (result.ok) {
          toast.success(`${id} tracking allowed`);
        }
      }

      if (!result.ok) {
        applyToggleUI(btn as HTMLElement, active);
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });

  // Privacy option toggles
  container.querySelectorAll('.privacy-option-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key') as
        | 'disguisedTrackers'
        | 'allowAffiliate';
      const active = btn.getAttribute('aria-checked') === 'true';
      const newVal = !active;

      applyToggleUI(btn as HTMLElement, newVal);

      let result: { ok: boolean; error?: string };
      if (key === 'disguisedTrackers') {
        result = await vm.toggleDisguisedTrackers(newVal);
      } else {
        result = await vm.toggleAllowAffiliate(newVal);
      }

      if (!result.ok) {
        applyToggleUI(btn as HTMLElement, active);
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });
}

function renderLocalModeBanner(): string {
  return renderCloudBanner(
    'Local Privacy Preview',
    'Multi-layered tracking protection requires cloud synchronization. Connect to enable global blocklists.',
    'btn_upgrade_cloud_privacy',
    'Upgrade to Cloud',
    COLORS.yellow,
  );
}
