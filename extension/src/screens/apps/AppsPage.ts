import { loadAppsData } from '@stopaccess/viewmodels/useAppsVM';
import { UI_EXAMPLES, NEXTDNS_SERVICES } from '@stopaccess/core';
import { setAppsDnsHardMode } from '@stopaccess/state';
import { escapeHtml } from '@stopaccess/core';
import { renderCategoriesTab } from './components/CategoriesTab';
import { setupHandlers } from './AppsEventHandlers';
import { toast } from '@/ui/toast';
import { appsController } from '@/lib/appsController';
import { getLockedDomains } from '@/background/sessionGuard';
import { extensionAdapter } from '@/background/platformAdapter';
import { prefetchIconCache } from '@/lib/iconCache';

import {
  renderAppIcon,
  UI_TOKENS,
  UI_ICONS,
  renderEmptyState,
  renderAppTableRow,
  renderInfoTooltip,
  showConfirmDialog,
  attachGlobalIconListeners,
} from '@/ui/ui';
import { COLORS } from '@/ui/theme/designTokens';
import { ICONS } from '@/ui/Icons';

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
  const initialIsEditing = !currentRedirectUrl;
  const editIcon = UI_ICONS.EDIT.replace(
    'style="',
    'style="margin-right: 6px; ',
  );

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
              <input type="text" id="redirectInput" placeholder="e.g. instagram.com" value="${escapeHtml(
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
      const editIconArr = ICONS.EDIT.replace(
        '<svg ',
        '<svg style="margin-right: 6px;" ',
      );
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
        ${UI_ICONS.PLUS.replace('width="14"', 'width="16"').replace(
          'height="14"',
          'height="16"',
        )}
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
        await setupHandlers(globalContainer, rulesToUse, {
          refreshListOnly,
          handleAddDomain,
        });
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
    }] fg-rounded-[32px] fg-shadow-[0_32px_64px_${
      COLORS.shadowStrong
    }] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
          
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
                 ${UI_ICONS.CLOSE.replace('width="14"', 'width="20"').replace(
                   'height="14"',
                   'height="20"',
                 )}
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
                 ${UI_ICONS.SEARCH}
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

      <div style="position: fixed; bottom: 32px; right: 32px; z-index: 100;">
        <button class="btn-premium fg-transition-transform hover:fg-scale-110 active:fg-scale-95" id="btnOpenTargetDrawer" style="width: 64px; height: 64px; font-size: 28px; display:flex; align-items:center; justify-content:center; border-radius: 12px; padding: 0; box-shadow: 0 10px 25px ${
          COLORS.shadowStrong
        }; cursor: pointer; background: ${COLORS.inAppActiveBg}; color: ${
      COLORS.inAppActiveText
    }; border: 1px solid ${COLORS.inAppActiveBorder};">+</button>
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
