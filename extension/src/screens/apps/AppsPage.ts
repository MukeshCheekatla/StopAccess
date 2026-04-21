import { loadAppsData } from '../../../../packages/viewmodels/src/useAppsVM';
import {
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
} from '@stopaccess/core';
import { setAppsDnsHardMode } from '@stopaccess/state';
import { getCategoryBadge, escapeHtml } from '@stopaccess/core';
import { toast } from '../../lib/toast';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { extensionAdapter } from '../../background/platformAdapter';
import { prefetchIconCache } from '../../lib/iconCache';

import {
  renderAppIcon,
  getRuleActiveState,
  UI_TOKENS,
  renderEmptyState,
  renderSectionBadge,
  renderAppTableRow,
  renderInfoTooltip,
  showConfirmDialog,
  attachGlobalIconListeners,
} from '../../lib/ui';
import {
  CATEGORY_COLORS,
  COLORS,
  DEFAULT_CATEGORY_COLOR,
} from '../../lib/designTokens';

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

  const vmData = await loadAppsData();
  const { isConfigured, rules } = vmData;
  currentIsConfigured = isConfigured;
  currentIsAppsDnsHardMode =
    (await extensionAdapter.getBoolean('fg_apps_dns_hard_mode')) ?? false;

  const currentRedirectUrl =
    (await extensionAdapter.getString('fg_redirect_url', '')) || '';
  const initialIsEditing = !currentRedirectUrl;
  const editIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';

  if (currentIsConfigured) {
    // Initial fetch in background, then re-render if needed
    loadNextDNSMetadata().then(() => {
      if (globalContainer) {
        refreshListOnly();
      }
    });
  }

  if (!container.querySelector('#__fg_apps_frame')) {
    container.innerHTML = `<style>
        .search-input-premium {
          width: 100%;
          height: 60px;
          font-size: 15px;
          border-radius: 12px;
          padding-left: 24px;
          padding-right: 100px;
          background: ${COLORS.surface} !important;
          border: 1px solid ${COLORS.border} !important;
          color: ${COLORS.text} !important;
          outline: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .search-input-premium:focus {
          background: ${COLORS.surfaceHover} !important;
        }
      </style>
      <div id="__fg_apps_frame" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
        <div class="search-bar" style="margin-bottom: 32px; display: flex; gap: 12px; align-items: stretch;">
          <div style="position: relative; flex: 1;">
            <input type="text" placeholder="Filter or Add Domain (e.g. ${
              UI_EXAMPLES.DOMAIN
            })" id="appSearch" value="${escapeHtml(
      searchTerm,
    )}" class="search-input-premium">
            <div id="searchBadge" style="position: absolute; right: 20px; top: 18px; ${
              UI_TOKENS.TEXT.BADGE
            } color: ${COLORS.muted}; background: ${
      COLORS.surfaceHover
    }; padding: 4px 10px; border-radius: 6px; border: 1px solid ${
      COLORS.border
    }; pointer-events: none; opacity: 0.8;">CTRL + F</div>
          </div>
          <div id="searchActionContainer"></div>
        </div>

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
              <div class="apps-layout-header">
                Redirect ${renderInfoTooltip(
                  'Set a target URL to automatically redirect users when they attempt to visit a blocked site.',
                )}
              </div>
              <input type="text" id="redirectInput" placeholder="e.g. notion.so" value="${escapeHtml(
                initialIsEditing
                  ? currentRedirectUrl
                  : currentRedirectUrl
                      .replace(/^https?:\/\//, '')
                      .replace(/\/$/, ''),
              )}" ${
      !initialIsEditing ? 'disabled' : ''
    } style="width: 100%; height: 42px; background: ${
      COLORS.glassBg
    }; border: 1px solid ${
      COLORS.glassBorder
    }; border-radius: 12px; padding: 0 14px; ${
      UI_TOKENS.TEXT.CARD_TITLE
    } margin-bottom: 12px; outline: none; transition: border-color 0.2s; opacity: ${
      initialIsEditing ? '1' : '0.8'
    };">
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button id="btnRedirectClear" style="height: 30px; ${
                UI_TOKENS.TEXT.SUBTEXT
              } background: ${COLORS.glassBg}; border: 1px solid ${
      COLORS.glassBorder
    }; border-radius: 8px; cursor: pointer; transition: all 0.2s; padding: 0 14px; visibility: ${
      initialIsEditing ? 'visible' : 'hidden'
    }; display: ${initialIsEditing ? 'block' : 'none'};">Clear</button>
              <button id="btnRedirectSave" class="${
                !initialIsEditing ? 'btn-premium' : ''
              }" style="${
      initialIsEditing ? 'flex: 1;' : 'width: auto; padding: 0 16px;'
    } height: 30px; ${UI_TOKENS.TEXT.BADGE} color: ${
      COLORS.inAppActiveText
    }; background: ${
      initialIsEditing ? COLORS.inAppActiveBg : COLORS.inAppActiveBg
    }; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; border: 1px solid ${
      COLORS.inAppActiveBorder
    };">
                ${initialIsEditing ? 'Save' : editIcon + ' &nbsp; Edit'}
              </button>
            </div>
          </div>

          <!-- DNS Hard Mode -->
          <div class="glass-card" style="padding: 20px;">
            <div class="apps-layout-header">
              Full Protection ${renderInfoTooltip(
                'Forces blocking at the network protocol layer via NextDNS, preventing browser-level bypasses.',
              )}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; background: ${
              COLORS.glassBg
            }; border: 1px solid ${
      COLORS.glassBorder
    }; border-radius: 12px; padding: 10px 14px;">
              <span style="${UI_TOKENS.TEXT.CARD_TITLE}">Hard Block</span>
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
    `;

    container.querySelector('#appSearch')?.addEventListener('input', (e) => {
      searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      refreshListOnly();
    });

    // Ensure search is focused on load
    setTimeout(() => {
      const input = container.querySelector('#appSearch') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 50);

    container
      .querySelector('#appSearch')
      ?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          const btnEl = container.querySelector(
            '#btnAddDomainUnified',
          ) as HTMLButtonElement;
          if (btnEl) {
            if (btnEl.hasAttribute('disabled')) {
              return;
            }
            e.preventDefault();
            handleAddDomain();
          }
        }
      });

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const searchInput = container.querySelector(
          '#appSearch',
        ) as HTMLInputElement;
        if (searchInput && document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
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
          const { checkGuard } = await import('../../background/sessionGuard');
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
            : 'Warning: DNS changes are not instant. Due to system and browser DNS caching, sites may remain blocked for several minutes even after turning this off. Clearing your browser cache or restarting may be required.',
          confirmLabel: targetState ? 'Enable Mode' : 'Disable Mode',
          isDestructive: !targetState,
        });

        if (!confirmed) {
          return;
        }

        currentIsAppsDnsHardMode = targetState;
        masterToggle.classList.toggle('active', targetState);

        await setAppsDnsHardMode(extensionAdapter, targetState);
        await appsController.reconcileAppsDnsMode(targetState, rules);

        chrome.runtime.sendMessage({ action: 'manualSync' });
        setTimeout(() => refreshListOnly(), 300);
      });
    }

    const redirectInput = container.querySelector(
      '#redirectInput',
    ) as HTMLInputElement;
    const btnRedirectClear = container.querySelector(
      '#btnRedirectClear',
    ) as HTMLElement;
    const btnRedirectSave = container.querySelector(
      '#btnRedirectSave',
    ) as HTMLElement;

    if (redirectInput) {
      const editIconArr =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
      let isEditing = initialIsEditing;

      const refreshUI = () => {
        if (isEditing) {
          redirectInput.disabled = false;
          redirectInput.style.opacity = '1';
          btnRedirectSave.innerHTML = 'Save';
          btnRedirectSave.style.background = COLORS.inAppActiveBg;
          btnRedirectSave.style.color = COLORS.inAppActiveText;
          btnRedirectSave.style.border = `1px solid ${COLORS.inAppActiveBorder}`;
          btnRedirectClear.style.visibility = 'visible';
          btnRedirectClear.style.pointerEvents = 'auto';
        } else {
          redirectInput.disabled = true;
          redirectInput.style.opacity = '0.8';
          btnRedirectSave.innerHTML = `${editIconArr} Edit`;
          btnRedirectSave.style.background = COLORS.inAppActiveBg;
          btnRedirectSave.style.color = COLORS.inAppActiveText;
          btnRedirectSave.style.border = `1px solid ${COLORS.inAppActiveBorder}`;
          btnRedirectClear.style.visibility = 'hidden';
          btnRedirectClear.style.pointerEvents = 'none';
        }
      };

      // No longer need extensionAdapter.getString here as we pre-fetched it
      // Initial value already set in HTML template
      refreshUI();

      btnRedirectSave.addEventListener('click', async () => {
        if (!isEditing) {
          isEditing = true;
          refreshUI();
          redirectInput.focus();
          return;
        }

        const val = redirectInput.value.trim();
        if (val) {
          await extensionAdapter.set('fg_redirect_url', val);
          toast.success('Redirect URL saved');
          isEditing = false;
          refreshUI();
        } else {
          await extensionAdapter.delete('fg_redirect_url');
          toast.success('Redirect removed');
          redirectInput.value = '';
          isEditing = true;
          refreshUI();
        }
      });

      btnRedirectClear.addEventListener('click', async () => {
        await extensionAdapter.delete('fg_redirect_url');
        redirectInput.value = '';
        toast.success('Redirect removed');
        isEditing = true;
        refreshUI();
      });
    }
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
          const isAppsActive = !!document.querySelector(
            '.nav-item[data-tab="apps"].active',
          );
          if (isAppsActive) {
            renderAppsPage(activeContainer);
          }
        }
      }
    };
    chrome.storage.onChanged.addListener((window as any).__appsStorageListener);
  }
}

