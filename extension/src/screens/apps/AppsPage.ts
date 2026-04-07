import { loadAppsData } from '../../../../packages/viewmodels/src/useAppsVM';
import {
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
} from '@focusgate/core';
import {
  getCategoryBadge,
  resolveServiceIcon as getServiceIcon,
  escapeHtml,
} from '@focusgate/core';
import { toast } from '../../lib/toast';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { extensionAdapter } from '../../background/platformAdapter';

let activeTab = 'shield';
let availableServices: any[] = [];
let availableCategories: any[] = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let globalContainer: HTMLElement | null = null;
let currentSyncMode = 'browser';
let currentIsConfigured = false;
let currentIsAppsDnsHardMode = true;

function renderBrandLogo(identifier: string, name?: string, size = 44) {
  const iconInfo = getServiceIcon({ id: identifier, name });
  const targetDomain = iconInfo.domain || identifier;
  const safeIconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    targetDomain,
  )}&sz=128`;
  const iconSize = Math.floor(size * 0.9); // Increased to fill naturally

  return `
    <div class="brand-logo-container" style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.floor(
         size * 0.45,
       )}px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0; letter-spacing: -1px;">${(
    name || identifier
  )
    .slice(0, 2)
    .toUpperCase()}</div>
       <img src="${safeIconUrl}" 
            class="brand-logo-image"
            style="position: relative; width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2; border-radius: 20%;" 
            alt="">
    </div>
  `;
}

function renderAppIcon(domain: string, name?: string) {
  return renderBrandLogo(domain, name, 44);
}

export async function renderAppsPage(container: HTMLElement) {
  globalContainer = container;
  const vmData: any = await loadAppsData();
  const { isConfigured, rules, syncMode } = vmData;
  currentSyncMode = syncMode;
  currentIsConfigured = isConfigured;
  currentIsAppsDnsHardMode =
    (await extensionAdapter.getBoolean('fg_apps_dns_hard_mode')) ?? false;

  if (syncMode === 'profile') {
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
        <div id="appsNavigation" style="display: flex; padding: 4px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 14px; width: fit-content; min-width: 200px;">
          <button class="nav-item-tab" data-tab="shield">BLOCKLIST</button>
          <button class="nav-item-tab" data-tab="categories">CATEGORIES</button>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 14px;" title="Block apps and domains at the router level via NextDNS.">
          <div style="font-size: 11px; font-weight: 800; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">DNS Hard Mode</div>
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
  }

  await refreshListOnly(rules);
}

async function loadNextDNSMetadata() {
  const vmData: any = await loadAppsData();
  const { isConfigured, nextDNSApi } = vmData;
  if (!isConfigured || !nextDNSApi) {
    return;
  }

  isLoadingNextDNS = true;
  try {
    const metadata: any = await nextDNSApi.refreshNextDNSMetadata();
    availableServices = metadata.services || [];
    availableCategories = metadata.categories || [];
    (window as any).availableDenylist = metadata.denylist || [];
  } catch (err) {
    const res: any = await chrome.storage.local.get(['cached_ndns_metadata']);
    availableServices = res.cached_ndns_metadata?.services || [];
    availableCategories = res.cached_ndns_metadata?.categories || [];
    (window as any).availableDenylist =
      res.cached_ndns_metadata?.denylist || [];
    console.error('[FocusGate] Metadata Sync Fail:', err);
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
    tabContent.innerHTML = '<div class="loader">Syncing with NextDNS...</div>';
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
          BLOCK
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
  container.querySelectorAll('.brand-logo-container').forEach((logo) => {
    const img = logo.querySelector('.brand-logo-image') as HTMLImageElement;
    const fallback = logo.querySelector('.logo-fallback') as HTMLElement;
    if (!img || !fallback || img.dataset.fgFallbackBound === 'true') {
      return;
    }
    img.dataset.fgFallbackBound = 'true';
    img.addEventListener('error', () => {
      img.style.display = 'none';
      fallback.style.opacity = '1';
    });
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
    btn.innerText = 'BLOCKING...';
    btn.disabled = true;
  }

  // Check if it's an exact match for a known service (app)
  const exactService = availableServices.find(
    (s) =>
      s.name.toLowerCase() === input ||
      s.id.slice(0, 15).toLowerCase() === input,
  );

  let result;
  if (exactService) {
    const vmData: any = await loadAppsData();
    result = await appsController.toggleRule(
      'service',
      exactService.id,
      exactService.name,
      true,
      vmData.rules,
    );
  } else {
    result = await appsController.addDomainRule(input);
  }
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
    btn.innerText = 'FAILED';
    setTimeout(() => {
      btn.innerText = 'ADD RULE';
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

function getRuleActiveState(rule: any) {
  return Boolean(
    rule?.desiredBlockingState ?? rule?.blockedToday ?? rule?.mode !== 'allow',
  );
}

function renderLimitSelector(rule: any) {
  const limitValue = rule.dailyLimitMinutes || 0;
  const options = [
    { value: 0, label: 'Instant Block' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];

  return `
    <select class="input-premium edit-limit-select" data-pkg="${escapeHtml(
      rule.packageName,
    )}" style="width: 130px; height: 32px; font-size: 11px; padding: 0 10px; border-radius: 10px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text); font-weight: 800;">
      ${options
        .map(
          (opt) => `
        <option value="${opt.value}" ${
            limitValue === opt.value ? 'selected' : ''
          }>${opt.label}</option>
      `,
        )
        .join('')}
    </select>
  `;
}

async function renderSubTab(rules: any[], lockedDomains: string[]) {
  if (activeTab === 'shield') {
    const domainRules = rules.filter(
      (r: any) => r.type === 'domain' || !r.type,
    );
    const visibleDomains = domainRules.filter(matchesSearch);
    const activeApps = NEXTDNS_SERVICES.filter((app) =>
      rules.some((r: any) => r.packageName === app.id && r.type === 'service'),
    );
    const visibleApps = activeApps.filter(matchesSearch);
    return `
      <!-- Centered App Discovery Drawer -->
      <div id="targetDrawerOverlay" class="fg-fixed fg-inset-0 fg-z-[1000] fg-transition-all fg-duration-300 fg-flex fg-items-center fg-justify-center" 
        style="display: none; background: rgba(5,5,10,0.85); backdrop-filter: blur(12px);">
        
        <div id="targetDrawer" class="fg-relative fg-w-[720px] fg-max-h-[85vh] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-shadow-[0_32px_64px_rgba(0,0,0,0.5)] fg-transition-all fg-duration-300 fg-scale-95 fg-opacity-0 fg-flex fg-flex-col fg-overflow-hidden">
          
          <!-- Header -->
          <div class="fg-p-8 fg-border-b fg-border-[var(--fg-glass-border)] fg-flex fg-items-center fg-justify-between">
            <div>
              <div class="fg-text-[10px] fg-font-black fg-uppercase fg-tracking-[3px] fg-text-[#3b82f6] fg-mb-1">App Drawer</div>
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
            <div class="fg-text-[10px] fg-font-bold fg-text-[var(--muted)] fg-uppercase fg-tracking-widest">
              Total Catalog: <span class="fg-text-[var(--fg-text)]">${
                NEXTDNS_SERVICES.length
              } Services</span>
            </div>
            <div class="fg-text-[10px] fg-font-bold fg-text-[var(--muted)] fg-uppercase fg-tracking-widest">
              Press ESC to Close
            </div>
          </div>
        </div>
      </div>

      <!-- Shielded Apps Section -->
      <div style="margin-bottom: 36px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-weight: 900; color: var(--fg-text); font-size: 1rem; letter-spacing: -0.02em;">Shielded Apps</div>
              ${
                visibleApps.length > 0
                  ? `<span style="font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 100px; background: rgba(185,28,28,0.12); color: var(--red); border: 1px solid rgba(185,28,28,0.2);">${visibleApps.length}</span>`
                  : ''
              }
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600;">Configured app perimeters under profile control.</div>
          </div>
        </div>
        <div class="service-grid">
          ${
            visibleApps.length
              ? visibleApps
                  .map((app) => renderServiceCard(app, rules, lockedDomains))
                  .join('')
              : '<div style="padding: 28px 20px; border: 1px dashed var(--fg-glass-border); border-radius: 16px; color: var(--fg-muted); font-size: 12px; font-weight: 700; text-align: center; background: var(--fg-glass-bg); width: 100%;">No apps shielded yet — use Quick Add below.</div>'
          }
        </div>
      </div>


      <!-- Custom Domain Blocks -->
      <div style="border-top: 1px solid var(--glass-border); padding-top: 36px; margin-top: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-weight: 900; color: var(--fg-text); font-size: 1rem; letter-spacing: -0.02em;">Custom Domain Blocks</div>
              ${
                visibleDomains.length > 0
                  ? `<span style="font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 100px; background: rgba(185,28,28,0.12); color: var(--red); border: 1px solid rgba(185,28,28,0.2);">${visibleDomains.length}</span>`
                  : ''
              }
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600;">Manual domain entries enforced locally or via NextDNS.</div>
          </div>
        </div>
        <div class="service-grid">
          ${
            visibleDomains.length
              ? visibleDomains
                  .map((rule) => renderDomainRuleCard(rule, lockedDomains))
                  .join('')
              : '<div style="padding: 28px 20px; border: 1px dashed var(--fg-glass-border); border-radius: 16px; color: var(--fg-muted); font-size: 12px; font-weight: 700; text-align: center; background: var(--fg-glass-bg); width: 100%;">No custom domains shielded. Type a domain in the search bar above and press Enter.</div>'
          }
        </div>
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
    const disabledWarning =
      currentSyncMode !== 'profile'
        ? `<div style="padding: 16px; border-radius: 12px; background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.2); margin-bottom: 24px; color: #ffeb3b; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 10px;">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
           DNS profile required to turn on categories.
         </div>`
        : '';

    return `
      ${disabledWarning}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-weight: 900; color: var(--fg-text); font-size: 1.1rem; letter-spacing: -0.02em;">Add a Category</div>
            ${
              activeCount > 0
                ? `<span style="font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 100px; background: var(--fg-glass-bg); color: var(--fg-muted); border: 1px solid var(--fg-glass-border);">${activeCount} active</span>`
                : ''
            }
          </div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600;">Profile-wide blocks for social, streaming, gambling, and more.</div>
        </div>
      </div>
      <div class="service-grid">
        ${visibleCategories
          .map((cat) => renderCategoryCard(cat, rules, lockedDomains))
          .join('')}
      </div>
    `;
  }
  return '';
}

