import { loadAppsData } from '@stopaccess/viewmodels/useAppsVM';
import { setAppsDnsHardMode } from '@stopaccess/state';
import { renderCategoriesTab } from './components/CategoriesTab';
import { setupHandlers } from './AppsEventHandlers';
import { toast } from '@/ui/toast';
import {
  renderDiscoveryDrawer,
  renderDrawerGridInternal,
} from './components/AppDrawer';
import { appsController } from '@/lib/appsController';
import { getLockedDomains } from '@/background/sessionGuard';
import { extensionAdapter } from '@/background/platformAdapter';
import { prefetchIconCache } from '@/lib/iconCache';

import { escapeHtml } from '@stopaccess/core';
import {
  UI_TOKENS,
  UI_ICONS,
  renderEmptyState,
  renderAppTableRow,
  renderInfoTooltip,
  showConfirmDialog,
  showPromptDialog,
  attachGlobalIconListeners,
  renderBrandLogo,
} from '@/ui/ui';
import { COLORS } from '@/ui/theme/designTokens';

let activeTab = 'shield';
let availableCategories: any[] = [];
let searchTerm = '';
let globalContainer: HTMLElement | null = null;
let currentIsConfigured = false;
let currentIsAppsDnsHardMode = true;

// Externalized UI functions and tokens imported above