async function loadNextDNSMetadata() {
  const vmData: any = await loadAppsData();
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
      const { rules } = await loadAppsData();
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

  const vmData = await loadAppsData();
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

  const actionContainer = globalContainer.querySelector(
    '#searchActionContainer',
  ) as HTMLElement;
  if (actionContainer) {
    const isInputValid = searchTerm.trim().length > 1;
    actionContainer.innerHTML = `
      <button id="btnAddDomainUnified" class="btn-premium" 
        ${
          !isInputValid
            ? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
            : ''
        }
        style="height: 60px; padding: 0 32px; border-radius: 12px; font-weight: 900; font-size: 13px; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${
          isInputValid ? COLORS.inAppActiveBg : COLORS.surface
        }; color: ${
      isInputValid ? COLORS.inAppActiveText : COLORS.text
    }; border: 1px solid ${
      isInputValid ? COLORS.inAppActiveBorder : COLORS.border
    };">
        Block
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    `;

    // Re-attach listener since we replaced innerHTML
    actionContainer
      .querySelector('#btnAddDomainUnified')
      ?.addEventListener('click', handleAddDomain);
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
      if (ruleList.innerHTML !== html) {
        ruleList.innerHTML = html;
        await setupHandlers(globalContainer, rulesToUse);
      }
    }

    attachGlobalIconListeners(globalContainer);
  }
}