function renderDomainRuleCard(rule: any, lockedDomains: string[] = []) {
  const active = getRuleActiveState(rule);
  const isLocked = lockedDomains.includes(rule.packageName);

  return `
    <div class="service-card ${active ? 'active' : ''}" style="
      display:flex; flex-direction:column; gap: 0; height: auto; padding: 0;
      ${
        active
          ? 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
          : 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
      }
    ">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0; flex: 1;">
           ${renderBrandLogo(
             rule.customDomain || rule.packageName,
             rule.appName,
             40,
           )}
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 800;">${escapeHtml(
               rule.appName || rule.packageName,
             )}</div>
             <div style="display:flex; align-items:center; gap: 6px; margin-top: 3px;">
               <span class="stat-lbl" style="font-size: 10px;">Domain</span>
               ${
                 active
                   ? '<span style="font-size: 9px; font-weight: 800; color: var(--red); letter-spacing: 0.5px; text-transform: uppercase;">Blocked</span>'
                   : ''
               }
             </div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="domain" data-pkg="${escapeHtml(
    rule.packageName,
  )}" data-name="${escapeHtml(rule.appName || rule.packageName)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          <button class="btn-icon delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(rule.packageName)}">
            ${
              isLocked
                ? 'LOCK'
                : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>'
            }
          </button>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid var(--fg-glass-border); background: var(--fg-glass-bg); border-radius: 0 0 20px 20px;">
        ${renderLimitSelector(rule)}
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Daily Limit</div>
      </div>
    </div>
  `;
}