export async function renderAppsPage(container: HTMLElement) {
  globalContainer = container;
  (window as any).appsCurrentContainer = container;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.minHeight = '0';
  container.style.height = '100%';

  // The layout constraints for .fg-shell-content are now handled by ExtensionShell React component conditionally.

  // Prefetch icon cache for flicker-free rendering
  await prefetchIconCache();

  const { extensionVMDeps } = await import('@/lib/vmDeps');
  const vmData = await loadAppsData(extensionVMDeps);
  const { isConfigured, rules } = vmData;
  currentIsConfigured = isConfigured;
  currentIsAppsDnsHardMode =
    (await extensionAdapter.getBoolean('fg_apps_dns_hard_mode')) ?? false;

  const currentRedirectUrl =
    (await extensionAdapter.getString('fg_redirect_url', '')) || '';

  // Propagation Timer Logic
  const updateTimer = async () => {
    const timerEl = document.getElementById('dnsPropagationTimer');
    if (!timerEl) {
      return;
    }

    const disabledAt = await extensionAdapter.getNumber('fg_dns_disabled_at');
    if (!disabledAt || currentIsAppsDnsHardMode) {
      timerEl.style.display = 'none';
      return;
    }

    const elapsed = Date.now() - disabledAt;
    const duration = 3 * 60 * 1000; // 3 minutes
    const remaining = Math.max(0, duration - elapsed);

    if (remaining <= 0) {
      timerEl.innerText = 'Propagation Complete';
      timerEl.style.color = COLORS.green;
      timerEl.style.display = 'block';
      return;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerEl.innerText = `Unblocks in ${mins}:${secs
      .toString()
      .padStart(2, '0')}`;
    timerEl.style.display = 'block';
    timerEl.style.color = COLORS.yellow;
  };

  const timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  // Cleanup interval when container is removed
  const cleanupObserver = new MutationObserver(() => {
    if (!document.contains(container)) {
      clearInterval(timerInterval);
      cleanupObserver.disconnect();
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });

  const renderRedirectSection = (url: string) => {
    return url
      ? `
      <div id="redirectChip" class="btn-premium" style="display: flex; align-items: center; gap: 12px; background: ${
        COLORS.glassBg
      }; border: 1px solid ${
          COLORS.glassBorder
        }; border-radius: 12px; padding: 10px 14px; cursor: pointer; transition: all 0.2s;">
        <div style="width: 20px; height: 20px; flex-shrink: 0;">
          ${renderBrandLogo(url, url, 20)}
        </div>
        <div style="${
          UI_TOKENS.TEXT.CARD_TITLE
        }; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px;">
          ${escapeHtml(url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}
        </div>
        <button id="btnDeleteRedirect" class="btn-trash-hover" style="background: none; border: none; cursor: pointer; color: ${
          COLORS.red
        }; opacity: 0.6; display: flex; align-items: center; justify-content: center; padding: 4px; transition: opacity 0.2s;">
          ${UI_ICONS.TRASH.replace('width="14"', 'width="18"').replace(
            'height="14"',
            'height="18"',
          )}
        </button>
      </div>
    `
      : `
      <button id="btnSetRedirect" class="btn-premium" style="width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 12px; cursor: pointer; background: ${COLORS.glassBg}; border: 1px dashed ${COLORS.glassBorder}; color: ${COLORS.muted}; transition: all 0.2s;">
        <div style="opacity: 0.5;">${UI_ICONS.PLUS}</div>
        <span style="font-weight: 700; font-size: 14px;">Set Redirect</span>
      </button>
    `;
  };

  const setupRedirectHandlers = (parent: HTMLElement, url: string) => {
    const btnSetRedirect = parent.querySelector('#btnSetRedirect');
    const redirectChip = parent.querySelector('#redirectChip');
    const btnDeleteRedirect = parent.querySelector('#btnDeleteRedirect');

    if (btnSetRedirect) {
      btnSetRedirect.addEventListener('click', async () => {
        const val = await showPromptDialog({
          title: 'Set Redirect',
          body: 'Enter a productive URL to visit when a site is blocked.',
          placeholder: 'e.g. github.com',
        });
        if (val !== null && val.trim()) {
          const trimmed = val.trim();
          await extensionAdapter.set('fg_redirect_url', trimmed);
          toast.success('Redirect saved');
          const uiContainer = parent.querySelector('#redirectUIContainer');
          if (uiContainer) {
            uiContainer.innerHTML = renderRedirectSection(trimmed);
            setupRedirectHandlers(parent, trimmed);
          }
        }
      });
    }

    if (redirectChip) {
      redirectChip.addEventListener('click', async (e) => {
        if ((e.target as HTMLElement).closest('#btnDeleteRedirect')) {
          return;
        }
        const val = await showPromptDialog({
          title: 'Update Redirect',
          body: 'Change your productive destination URL.',
          defaultValue: url || '',
          placeholder: 'e.g. monkeytype.com',
        });
        if (val !== null && val.trim()) {
          const trimmed = val.trim();
          await extensionAdapter.set('fg_redirect_url', trimmed);
          toast.success('Redirect updated');
          const uiContainer = parent.querySelector('#redirectUIContainer');
          if (uiContainer) {
            uiContainer.innerHTML = renderRedirectSection(trimmed);
            setupRedirectHandlers(parent, trimmed);
          }
        }
      });
    }

    if (btnDeleteRedirect) {
      btnDeleteRedirect.addEventListener('click', async (e) => {
        e.stopPropagation();
        await extensionAdapter.delete('fg_redirect_url');
        toast.success('Redirect removed');
        const uiContainer = parent.querySelector('#redirectUIContainer');
        if (uiContainer) {
          uiContainer.innerHTML = renderRedirectSection('');
          setupRedirectHandlers(parent, '');
        }
      });
    }
  };

  if (currentIsConfigured) {
    // Initial fetch in background, then re-render if needed
    loadNextDNSMetadata().then(() => {
      if (globalContainer) {
        refreshListOnly();
      }
    });
  }

  if (!container.querySelector('#__fg_apps_frame')) {
    container.innerHTML = `
      <div id="__fg_apps_frame" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
        <div class="apps-layout-container" style="flex: 1; min-height: 0; align-items: stretch; padding-bottom: 48px;">
          <div id="tabContent" style="flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;"></div>
          
          <div class="apps-side-controls">
            <!-- Navigation -->
            <div class="glass-card" style="padding: 20px;">
              <div class="apps-layout-header">Selection</div>
              <div id="appsNavigation" style="display: flex; gap: 6px; padding: 4px; background: ${
                COLORS.glassBg
              }; border: 1px solid ${COLORS.glassBorder}; border-radius: 12px;">
                <button class="nav-item-tab ${
                  activeTab === 'shield' ? 'is-active' : ''
                }" data-tab="shield">Blocklist</button>
                <button class="nav-item-tab ${
                  activeTab === 'categories' ? 'is-active' : ''
                }" data-tab="categories">Categories</button>
              </div>
            </div>

            <!-- Productive Redirect -->
            <div class="glass-card" style="padding: 20px;">
              <div class="apps-layout-header" style="margin-bottom: 12px;">
                Redirect ${renderInfoTooltip(
                  'Automatically redirect blocked attempts to a productive site.',
                )}
              </div>
              
              <div id="redirectUIContainer">
                ${renderRedirectSection(currentRedirectUrl)}
              </div>
            </div>

            <style>
              .redirect-card.is-editing #redirectInput {
                border-color: ${COLORS.inAppActiveBorder};
                background: color-mix(in srgb, ${
                  COLORS.inAppActiveBg
                }, transparent 95%);
                box-shadow: 0 0 0 4px color-mix(in srgb, ${
                  COLORS.inAppActiveBg
                }, transparent 90%);
              }
              .redirect-card:not(.is-editing) #redirectInput {
                cursor: default;
                opacity: 0.7;
              }
              .btn-trash-hover:hover {
                opacity: 1 !important;
              }
            </style>

          <!-- DNS Hard Mode -->
          <div class="glass-card" style="padding: 20px;">
            <div class="apps-layout-header">
              DNS Hard Mode ${renderInfoTooltip(
                'Forces blocking at the network protocol layer via NextDNS, preventing browser-level bypasses.',
              )}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; background: ${
              COLORS.glassBg
            }; border: 1px solid ${
      COLORS.glassBorder
    }; border-radius: 12px; padding: 10px 14px;">
              <div style="display: flex; flex-direction: column;">
                <span style="${UI_TOKENS.TEXT.CARD_TITLE}">Hard Block</span>
                <div id="dnsPropagationTimer" style="${
                  UI_TOKENS.TEXT.LABEL
                }; font-size: 10px; color: ${
      COLORS.yellow
    }; opacity: 0.8; margin-top: 2px; display: ${
      !currentIsAppsDnsHardMode ? 'block' : 'none'
    };">Checking sync...</div>
              </div>
              <button class="toggle-switch-btn ${
                currentIsAppsDnsHardMode ? 'active' : ''
              }" id="masterDnsToggle" ${
      !currentIsConfigured ? 'disabled style="opacity:0.3"' : ''
    } style="transform: scale(0.8); transform-origin: right;">
                <span class="on-text">ON</span>
                <span class="off-text">OFF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      ${renderDiscoveryDrawer()}

      <style>
        @keyframes fg-liquid-entry {
          0% { opacity: 0; transform: translateY(8px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .liquid-entry {
          animation: fg-liquid-entry 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .morphing-fab {
          width: 56px;
          height: 56px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 28px;
          box-shadow: 0 8px 24px -4px ${COLORS.shadowStrong};
        }
        .morphing-fab:hover {
          width: 210px;
          border-radius: 18px;
          padding: 0 20px;
          justify-content: flex-start;
          box-shadow: 0 20px 40px -12px ${COLORS.shadowStrong};
        }
        .fab-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        .fab-label {
          opacity: 0;
          max-width: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          margin-left: 0;
          font-weight: 700;
          font-size: 14px;
          pointer-events: none;
        }
        .morphing-fab:hover .fab-label {
          opacity: 1;
          max-width: 160px;
          margin-left: 12px;
        }
      </style>

      <div style="position: fixed; bottom: 32px; right: 32px; z-index: 100;">
        <button class="morphing-fab btn-premium" id="btnOpenTargetDrawer" style="background: ${
          COLORS.inAppActiveBg
        }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
      COLORS.inAppActiveBorder
    }; cursor: pointer;">
          <span class="fab-icon">${UI_ICONS.PLUS.replace(
            'width="14"',
            'width="20"',
          ).replace('height="14"', 'height="20"')}</span>
          <span class="fab-label">Add App or Domain</span>
        </button>
      </div>
    `;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const btn = container.querySelector(
          '#btnOpenTargetDrawer',
        ) as HTMLElement;
        if (btn) {
          btn.click();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    const observer = new MutationObserver((_mutations) => {
      if (!document.contains(container)) {
        window.removeEventListener('keydown', handleGlobalKeyDown);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    container.querySelectorAll('.nav-item-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab') || 'shield';
        container
          .querySelectorAll('.nav-item-tab')
          .forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        // Trigger liquid transition
        const tabContent = container.querySelector('#tabContent');
        if (tabContent) {
          tabContent.classList.remove('liquid-entry');
          (tabContent as HTMLElement).offsetWidth; // Force reflow
          tabContent.classList.add('liquid-entry');
        }

        refreshListOnly();
      });
    });

    const masterToggle = container.querySelector(
      '#masterDnsToggle',
    ) as HTMLElement;
    if (masterToggle) {
      masterToggle.addEventListener('click', async () => {
        if (!currentIsConfigured) {
          toast.error('NextDNS credentials required. Configure in Settings.');
          return;
        }

        const wasActive = masterToggle.classList.contains('active');
        const targetState = !wasActive;

        if (!targetState) {
          const { checkGuard } = await import('@/background/sessionGuard');
          const guard = await checkGuard('disable_blocking');
          if (!guard.allowed) {
            toast.error((guard as any).reason);
            return;
          }
        }

        const confirmed = await showConfirmDialog({
          title: targetState
            ? 'Enable DNS Hard Mode?'
            : 'Disable DNS Hard Mode?',
          body: targetState
            ? 'This activates protocol-level protection via NextDNS. Websites will be blocked at the DNS layer, making bypasses much harder.'
            : `<div style="text-align: left;">
                 <p style="margin-bottom: 12px;"><strong>Propagation Delay:</strong> DNS changes are not instant. Due to system caching, sites may remain blocked for several minutes.</p>
                 <div style="background: color-mix(in srgb, ${COLORS.black}, transparent 80%); padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; border: 1px solid ${COLORS.glassBorder};">
                   <strong>To unblock instantly:</strong><br>
                   1. Run: <span style="color: ${COLORS.red};">ipconfig /flushdns</span> in terminal<br>
                   2. Visit: <span style="color: ${COLORS.red};">chrome://net-internals/#dns</span> and click "Clear host cache"
                 </div>
               </div>`,
          confirmLabel: targetState ? 'Enable Mode' : 'Disable Mode',
          isDestructive: !targetState,
          allowHtml: !targetState,
        });

        if (!confirmed) {
          return;
        }

        currentIsAppsDnsHardMode = targetState;
        masterToggle.classList.toggle('active', targetState);

        if (!targetState) {
          const offText = masterToggle.querySelector('.off-text');
          if (offText) {
            const original = offText.textContent;
            let countdown = 5;
            offText.textContent = `WAITING (${countdown}s)`;
            const interval = setInterval(() => {
              countdown--;
              if (countdown > 0) {
                offText.textContent = `WAITING (${countdown}s)`;
              } else {
                clearInterval(interval);
                offText.textContent = original;
              }
            }, 1000);
          }
          // Set propagation timestamp
          await extensionAdapter.set('fg_dns_disabled_at', Date.now());
        } else {
          await extensionAdapter.delete('fg_dns_disabled_at');
        }

        await setAppsDnsHardMode(extensionAdapter, targetState);
        await appsController.reconcileAppsDnsMode(targetState, rules);

        chrome.runtime.sendMessage({ action: 'manualSync' });

        setTimeout(() => refreshListOnly(), 300);
      });
    }

    setupRedirectHandlers(container, currentRedirectUrl);
  }

  await refreshListOnly(rules);

  if (!(window as any).__appsStorageListener) {
    (window as any).__appsStorageListener = (changes: any) => {
      // Monitor rules and temporary passes
      const rulesChanged = !!(changes.rules || changes.fg_rules);
      const passesChanged = !!(changes.fg_temp_passes || changes.temp_passes);
      const configChanged = !!(
        changes.nextdns_api_key || changes.nextdns_profile_id
      );

      if (rulesChanged || passesChanged || configChanged) {
        const activeContainer =
          (window as any).appsCurrentContainer || globalContainer;
        if (activeContainer && document.contains(activeContainer)) {
          refreshListOnly();
        }
      }
    };
    chrome.storage.onChanged.addListener((window as any).__appsStorageListener);
  }
}

async function loadNextDNSMetadata() {
  const { extensionVMDeps } = await import('@/lib/vmDeps');
  const vmData: any = await loadAppsData(extensionVMDeps);
  const { isConfigured } = vmData;
  if (!isConfigured) {
    return;
  }

  try {
    const metadata: any = await appsController.loadMetadata();
    availableCategories = metadata.categories || [];
    (window as any).availableDenylist = metadata.denylist || [];

    // Sync local rules with cloud state for categories
    if (availableCategories.length > 0) {
      const { rules } = await loadAppsData(extensionVMDeps);
      for (const cat of availableCategories) {
        const localRule = rules.find(
          (r) => r.packageName === cat.id && r.type === 'category',
        );
        if (localRule && localRule.desiredBlockingState !== cat.active) {
          // Update local to match cloud
          const { updateRule } = await import('@stopaccess/state/rules');
          await updateRule(extensionAdapter, {
            ...localRule,
            desiredBlockingState: cat.active,
            blockedToday: cat.active,
            mode: cat.active
              ? localRule.dailyLimitMinutes > 0
                ? 'limit'
                : 'block'
              : 'allow',
          });
        }
      }
    }
  } catch (err) {
    console.error('[StopAccess] Metadata Sync Fail:', err);
  }
}

async function refreshListOnly(passedRules?: any[]) {
  if (!globalContainer) {
    return;
  }

  const { extensionVMDeps } = await import('@/lib/vmDeps');
  const vmData = await loadAppsData(extensionVMDeps);
  const { rules, passes } = vmData;
  const rulesToUse = passedRules || rules;
  const lockedDomains = await getLockedDomains();
  const tabContent = globalContainer.querySelector(
    '#tabContent',
  ) as HTMLElement;
  const searchBadge = globalContainer.querySelector(
    '#searchBadge',
  ) as HTMLElement;

  // Removed blocking loader to ensure instant interaction

  globalContainer.querySelectorAll('.nav-item-tab').forEach((btn) => {
    btn.classList.toggle(
      'is-active',
      btn.getAttribute('data-tab') === activeTab,
    );
  });

  if (searchBadge) {
    searchBadge.style.opacity = searchTerm ? '0' : '1';
  }

  if (tabContent) {
    tabContent.style.display = 'flex';
    tabContent.style.flexDirection = 'column';
    tabContent.style.minHeight = '0';
    tabContent.style.overflowY = activeTab === 'shield' ? 'clip' : 'auto';
    tabContent.style.overflowX = 'hidden';
    tabContent.style.scrollSnapType =
      activeTab === 'shield' ? 'none' : 'y mandatory';
    tabContent.style.scrollPaddingTop = '10px';
    tabContent.style.paddingBottom = '0';

    if (!tabContent.querySelector('#tabRuleList')) {
      tabContent.innerHTML =
        '<div id="tabRuleList" style="flex: 1; min-height: 0; display: flex; flex-direction: column;"></div>';
    }

    const ruleList = tabContent.querySelector('#tabRuleList');
    if (ruleList) {
      (ruleList as HTMLElement).style.flex = '1';
      (ruleList as HTMLElement).style.minHeight = '0';
      (ruleList as HTMLElement).style.display = 'flex';
      (ruleList as HTMLElement).style.flexDirection = 'column';
      const html = await renderSubTab(rulesToUse, lockedDomains, passes);
      ruleList.innerHTML = html;
      await setupHandlers(globalContainer, rulesToUse, {
        refreshListOnly,
        handleAddDomain,
        renderDrawerGrid,
      });
    }

    attachGlobalIconListeners(globalContainer);
  }
}

async function handleAddDomain(input?: string) {
  if (!globalContainer) {
    return;
  }
  const domain = input || searchTerm.trim().toLowerCase();
  if (!domain) {
    return;
  }

  const result = await appsController.addDomainRule(domain);
  if (result.ok) {
    searchTerm = '';
    await refreshListOnly();
  }
}

function matchesSearch(item: any) {
  if (!searchTerm) {
    return true;
  }
  const name = (
    item.name ||
    item.id ||
    item.appName ||
    item.packageName ||
    ''
  ).toLowerCase();
  const domain = (item.customDomain || item.packageName || '').toLowerCase();
  return name.includes(searchTerm) || domain.includes(searchTerm);
}

// Externalized UI functions and tokens imported above

async function renderSubTab(
  rules: any[],
  lockedDomains: string[],
  passes: any = {},
) {
  if (activeTab === 'shield') {
    const visibleRules = rules
      .filter((r) => r.type === 'domain' || r.type === 'service' || !r.type)
      .filter(matchesSearch)
      .sort((a, b) => {
        // 1. Sort by usage (DESC) — Most used apps float to top
        const usageA = a.usedMinutesToday || 0;
        const usageB = b.usedMinutesToday || 0;
        if (usageB !== usageA) {
          return usageB - usageA;
        }

        // 2. Fallback to existing logic (Services first, then name)
        const typeA = (a.type || 'domain').toLowerCase();
        const typeB = (b.type || 'domain').toLowerCase();
        if (typeA === 'service' && typeB !== 'service') {
          return -1;
        }
        if (typeA !== 'service' && typeB === 'service') {
          return 1;
        }
        const nameA = (
          a.appName ||
          a.customDomain ||
          a.packageName ||
          ''
        ).toLowerCase();
        const nameB = (
          b.appName ||
          b.customDomain ||
          b.packageName ||
          ''
        ).toLowerCase();
        return nameA.localeCompare(nameB);
      });

    const getTimeUntilReset = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    return `
      <div style="display: flex; flex: 1; min-height: 0; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: ${
              COLORS.text
            }; letter-spacing: -0.5px;">Active Rules</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <div style="${UI_TOKENS.TEXT.SUBTEXT}">
                Managing ${visibleRules.length} enforcement rules 
              </div>
              <div style="width: 3px; height: 3px; border-radius: 50%; background: ${
                COLORS.glassBorder
              }; opacity: 0.5;"></div>
              <div style="${
                UI_TOKENS.TEXT.LABEL
              }; font-size: 11px; color: var(--fg-muted); opacity: 0.8; display: flex; align-items: center; gap: 4px;">
                <span style="display: flex; transform: scale(0.8);">${
                  UI_ICONS.CLOCK
                }</span>
                Reset in ${getTimeUntilReset()}
              </div>
            </div>
          </div>
        </div>

      <!-- Scrollable Table Section -->
      <div class="rule-table-scroll-container" style="
        flex: 1;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        scrollbar-gutter: stable;
      ">
        <style>
          .rule-table-scroll-container::-webkit-scrollbar {
            width: 6px;
          }
          .rule-table-scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .rule-table-scroll-container::-webkit-scrollbar-thumb {
            background: ${COLORS.glassBorder};
            border-radius: 10px;
          }
          .rule-table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: ${COLORS.muted};
          }
          .rule-table-body-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .rule-table-body-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .rule-table-body-scroll::-webkit-scrollbar-thumb {
            background: ${COLORS.glassBorder};
            border-radius: 10px;
          }
          .rule-table-body-scroll::-webkit-scrollbar-thumb:hover {
            background: ${COLORS.muted};
          }
        </style>

        <div class="rule-table-header" style="
          display: grid; 
          grid-template-columns: 32px minmax(160px, 1fr) 150px 140px 120px 80px 40px;
          column-gap: 12px;
          align-items: center;
          padding: 10px 20px;
          background: ${COLORS.glassBg};
          border: 1px solid ${COLORS.glassBorder};
          border-radius: 12px;
          flex-shrink: 0;
          backdrop-filter: blur(20px);
          ${UI_TOKENS.TEXT.LABEL}
          width: 100%;
          position: relative;
          z-index: 10;
        ">
          <div style="grid-column: span 2; display: flex; align-items: center; justify-content: flex-start;">Platform</div>
          <div style="display: flex; align-items: center; justify-content: center;">Usage</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">Daily Limit ${renderInfoTooltip(
            'The maximum time allowed per day before a service or domain is automatically blocked.',
            'down',
          )}</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">Passes ${renderInfoTooltip(
            'The number of temporary access tokens available daily to unblock restricted items.',
            'down',
          )}</div>
          <div style="display: flex; align-items: center; justify-content: flex-end;"></div>
          <div style="display: flex; align-items: center; justify-content: flex-end;"></div>
        </div>

        <div class="rule-table-body-scroll" style="
          flex: 0 1 auto;
          min-height: 0;
          overflow-y: auto;
          scroll-behavior: smooth;
          scroll-snap-type: y mandatory;
          scroll-padding-top: 10px;
          padding-top: 10px;
          background: ${COLORS.glassBg};
          border: 1px solid ${COLORS.glassBorder};
          border-radius: 16px;
          margin-top: 12px;
        ">
          <!-- Combined Rules Table -->
          <div style="width: 100%; padding: 0;">
            ${(() => {
              if (!visibleRules.length) {
                return renderEmptyState(
                  searchTerm
                    ? 'No matching apps or domains found.'
                    : 'Your block list is empty.',
                  searchTerm
                    ? []
                    : [
                        { id: 'youtube', label: 'YouTube' },
                        { id: 'instagram', label: 'Instagram' },
                        { id: 'facebook', label: 'Facebook' },
                        { id: 'tiktok', label: 'TikTok' },
                        { id: 'twitter', label: 'Twitter' },
                        { id: 'netflix', label: 'Netflix' },
                      ],
                );
              }

              const appRules = visibleRules.filter(
                (r: any) => (r.type || 'domain').toLowerCase() === 'service',
              );
              const domainRules = visibleRules.filter(
                (r: any) => (r.type || 'domain').toLowerCase() !== 'service',
              );

              let html = '';

              // Render App Rules
              if (appRules.length > 0) {
                html += appRules
                  .map((rule) => {
                    const isLocked = lockedDomains.includes(
                      rule.packageName.toLowerCase(),
                    );
                    return renderAppTableRow(rule, isLocked, passes);
                  })
                  .join('');
              }

              // Separator for Domains
              if (domainRules.length > 0) {
                if (appRules.length > 0) {
                  html += `
                    <div style="padding: 6px 16px 6px 20px; border-top: 1px solid ${COLORS.glassBorder}; border-bottom: 1px solid ${COLORS.glassBorder}; background: ${COLORS.glassBg}; display: flex; align-items: center; gap: 8px; scroll-snap-align: start;">
                      <div style="${UI_TOKENS.TEXT.SUBTEXT}">Custom Domains</div>
                    </div>
                  `;
                }
                html += domainRules
                  .map((rule) => {
                    const isLocked = lockedDomains.includes(
                      rule.packageName.toLowerCase(),
                    );
                    return renderAppTableRow(rule, isLocked, passes);
                  })
                  .join('');
              }

              return html;
            })()}
          </div>
        </div>
      </div>
      </div>

    `;
  }

  if (activeTab === 'categories') {
    return renderCategoriesTab(
      rules,
      lockedDomains,
      passes,
      availableCategories,
      currentIsConfigured,
    );
  }
  return '';
}

export function renderDrawerGrid(rules: any[], search: string = '') {
  const container = globalContainer?.querySelector(
    '#drawerGrid',
  ) as HTMLElement;
  const footerText = globalContainer?.querySelector(
    '#drawerFooterText',
  ) as HTMLElement;
  if (container) {
    renderDrawerGridInternal(container, footerText, rules, search, (domain) => {
      handleAddDomain(domain);
      // Close drawer
      const overlay = globalContainer?.querySelector(
        '#targetDrawerOverlay',
      ) as HTMLElement;
      if (overlay) {
        overlay.click();
      }
    });
  }
}