async function handleAddDomain() {
  if (!globalContainer) {
    return;
  }
  const input = searchTerm.trim().toLowerCase();
  if (!input) {
    return;
  }

  const btn = globalContainer.querySelector(
    '#btnAddDomainUnified',
  ) as HTMLButtonElement;
  if (btn) {
    btn.innerText = 'Blocking...';
    btn.disabled = true;
  }

  const result = await appsController.addDomainRule(input);
  if (result.ok) {
    searchTerm = '';
    const searchInput = globalContainer.querySelector(
      '#appSearch',
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
    await refreshListOnly();
  } else if (btn) {
    btn.innerText = 'Failed';
    setTimeout(() => {
      btn.innerText = 'Add Rule';
      btn.disabled = false;
    }, 2000);
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

    return `
      <div style="display: flex; flex: 1; min-height: 0; flex-direction: column;">
      <!-- Centered App Discovery Drawer -->
      <div id="targetDrawerOverlay" class="fg-fixed fg-inset-0 fg-z-[1000] fg-transition-all fg-duration-300 fg-flex fg-items-center fg-justify-center" 
        style="display: none; background: ${
          COLORS.overlayStrong
        }; backdrop-filter: blur(12px);">
        
        <div id="targetDrawer" class="fg-relative fg-w-[680px] fg-max-h-[80vh] fg-bg-[${
          COLORS.surface
        }] fg-border fg-border-[${
      COLORS.glassBorder
    }] fg-rounded-[32px] fg-shadow-[0_32px_64px_var(--fg-shadow-strong)] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
          
          <!-- Header -->
          <div class="fg-px-8 fg-pt-8 fg-pb-6 fg-border-b fg-border-[${
            COLORS.glassBorder
          }]">
             <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
               <div>
                 <div class="fg-text-[10px] fg-font-bold fg-tracking-[0.2em] fg-text-[${
                   COLORS.blue
                 }] fg-mb-1 fg-uppercase">Catalog Discovery</div>
                 <div class="fg-text-xl fg-font-bold fg-tracking-tight fg-text-[${
                   COLORS.text
                 }]">Select Common Apps</div>
               </div>
               <button id="btnCloseTargetDrawer" class="fg-p-2 fg-rounded-xl hover:fg-bg-[${
                 COLORS.surfaceHover
               }] fg-text-[var(--muted)] fg-transition-all">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
               </button>
             </div>
             
             <!-- Interior Search Bar -->
             <div class="fg-relative">
               <input type="text" id="drawerSearch" placeholder="Find a service (e.g. Netflix, LinkedIn...)" 
                  class="fg-w-full fg-h-11 fg-bg-[${
                    COLORS.glassBg
                  }] fg-border fg-border-[${
      COLORS.glassBorder
    }] fg-rounded-xl fg-pl-11 fg-pr-4 fg-text-[13px] fg-text-[${
      COLORS.text
    }] fg-outline-none focus:fg-border-[${COLORS.blue}] fg-transition-all">
               <div class="fg-absolute fg-left-4 fg-top-3.5 fg-text-[var(--muted)]">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
               </div>
             </div>
          </div>

          <!-- Scrollable Grid -->
          <div id="drawerGrid" class="fg-flex-1 fg-overflow-y-auto fg-p-8 fg-grid fg-grid-cols-5 fg-gap-2">
            ${(() => {
              const drawerServices = NEXTDNS_SERVICES.filter(
                (s) =>
                  !rules.some(
                    (r: any) => (r.customDomain || r.packageName) === s.id,
                  ),
              );
              // Group by category
              const groups: Record<string, typeof drawerServices> = {};
              drawerServices.forEach((s) => {
                const cat = s.category || 'Other';
                if (!groups[cat]) {
                  groups[cat] = [];
                }
                groups[cat].push(s);
              });

              const order = [
                'Social',
                'Entertainment',
                'Gaming',
                'Productivity',
                'Lifestyle',
                'Other',
              ];
              const sortedCategories = Object.keys(groups).sort((a, b) => {
                const idxA = order.indexOf(a);
                const idxB = order.indexOf(b);
                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
              });

              return sortedCategories
                .map((category) => {
                  const items = groups[category];
                  return `
                  <div class="fg-col-span-5 ${
                    category === sortedCategories[0] ? '' : 'fg-mt-3'
                  } fg-mb-1 drawer-category-group" data-cat="${category}">
                    <div class="fg-text-[9px] fg-font-bold fg-tracking-[0.15em] fg-text-[${
                      COLORS.muted
                    }] fg-uppercase">${category}</div>
                  </div>
                  ${items
                    .map(
                      (s) => `
                    <button class="quick-add-service fg-p-3 fg-flex-col fg-items-center fg-flex fg-gap-2 fg-bg-[${
                      COLORS.glassBg
                    }] fg-border fg-border-[${
                        COLORS.glassBorder
                      }] fg-rounded-[18px] fg-cursor-pointer fg-text-[${
                        COLORS.text
                      }] fg-transition-all hover:fg-bg-[${
                        COLORS.surfaceHover
                      }] hover:fg-scale-[1.02] fg-group" data-id="${
                        s.id
                      }" data-name="${s.name}">
                      <div class="fg-scale-[0.8] fg-transition-transform group-hover:fg-scale-90">${renderAppIcon(
                        s.id,
                        s.name,
                      )}</div>
                      <div class="fg-text-[10px] fg-font-bold fg-tracking-tight fg-text-[${
                        COLORS.text
                      }] fg-truncate fg-w-full fg-text-center">${s.name}</div>
                    </button>`,
                    )
                    .join('')}
                `;
                })
                .join('');
            })()}
          </div>

          <!-- Footer -->
          <div class="fg-px-8 fg-py-4 fg-bg-[${
            COLORS.glassBg
          }] fg-border-t fg-border-[${
      COLORS.glassBorder
    }] fg-flex fg-justify-between fg-items-center">
            <div class="fg-text-[9px] fg-font-bold fg-text-[var(--muted)] fg-tracking-[0.1em] fg-uppercase">
              <span class="fg-text-[${COLORS.text}]">${
      NEXTDNS_SERVICES.length
    }</span> Available Services
            </div>
            <div class="fg-text-[9px] fg-font-bold fg-text-[var(--muted)] fg-tracking-[0.1em] fg-uppercase">
              Click Outside to Dismiss
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

      <div style="position: fixed; bottom: 32px; right: 32px; z-index: 100;">
        <button class="btn-premium fg-transition-transform hover:fg-scale-110 active:fg-scale-95" id="btnOpenTargetDrawer" style="width: 64px; height: 64px; font-size: 28px; display:flex; align-items:center; justify-content:center; border-radius: 12px; padding: 0; box-shadow: 0 10px 25px var(--fg-shadow-strong); cursor: pointer; background: ${
          COLORS.inAppActiveBg
        }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
      COLORS.inAppActiveBorder
    };">+</button>
      </div>
    `;
  }

  if (activeTab === 'categories') {
    const allCategories = NEXTDNS_CATEGORIES.map((std) => {
      const synced = availableCategories.find((ac: any) => ac.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });
    const visibleCategories = allCategories;
    const activeCount = visibleCategories.filter((c) => c.active).length;
    const disabledWarning = !currentIsConfigured
      ? `<div style="padding: 16px; border-radius: 12px; background: ${COLORS.amberSoft}; border: 1px solid ${COLORS.amberBorder}; margin-bottom: 24px; color: ${COLORS.amberText}; ${UI_TOKENS.TEXT.CARD_TITLE} display: flex; align-items: center; gap: 10px;">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
           DNS profile required to turn on categories.
         </div>`
      : '';

    return `
      ${disabledWarning}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid ${
        COLORS.glassBorder
      }; padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="${UI_TOKENS.TEXT.HEADING}">Add a Category</div>
            ${
              activeCount > 0 ? renderSectionBadge(`${activeCount} active`) : ''
            }
          </div>
          <div style="${
            UI_TOKENS.TEXT.SUBTEXT
          }; margin-top: 4px;">Profile-wide blocks for social, streaming, gambling, and more.</div>
        </div>
      </div>
      <div class="service-grid">
        ${visibleCategories
          .map((cat) => renderCategoryCard(cat, rules, lockedDomains, passes))
          .join('')}
      </div>
    `;
  }
  return '';
}