function renderServiceCard(
  service: any,
  rules: any[],
  lockedDomains: string[] = [],
) {
  const localRule = rules.find(
    (rule: any) => rule.packageName === service.id && rule.type === 'service',
  );
  const active =
    localRule !== undefined ? getRuleActiveState(localRule) : false;
  const isLocked = lockedDomains.includes(service.id);

  return `
    <div class="service-card ${active ? 'active' : ''}" style="
      display:flex; flex-direction:column; gap: 0; height: auto; padding: 0;
      ${
        active
          ? 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
          : 'border-color: var(--fg-glass-border); box-shadow: none; background: var(--fg-glass-bg);'
      }
    ">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0; flex: 1;">
           ${renderBrandLogo(service.id, service.name, 40)}
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 800;">${escapeHtml(
               service.name,
             )}</div>
             <div style="display:flex; align-items:center; gap: 6px; margin-top: 3px;">
               <span class="stat-lbl" style="font-size: 10px;">App</span>
               ${
                 active
                   ? '<span style="font-size: 9px; font-weight: 800; color: var(--red); letter-spacing: 0.5px; text-transform: uppercase;">Blocked</span>'
                   : ''
               }
             </div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="service" data-id="${escapeHtml(
    service.id,
  )}" data-name="${escapeHtml(service.name)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          <button class="btn-icon delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(service.id)}">
            ${
              isLocked
                ? 'LOCK'
                : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>'
            }
          </button>
        </div>
      </div>
      ${
        active
          ? `
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid var(--fg-glass-border); background: var(--fg-glass-bg); border-radius: 0 0 20px 20px;">
        ${localRule ? renderLimitSelector(localRule) : ''}
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Daily Limit</div>
      </div>`
          : ''
      }
    </div>
  `;
}

