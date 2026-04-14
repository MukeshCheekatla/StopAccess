import { loadAppsData } from '../../../../packages/viewmodels/src/useAppsVM';
import {
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
} from '@stopaccess/core';
import { getCategoryBadge, escapeHtml } from '@stopaccess/core';
import { toast } from '../../lib/toast';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { extensionAdapter } from '../../background/platformAdapter';
import { getCachedIcon, saveIconToCache } from '../../lib/iconCache';
import {
  renderAppIcon,
  getRuleActiveState,
  UI_TOKENS,
  renderLoader,
  renderEmptyState,
  renderSectionBadge,
  renderAppTableRow,
  renderInfoTooltip,
} from '../../lib/ui';

let activeTab = 'shield';
let availableServices: any[] = [];
let availableCategories: any[] = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let globalContainer: HTMLElement | null = null;
let currentIsConfigured = false;
let currentIsAppsDnsHardMode = true;

// Externalized UI functions and tokens imported above

export async function renderAppsPage(container: HTMLElement) {
  globalContainer = container;
  const vmData: any = await loadAppsData();
  const { isConfigured, rules } = vmData;
  currentIsConfigured = isConfigured;
  currentIsAppsDnsHardMode =
    (await extensionAdapter.getBoolean('fg_apps_dns_hard_mode')) ?? false;

  if (currentIsConfigured) {
    await loadNextDNSMetadata();
  }

  if (!container.querySelector('.search-bar')) {
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 32px; display: flex; gap: 12px; align-items: stretch;">
        <div style="position: relative; flex: 1;">
          <input type="text" placeholder="Filter or Add Domain (e.g. ${
            UI_EXAMPLES.DOMAIN
          })" id="appSearch" value="${escapeHtml(
      searchTerm,
    )}" class="input-premium" style="width:100%; height:60px; font-size:15px; border-radius:20px; padding-left: 24px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text); box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);">
          <div id="searchBadge" style="position: absolute; right: 20px; top: 20px; font-size: 12px; font-weight: 800; color: var(--muted); background: rgba(255,255,255,0.03); padding: 5px 10px; border-radius: 8px; border: 1px solid var(--glass-border); pointer-events: none;">CTRL + F</div>
        </div>
        <div id="searchActionContainer"></div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px;">
        <div style="display: flex; align-items: center; gap: 24px; position: relative;">
          <div id="appsNavigation" style="display: flex; padding: 4px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 14px; width: fit-content; min-width: 200px;">
            <button class="nav-item-tab" data-tab="shield">Blocklist</button>
            <button class="nav-item-tab" data-tab="categories">Categories</button>
          </div>

          <button id="btnSetRedirect" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 14px; font-size: 11px; font-weight: 800; color: var(--fg-muted);  letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--fg-surface-hover)'; this.style.color='var(--fg-text)';" onmouseout="this.style.background='var(--fg-glass-bg)'; this.style.color='var(--fg-muted)';">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Redirect
            ${renderInfoTooltip(
              'Set a target URL to automatically redirect users when they attempt to visit a blocked site.',
            )}
          </button>
          
          <div id="redirectPopover" class="fg-opacity-0 fg-pointer-events-none fg-scale-95 fg-transition-all" style="position: absolute; top: calc(100% + 8px); left: 240px; z-index: 100; background: var(--fg-surface); border: 1px solid var(--fg-glass-border); border-radius: 16px; padding: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); width: 280px; transform-origin: top;">
             <div style="font-size: 11px; font-weight: 800; color: var(--fg-muted);  margin-bottom: 8px;">Productive Redirect</div>
             <input type="text" id="redirectInput" placeholder="e.g. notion.so" style="width: 100%; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--fg-text); margin-bottom: 12px; outline: none;">
             <div style="display: flex; gap: 8px; justify-content: flex-end;">
               <button id="btnRedirectClear" style="font-size: 11px; font-weight: 800; color: var(--fg-muted); padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--fg-surface-hover)';" onmouseout="this.style.background='transparent';">Clear</button>
               <button id="btnRedirectSave" style="font-size: 11px; font-weight: 800; color: white; background: var(--fg-accent); padding: 6px 12px; border-radius: 6px; cursor: pointer;">Save</button>
             </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 14px;" title="Block apps and domains at the router level via NextDNS.">
          <div style="font-size: 11px; font-weight: 800; color: var(--fg-muted);  letter-spacing: 0.5px;">Dns Hard Mode</div>
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

      <div id="tabContent"></div>
    `;

    container.querySelector('#appSearch')?.addEventListener('input', (e) => {
      searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      refreshListOnly();
    });

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
        currentIsAppsDnsHardMode = targetState;

        masterToggle.classList.toggle('active', targetState);

        await extensionAdapter.set('fg_apps_dns_hard_mode', targetState);
        await appsController.reconcileAppsDnsMode(targetState, rules);

        chrome.runtime.sendMessage({ action: 'manualSync' });
        setTimeout(() => refreshListOnly(), 300);
      });
    }

    const btnSetRedirect = container.querySelector(
      '#btnSetRedirect',
    ) as HTMLElement;
    const redirectPopover = container.querySelector(
      '#redirectPopover',
    ) as HTMLElement;
    const redirectInput = container.querySelector(
      '#redirectInput',
    ) as HTMLInputElement;
    const btnRedirectClear = container.querySelector(
      '#btnRedirectClear',
    ) as HTMLElement;
    const btnRedirectSave = container.querySelector(
      '#btnRedirectSave',
    ) as HTMLElement;

    if (btnSetRedirect && redirectPopover) {
      btnSetRedirect.addEventListener('click', async (e) => {
        e.stopPropagation();
        const currentUrl = await extensionAdapter.getString(
          'fg_redirect_url',
          '',
        );
        redirectInput.value = currentUrl || '';

        const isShowing = redirectPopover.classList.contains('fg-opacity-100');
        if (isShowing) {
          redirectPopover.classList.remove(
            'fg-opacity-100',
            'fg-pointer-events-auto',
            'fg-scale-100',
          );
          redirectPopover.classList.add(
            'fg-opacity-0',
            'fg-pointer-events-none',
            'fg-scale-95',
          );
        } else {
          redirectPopover.classList.add(
            'fg-opacity-100',
            'fg-pointer-events-auto',
            'fg-scale-100',
          );
          redirectPopover.classList.remove(
            'fg-opacity-0',
            'fg-pointer-events-none',
            'fg-scale-95',
          );
          redirectInput.focus();
        }
      });

      document.addEventListener('click', (e) => {
        if (
          !redirectPopover.contains(e.target as Node) &&
          e.target !== btnSetRedirect
        ) {
          redirectPopover.classList.remove(
            'fg-opacity-100',
            'fg-pointer-events-auto',
            'fg-scale-100',
          );
          redirectPopover.classList.add(
            'fg-opacity-0',
            'fg-pointer-events-none',
            'fg-scale-95',
          );
        }
      });

      btnRedirectSave.addEventListener('click', async () => {
        const val = redirectInput.value.trim();
        if (val) {
          await extensionAdapter.set('fg_redirect_url', val);
          toast.success('Redirect URL saved');
        } else {
          await extensionAdapter.delete('fg_redirect_url');
          toast.success('Redirect removed');
        }
        redirectPopover.classList.remove(
          'fg-opacity-100',
          'fg-pointer-events-auto',
          'fg-scale-100',
        );
        redirectPopover.classList.add(
          'fg-opacity-0',
          'fg-pointer-events-none',
          'fg-scale-95',
        );
      });

      btnRedirectClear.addEventListener('click', async () => {
        await extensionAdapter.delete('fg_redirect_url');
        redirectInput.value = '';
        toast.success('Redirect removed');
        redirectPopover.classList.remove(
          'fg-opacity-100',
          'fg-pointer-events-auto',
          'fg-scale-100',
        );
        redirectPopover.classList.add(
          'fg-opacity-0',
          'fg-pointer-events-none',
          'fg-scale-95',
        );
      });
    }
  }

  await refreshListOnly(rules);
}

async function loadNextDNSMetadata() {
  const vmData: any = await loadAppsData();
  const { isConfigured } = vmData;
  if (!isConfigured) {
    return;
  }

  isLoadingNextDNS = true;
  try {
    const metadata: any = await appsController.loadMetadata();
    availableServices = metadata.services || [];
    availableCategories = metadata.categories || [];
    (window as any).availableDenylist = metadata.denylist || [];
  } catch (err) {
    console.error('[StopAccess] Metadata Sync Fail:', err);
  } finally {
    isLoadingNextDNS = false;
  }
}

async function refreshListOnly(passedRules?: any[]) {
  if (!globalContainer) {
    return;
  }

  const vmData: any = await loadAppsData();
  const { rules } = vmData;
  const rulesToUse = passedRules || rules;
  const lockedDomains = await getLockedDomains();
  const tabContent = globalContainer.querySelector(
    '#tabContent',
  ) as HTMLElement;
  const searchBadge = globalContainer.querySelector(
    '#searchBadge',
  ) as HTMLElement;

  if (tabContent && isLoadingNextDNS && availableServices.length === 0) {
    tabContent.innerHTML = renderLoader('Syncing with NextDNS...');
  }

  globalContainer.querySelectorAll('.nav-item-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
  });

  if (searchBadge) {
    searchBadge.style.opacity = searchTerm ? '0' : '1';
  }

  const actionContainer = globalContainer.querySelector(
    '#searchActionContainer',
  ) as HTMLElement;
  if (actionContainer) {
    if (searchTerm.trim().length > 1) {
      actionContainer.innerHTML = `
        <button id="btnAddDomainUnified" class="btn-premium" style="height: 60px; padding: 0 32px; border-radius: 20px; font-weight: 900; font-size: 13px; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 10px 20px rgba(59,130,246,0.2);">
          Block
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      `;
    } else {
      actionContainer.innerHTML = '';
    }
  }

  if (tabContent) {
    if (!tabContent.querySelector('#tabRuleList')) {
      tabContent.innerHTML =
        '<div id="tabRuleList" style="animation: fadeIn 0.3s ease;"></div>';
    }

    const ruleList = tabContent.querySelector('#tabRuleList');
    if (ruleList) {
      const html = await renderSubTab(rulesToUse, lockedDomains);
      if (ruleList.innerHTML !== html) {
        ruleList.innerHTML = html;
        await setupHandlers(globalContainer, rulesToUse);
      }
    }

    wireBrandLogoFallbacks(globalContainer);
  }
}

function wireBrandLogoFallbacks(container: HTMLElement) {
  container
    .querySelectorAll('.insights-logo-container')
    .forEach(async (wrapper) => {
      const img = wrapper.querySelector('img');
      const fallback = wrapper.querySelector('.logo-fallback') as HTMLElement;
      if (!img || !fallback || img.dataset.fgBound === 'true') {
        return;
      }

      img.dataset.fgBound = 'true';
      const domain = (wrapper as HTMLElement).dataset.domain || '';

      // 1. Instant load from cache if available
      if (domain) {
        const cached = await getCachedIcon(domain);
        if (cached) {
          img.src = cached;
          img.style.opacity = '1';
          fallback.style.opacity = '0';
        }
      }

      img.addEventListener('load', () => {
        if (img.naturalWidth > 1) {
          img.style.opacity = '1';
          fallback.style.opacity = '0';
          if (domain) {
            saveIconToCache(domain, img.src);
          }
        } else {
          img.dispatchEvent(new Event('error'));
        }
      });

      img.addEventListener('error', () => {
        const currentUrl = img.src;
        if (currentUrl.includes('logo.clearbit.com') && domain) {
          img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
            domain,
          )}&sz=128`;
        } else {
          img.style.display = 'none';
          fallback.style.opacity = '1';
        }
      });

      // Handle cached images that are already complete
      if (img.complete && img.naturalHeight > 1) {
        img.style.opacity = '1';
        fallback.style.opacity = '0';
      }
    });
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
      <!-- Centered App Discovery Drawer -->
      <div id="targetDrawerOverlay" class="fg-fixed fg-inset-0 fg-z-[1000] fg-transition-all fg-duration-300 fg-flex fg-items-center fg-justify-center" 
        style="display: none; background: rgba(5,5,10,0.85); backdrop-filter: blur(12px);">
        
        <div id="targetDrawer" class="fg-relative fg-w-[720px] fg-max-h-[85vh] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-shadow-[0_32px_64px_rgba(0,0,0,0.5)] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
          
          <!-- Header -->
          <div class="fg-p-8 fg-border-b fg-border-[var(--fg-glass-border)] fg-flex fg-items-center fg-justify-between">
            <div>
              <div class="fg-text-[10px] fg-font-black  fg-tracking-[3px] fg-text-[#3b82f6] fg-mb-1">App Drawer</div>
              <div class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">Add Apps to Shield</div>
            </div>
            <button id="btnCloseTargetDrawer" class="fg-p-3 fg-rounded-2xl hover:fg-bg-[var(--fg-surface-hover)] fg-text-[var(--muted)] fg-transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Scrollable Grid -->
          <div class="fg-flex-1 fg-overflow-y-auto fg-p-8 fg-grid fg-grid-cols-4 fg-gap-3">
            ${NEXTDNS_SERVICES.filter(
              (s) =>
                !rules.some(
                  (r: any) => (r.customDomain || r.packageName) === s.id,
                ),
            )
              .map(
                (s) => `
                <button class="quick-add-service fg-p-5 fg-flex-col fg-items-center fg-flex fg-gap-3 fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-cursor-pointer fg-text-[var(--fg-text)] fg-transition-all hover:fg-bg-[var(--fg-surface-hover)] hover:fg-scale-[1.02] hover:fg-border-[var(--fg-glass-border)] fg-group" data-id="${
                  s.id
                }" data-name="${s.name}">
                  <div class="fg-transition-transform group-hover:fg-scale-110">${renderAppIcon(
                    s.id,
                    s.name,
                  )}</div>
                  <div class="fg-text-[11px] fg-font-black fg-text-[var(--fg-text)] fg-truncate fg-w-full fg-text-center">${
                    s.name
                  }</div>
                </button>`,
              )
              .join('')}
          </div>

          <!-- Footer -->
          <div class="fg-px-8 fg-py-5 fg-bg-[var(--fg-glass-bg)] fg-border-t fg-border-[var(--fg-glass-border)] fg-flex fg-justify-between fg-items-center">
            <div class="fg-text-[10px] fg-font-bold fg-text-[var(--muted)]  fg-tracking-widest">
              Total Catalog: <span class="fg-text-[var(--fg-text)]">${
                NEXTDNS_SERVICES.length
              } Services</span>
            </div>
            <div class="fg-text-[10px] fg-font-bold fg-text-[var(--muted)]  fg-tracking-widest">
              Press ESC to Close
            </div>
          </div>
        </div>
      </div>

      <div class="rule-table-header" style="
        display: grid; 
        grid-template-columns: 44px 1.5fr 100px 1fr 140px 110px 80px 44px;
        column-gap: 12px;
        align-items: center;
        padding: 10px 16px;
        background: var(--fg-glass-bg);
        border: 1px solid var(--fg-glass-border);
        border-radius: 12px;
        margin-bottom: 6px;
        position: sticky;
        top: 0;
        z-index: 10;
        backdrop-filter: blur(8px);
        font-size: 14px;
        font-weight: 600;
        color: var(--fg-text);
        letter-spacing: 0.06em;
        
      ">
        <div></div>
        <div>Platform</div>
        <div>Usage</div>
        <div>Progress</div>
        <div style="display: flex; align-items: center; gap: 4px;">Daily Limit ${renderInfoTooltip(
          'The maximum time allowed per day before a service or domain is automatically blocked.',
        )}</div>
        <div style="display: flex; align-items: center; gap: 4px;">Passes ${renderInfoTooltip(
          'The number of temporary access tokens available daily to unblock restricted items.',
        )}</div>
        <div></div>
        <div></div>
      </div>

      <!-- Combined Rules Table -->
      <div class="glass-card" style="padding: 0; overflow: visible; border-radius: 16px; margin-bottom: 40px;">
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
                const isLocked = lockedDomains.includes(rule.packageName);
                return renderAppTableRow(rule, isLocked, passes);
              })
              .join('');
          }

          // Separator for Domains
          if (domainRules.length > 0) {
            if (appRules.length > 0) {
              html += `
                <div style="padding: 6px 16px 6px 72px; border-top: 1px solid var(--fg-glass-border); border-bottom: 1px solid var(--fg-glass-border); background: var(--fg-glass-bg); display: flex; align-items: center; gap: 8px;">
                  <div style="font-size: 10px; font-weight: 700; color: var(--fg-muted);  letter-spacing: 0.1em;">Custom Domains</div>
                </div>
              `;
            }
            html += domainRules
              .map((rule) => {
                const isLocked = lockedDomains.includes(rule.packageName);
                return renderAppTableRow(rule, isLocked, passes);
              })
              .join('');
          }

          return html;
        })()}
      </div>

      <div style="position: fixed; bottom: 32px; right: 32px; z-index: 100;">
        <button class="btn-premium" id="btnOpenTargetDrawer" style="width: 64px; height: 64px; font-size: 28px; display:flex; align-items:center; justify-content:center; border-radius: 20px; padding: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">+</button>
      </div>
    `;
  }

  if (activeTab === 'categories') {
    const allCategories = NEXTDNS_CATEGORIES.map((std) => {
      const synced = availableCategories.find((ac: any) => ac.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });
    const visibleCategories = allCategories.filter(matchesSearch);
    const activeCount = visibleCategories.filter((c) => c.active).length;
    const disabledWarning = !currentIsConfigured
      ? `<div style="padding: 16px; border-radius: 12px; background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.2); margin-bottom: 24px; color: #ffeb3b; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 10px;">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
           DNS profile required to turn on categories.
         </div>`
      : '';

    return `
      ${disabledWarning}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid var(--fg-glass-border); padding-bottom: 16px;">
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
  const active =
    localRule !== undefined ? getRuleActiveState(localRule, passes) : false;
  const badge = getCategoryBadge(category);
  const isLocked = lockedDomains.includes(category.id);

  const themeMap: any = {
    social: '#6366f1',
    video: '#f43f5e',
    gambling: '#f59e0b',
    gaming: '#10b981',
    dating: '#ec4899',
    news: '#06b6d4',
    shopping: '#8b5cf6',
    crypto: '#facc15',
    porn: '#7c3aed',
    piracy: '#4b5563',
  };
  const theme = themeMap[category.id] || '#64748b';

  return `
    <div class="service-card ${active ? 'active' : ''}" style="
      display:flex; flex-direction:column; gap: 0; height: auto; padding: 0;
      ${
        active
          ? 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
          : 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
      }
    ">
      <div style="display:flex; align-items:center; gap: 10px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 10px; min-width: 0; flex: 1;">
       <div style="width: 40px; height: 40px; border-radius: 12px; background: ${theme}15; color: ${theme}; border: 1px solid ${theme}25; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
         ${badge}
       </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
              <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${
                UI_TOKENS.TEXT.CARD_TITLE
              }">${escapeHtml(category.name)}</div>
              <div style="${
                UI_TOKENS.TEXT.SUBTEXT
              } line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px;">${escapeHtml(
    category.description || '',
  )}</div>
              ${
                active
                  ? `<div style="margin-top: 8px;"><span style="${UI_TOKENS.TEXT.BADGE} color: var(--red);">Blocked</span></div>`
                  : ''
              }
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked || !currentIsConfigured ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          ${
            isLocked
              ? '<div style="font-size:10px; opacity:0.5; font-weight:800; letter-spacing:0.6px;">Lock</div>'
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
      const wasActive = btnEl.classList.contains('active');
      const targetState = !wasActive;
      const name = btnEl.getAttribute('data-name') || id;

      if (!kind || !id) {
        return;
      }

      btnEl.classList.toggle('active', targetState);
      btnEl.style.opacity = '0.5';

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
        } else {
          btnEl.classList.toggle('active', wasActive);
          btnEl.style.opacity = '1';
        }
      } catch (err: any) {
        toast.error(`Sync Error: ${err.message}`);
        btnEl.classList.toggle('active', wasActive);
        btnEl.style.opacity = '1';
      }
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      if (pkg) {
        const result = await appsController.removeRule(pkg, rules);
        if (result.ok) {
          await refreshListOnly();
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
      const card = trigger.closest('.service-card') as HTMLElement;

      // Close all other menus and reset their cards
      document.querySelectorAll('.fg-select-menu.active').forEach((m) => {
        if (m !== menu) {
          m.classList.remove('active');
          const otherCard = m.closest('.service-card') as HTMLElement;
          if (otherCard) {
            otherCard.style.zIndex = '1';
          }
        }
      });

      const nextActive = !wasActive;
      menu.classList.toggle('active', nextActive);
      if (card) {
        card.style.zIndex = nextActive ? '100' : '1';
      }

      if (nextActive) {
        // Reset custom positioning to calculate natural drop
        menu.style.top = 'calc(100% + 6px)';
        menu.style.bottom = 'auto';
        menu.style.transformOrigin = 'top';

        // Delay 1 frame to let it render its height
        requestAnimationFrame(() => {
          const rect = menu.getBoundingClientRect();
          if (rect.bottom > window.innerHeight - 20) {
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
        const card = m.closest('.service-card') as HTMLElement;
        if (card) {
          card.style.zIndex = '1';
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

      if (isLimitSelect) {
        // If the toggle is OFF, keep mode as 'allow' — don't activate limit tracking
        const isEnabled =
          rule.desiredBlockingState !== false && rule.mode !== 'allow';
        const newMode = !isEnabled ? 'allow' : val > 0 ? 'limit' : 'block';
        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@stopaccess/state/rules');
        await updateRule(storage, {
          ...(rule as any),
          dailyLimitMinutes: val,
          mode: newMode as any,
          // Reset tracking when changing the limit so timer starts fresh
          usedMinutesToday: 0,
          blockedToday: newMode === 'block',
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(`Usage limit updated: ${(option as HTMLElement).innerText}`);
        await refreshListOnly();
      } else if (isPassSelect) {
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