function renderCategoryCard(
  category: any,
  rules: any[],
  lockedDomains: string[] = [],
  passes: any = {},
) {
  const localRule = rules.find(
    (rule: any) => rule.packageName === category.id && rule.type === 'category',
  );
  // Prioritize NextDNS cloud state if local rule doesn't have a specific override,
  // or if local rule doesn't exist yet.
  const active =
    localRule !== undefined
      ? getRuleActiveState(localRule, passes)
      : category.active || false;
  const badge = getCategoryBadge(category);
  const isLocked = lockedDomains.includes(category.id.toLowerCase());

  const theme = CATEGORY_COLORS[category.id] || DEFAULT_CATEGORY_COLOR;

  const descMap: Record<string, { full: string; short: string }> = {
    porn: {
      full: 'Blocks adult and pornographic content. It includes escort sites, pornhub.com and similar domains.',
      short: 'Blocks adult and pornographic content.',
    },
    gambling: {
      full: 'Blocks gambling content.',
      short: 'Blocks gambling content.',
    },
    dating: {
      full: 'Blocks all dating websites & apps.',
      short: 'Blocks all dating websites & apps.',
    },
    piracy: {
      full: 'Blocks P2P websites, protocols, copyright-infringing streaming websites and generic video hosting websites used mainly for illegally distributing copyrighted content.',
      short: 'Blocks P2P and copyright-infringing sites.',
    },
    'social-networks': {
      full: 'Blocks all social networks sites and apps (Facebook, Instagram, TikTok, Reddit, etc.). Does not block messaging apps.',
      short: 'Blocks social networks and apps (FB, Instagram, TikTok, etc).',
    },
    games: {
      full: 'Blocks online gaming websites, online gaming apps and online gaming networks (Xbox Live, PlayStation Network, etc.).',
      short: 'Blocks online gaming apps and networks (Xbox, PSN, etc).',
    },
    'video-streaming': {
      full: 'Blocks video streaming services (YouTube, Netflix, Disney+, illegal streaming websites, video porn websites, etc.) and video-based social networks (TikTok, etc.). This can also help in reducing bandwidth usage on any network.',
      short: 'Blocks video services (YouTube, Netflix, TikTok, etc).',
    },
  };
  const categoryInfo = descMap[category.id] || {
    full: category.description || '',
    short: category.description || '',
  };

  return `
    <div class="service-card ${active ? 'active' : ''}" style="
      display:flex; flex-direction:column; gap: 0; height: auto; padding: 0; box-shadow: none; scroll-snap-align: start;
    ">
      <div style="display:flex; align-items:center; gap: 10px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 10px; min-width: 0; flex: 1;">
       <div style="width: 40px; height: 40px; border-radius: 12px; background: ${theme}15; color: ${theme}; border: 1px solid ${theme}25; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
         ${badge}
       </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
              <div style="display: flex; align-items: center; gap: 0;">
                <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${
                  UI_TOKENS.TEXT.CARD_TITLE
                }">${escapeHtml(category.name)}</div>
                ${renderInfoTooltip(categoryInfo.full, 'up', 'left')}
              </div>
              <div style="${
                UI_TOKENS.TEXT.SUBTEXT
              } line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px;">${escapeHtml(
    categoryInfo.short,
  )}</div>
              ${'' /* Blocked badge removed for cleaner UI */}
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked || !currentIsConfigured ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}"
  aria-checked="${active}" role="switch">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          ${
            isLocked
              ? `<div style="${UI_TOKENS.TEXT.BADGE} opacity:0.5;">Lock</div>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

async function setupHandlers(container: HTMLElement, rules: any[]) {
  const overlay = container.querySelector(
    '#targetDrawerOverlay',
  ) as HTMLElement;
  const drawer = container.querySelector('#targetDrawer') as HTMLElement;
  const openBtn = container.querySelector('#btnOpenTargetDrawer');
  const closeBtn = container.querySelector('#btnCloseTargetDrawer');
  const addBtn = container.querySelector('#btnAddDomainUnified');

  if (addBtn) {
    addBtn.addEventListener('click', handleAddDomain);
  }

  const openDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    overlay.style.display = 'flex';
    setTimeout(() => {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }, 10);
  };

  const closeDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    drawer.style.opacity = '0';
    drawer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  };

  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);

  const drawerSearch = container.querySelector(
    '#drawerSearch',
  ) as HTMLInputElement;
  const serviceItems = Array.from(
    container.querySelectorAll('.quick-add-service'),
  ) as HTMLElement[];
  const categoryGroups = Array.from(
    container.querySelectorAll('.drawer-category-group'),
  ) as HTMLElement[];

  drawerSearch?.addEventListener('input', (e) => {
    const term = (e.target as HTMLInputElement).value.toLowerCase();

    // 1. Toggle item visibility
    serviceItems.forEach((item) => {
      const name = (item.getAttribute('data-name') || '').toLowerCase();
      const id = (item.getAttribute('data-id') || '').toLowerCase();
      const isMatch = name.includes(term) || id.includes(term);
      item.style.display = isMatch ? 'flex' : 'none';
    });

    // 2. Hide category headers if no items are visible in that group
    categoryGroups.forEach((group) => {
      const cat = group.getAttribute('data-cat');
      const hasVisible = serviceItems.some((item) => {
        const itemCat =
          NEXTDNS_SERVICES.find((s) => s.id === item.getAttribute('data-id'))
            ?.category || 'Other';
        return itemCat === cat && item.style.display !== 'none';
      });
      group.style.display = hasVisible ? 'flex' : 'none';
    });
  });

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && overlay?.style.display === 'flex') {
      closeDrawer();
    }
  };
  window.addEventListener('keydown', handleEsc);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDrawer();
    }
  });

  container.querySelectorAll('.quick-add-service').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      if (id && name) {
        await appsController.toggleRule('service', id, name, true, rules);
        await refreshListOnly();
      }
    });
  });

  container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const btnEl = btn as HTMLElement;
      const kind = btnEl.getAttribute('data-kind');
      const id =
        btnEl.getAttribute('data-id') || btnEl.getAttribute('data-pkg');
      const activeStateStr = btnEl.getAttribute('aria-checked');
      const wasActive =
        activeStateStr !== null
          ? activeStateStr === 'true'
          : btnEl.classList.contains('active');

      const targetState = !wasActive;
      const name = btnEl.getAttribute('data-name') || id;

      if (!kind || !id) {
        return;
      }

      btnEl.classList.toggle('active', targetState);
      btnEl.setAttribute('aria-checked', String(targetState));
      btnEl.style.opacity = '0.5';

      const performAction = async () => {
        try {
          const result = await appsController.toggleRule(
            kind,
            id,
            name || id,
            targetState,
            rules,
          );
          if (result.ok) {
            btnEl.style.opacity = '1';
            const action = targetState ? 'blocked' : 'allowed';
            toast.success(`${name || id} ${kind} is now ${action}`);
          } else {
            btnEl.classList.toggle('active', wasActive);
            btnEl.setAttribute('aria-checked', String(wasActive));
            btnEl.style.opacity = '1';
          }
        } catch (err: any) {
          toast.error(`Sync Error: ${err.message}`);
          btnEl.classList.toggle('active', wasActive);
          btnEl.style.opacity = '1';
        }
      };

      // Unified Guard for unblocking
      if (!targetState) {
        btnEl.classList.toggle('active', wasActive); // Revert UI until challenged
        btnEl.style.opacity = '1';

        const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Unlock Block',
          body: `Verify your security to unblock ${name || id}.`,
        });

        if (confirmed) {
          await performAction();
        }
        return;
      }

      await performAction();
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      if (pkg) {
        const row = btn.closest('.rule-table-row') as HTMLElement;
        const performRemoval = async () => {
          if (row) {
            row.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            row.style.opacity = '0';
            row.style.transform = 'scale(0.95) translateX(-10px)';
            row.style.pointerEvents = 'none';

            // Smoothly collapse height
            const height = row.offsetHeight;
            row.style.height = height + 'px';
            requestAnimationFrame(() => {
              row.style.height = '0px';
              row.style.paddingTop = '0px';
              row.style.paddingBottom = '0px';
              row.style.borderBottomWidth = '0px';
              row.style.marginTop = '0px';
              row.style.marginBottom = '0px';
            });
          }

          // Run background removal quietly
          const result = await appsController.removeRule(pkg, rules);
          if (!result.ok && row) {
            // Restore if failed
            row.style.height = '';
            row.style.paddingTop = '';
            row.style.paddingBottom = '';
            row.style.opacity = '1';
            row.style.transform = '';
            row.style.pointerEvents = '';
          }
        };

        const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Delete Rule?',
          body: 'Verify your security to remove this block permanently.',
          isDestructive: true,
        });

        if (confirmed) {
          await performRemoval();
        }
      }
    });
  });

  // Custom Select Global Interaction
  container.querySelectorAll('.fg-select-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = trigger.nextElementSibling as HTMLElement;
      const wasActive = menu.classList.contains('active');
      const parentRow = trigger.closest(
        '.service-card, .rule-table-row',
      ) as HTMLElement;
      const scrollParent = trigger.closest(
        '.rule-table-body-scroll',
      ) as HTMLElement;

      // Close all other menus and reset their parents
      document.querySelectorAll('.fg-select-menu.active').forEach((m) => {
        if (m !== menu) {
          m.classList.remove('active');
          const otherParent = m.closest(
            '.service-card, .rule-table-row',
          ) as HTMLElement;
          if (otherParent) {
            otherParent.style.zIndex = '1';
          }
        }
      });

      const nextActive = !wasActive;
      menu.classList.toggle('active', nextActive);
      if (parentRow) {
        parentRow.style.zIndex = nextActive ? '1000' : '1';
      }

      if (nextActive) {
        // Reset custom positioning to calculate natural drop
        menu.style.top = 'calc(100% + 6px)';
        menu.style.bottom = 'auto';
        menu.style.transformOrigin = 'top';

        // Delay 1 frame to let it render its height
        requestAnimationFrame(() => {
          const rect = menu.getBoundingClientRect();
          const containerRect = scrollParent
            ? scrollParent.getBoundingClientRect()
            : null;

          const hitBottom = containerRect
            ? rect.bottom > containerRect.bottom - 10
            : rect.bottom > window.innerHeight - 20;

          const spaceAbove = containerRect
            ? rect.top - containerRect.top
            : rect.top;

          // Only flip UP if we hit bottom AND there is more space above than below
          if (hitBottom && spaceAbove > 150) {
            // Flip it to open upwards
            menu.style.top = 'auto';
            menu.style.bottom = 'calc(100% + 6px)';
            menu.style.transformOrigin = 'bottom';
          }
        });
      }
    });
  });

  document.addEventListener(
    'click',
    () => {
      document.querySelectorAll('.fg-select-menu.active').forEach((m) => {
        m.classList.remove('active');
        const parentRow = m.closest(
          '.service-card, .rule-table-row',
        ) as HTMLElement;
        if (parentRow) {
          parentRow.style.zIndex = '1';
        }
      });
    },
    { once: false },
  );

  container.querySelectorAll('.fg-select-option').forEach((option) => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      const parent = option.closest('.fg-custom-select') as HTMLElement;
      const pkg = parent.getAttribute('data-pkg');
      const val = parseInt(
        (option as HTMLElement).getAttribute('data-value') || '0',
        10,
      );
      const isLimitSelect = parent.classList.contains('edit-limit-select');
      const isPassSelect = parent.classList.contains('edit-pass-select');

      const menu = parent.querySelector('.fg-select-menu');
      menu?.classList.remove('active');

      const rule = rules.find(
        (r: any) => (r.customDomain || r.packageName) === pkg,
      );
      if (!rule || !pkg) {
        return;
      }

      const { checkGuard } = await import('../../background/sessionGuard');
      const guard = await checkGuard('modify_blocklist');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      if (isLimitSelect) {
        // If the toggle is OFF, keep mode as 'allow' — don't activate limit tracking
        const isEnabled =
          rule.desiredBlockingState !== false && rule.mode !== 'allow';
        const newMode = !isEnabled ? 'allow' : val > 0 ? 'limit' : 'block';
        const isIncreasingLimit = val > (rule.dailyLimitMinutes || 0);

        if (isIncreasingLimit) {
          const { confirmGuardianAction } = (await import(
            '../../lib/ui'
          )) as any;
          const confirmed = await confirmGuardianAction({
            title: 'Increase Allowance?',
            body: `Verify your security to increase allowed time for ${
              rule.appName || pkg
            }.`,
          });
          if (!confirmed) {
            return;
          }
        }

        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@stopaccess/state/rules');
        const used = rule.usedMinutesToday || 0;
        const isNowBlocked =
          newMode === 'block' || (newMode === 'limit' && used >= val);

        await updateRule(storage, {
          ...(rule as any),
          dailyLimitMinutes: val,
          mode: newMode as any,
          streakDays: isIncreasingLimit ? 0 : rule.streakDays,
          streakStartedAt: isIncreasingLimit
            ? Date.now()
            : rule.streakStartedAt,
          blockedToday: isNowBlocked,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(`Usage limit updated: ${(option as HTMLElement).innerText}`);
        await refreshListOnly();
      } else if (isPassSelect) {
        const currentPasses =
          rule.maxDailyPasses !== undefined ? rule.maxDailyPasses : 3;
        const isIncreasingPasses = val > currentPasses;

        if (isIncreasingPasses) {
          const { confirmGuardianAction } = (await import(
            '../../lib/ui'
          )) as any;
          const confirmed = await confirmGuardianAction({
            title: 'Increase Passes?',
            body: `Verify your security to allow more pauses for ${
              rule.appName || pkg
            }.`,
          });
          if (!confirmed) {
            return;
          }
        }

        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@stopaccess/state/rules');
        await updateRule(storage, {
          ...(rule as any),
          maxDailyPasses: val,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(`Daily pass count updated to ${val}`);
        await refreshListOnly();
      }
    });
  });
}