function renderCategoryCard(
  category: any,
  rules: any[],
  lockedDomains: string[] = [],
) {
  const localRule = rules.find(
    (rule: any) => rule.packageName === category.id && rule.type === 'category',
  );
  const active =
    localRule !== undefined ? getRuleActiveState(localRule) : false;
  const badge = getCategoryBadge(category);
  const isLocked = lockedDomains.includes(category.id);

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
       <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
         ${badge}
       </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; font-weight: 800; letter-spacing: -0.01em;">${escapeHtml(
               category.name,
             )}</div>
             <div style="font-size: 11px; opacity: 0.6; margin-top: 5px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(
               category.description || '',
             )}</div>
             ${
               active
                 ? '<div style="margin-top: 8px;"><span style="font-size: 10px; font-weight: 800; color: var(--red); letter-spacing: 0.5px; text-transform: uppercase;">Blocked</span></div>'
                 : ''
             }
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked || currentSyncMode !== 'profile' ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          ${
            isLocked
              ? '<div style="font-size:10px; opacity:0.5; font-weight:800; letter-spacing:0.6px;">LOCK</div>'
              : ''
          }
        </div>
      </div>
      ${
        active
          ? `
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid var(--fg-glass-border); background: var(--fg-glass-bg); border-radius: 0 0 20px 20px;">
        ${localRule ? renderLimitSelector(localRule) : '<span></span>'}
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Daily Limit</div>
      </div>`
          : ''
      }
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

  container.querySelectorAll('.edit-limit-select').forEach((input) => {
    const select = input as HTMLSelectElement;
    select.addEventListener('change', async () => {
      const pkg = select.getAttribute('data-pkg');
      const val = parseInt(select.value, 10) || 0;
      const rule = rules.find(
        (r: any) => (r.customDomain || r.packageName) === pkg,
      );
      if (rule && pkg) {
        const newMode = val > 0 ? 'limit' : 'block';
        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@focusgate/state/rules');
        await updateRule(storage, {
          ...(rule as any),
          dailyLimitMinutes: val,
          mode: newMode as any,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(
          `Usage limit updated: ${select.options[select.selectedIndex].text}`,
        );
        await refreshListOnly();
      }
    });
  });
}
