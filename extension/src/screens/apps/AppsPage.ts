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

let activeTab = 'shield';
let availableServices: any[] = [];
let availableCategories: any[] = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let globalContainer: HTMLElement | null = null;

function renderBrandLogo(identifier: string, name?: string, size = 44) {
  const iconInfo = getServiceIcon({ id: identifier, name });
  const targetDomain = iconInfo.domain || identifier;
  const safeIconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    targetDomain,
  )}&sz=128`;
  const iconSize = Math.floor(size * 0.65);

  return `
    <div class="brand-logo-container" style="position: relative; width: ${size}px; height: ${size}px; border-radius: ${Math.round(
    size * 0.27,
  )}px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.floor(
         size * 0.38,
       )}px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0; letter-spacing: -1px;">${(
    name || identifier
  )
    .slice(0, 2)
    .toUpperCase()}</div>
       <img src="${safeIconUrl}" 
            class="brand-logo-image"
            style="position: relative; width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2;" 
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

  if (syncMode === 'profile') {
    await loadNextDNSMetadata();
  }

  if (!container.querySelector('.search-bar')) {
    container.innerHTML = `
      <div id="cloudStatusContainer"></div>
      
      <div class="search-bar" style="margin-bottom: 32px; display: flex; gap: 12px; align-items: stretch;">
        <div style="position: relative; flex: 1;">
          <input type="text" placeholder="Filter or Add Domain (e.g. ${
            UI_EXAMPLES.DOMAIN
          })" id="appSearch" value="${escapeHtml(
      searchTerm,
    )}" class="input-premium" style="width:100%; height:60px; font-size:15px; border-radius:20px; padding-left: 24px; background: rgba(15, 15, 22, 0.4);">
          <div id="searchBadge" style="position: absolute; right: 20px; top: 20px; font-size: 12px; font-weight: 800; color: var(--muted); background: rgba(255,255,255,0.03); padding: 5px 10px; border-radius: 8px; border: 1px solid var(--glass-border); pointer-events: none;">CTRL + F</div>
        </div>
        <div id="searchActionContainer"></div>
      </div>

      <div id="appsNavigation" style="display: flex; padding: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 14px; margin-bottom: 40px; width: fit-content; min-width: 200px;">
        <button class="nav-item-tab" data-tab="shield">BLOCK LIST</button>
        ${
          syncMode === 'profile'
            ? `
          <button class="nav-item-tab" data-tab="categories">CATEGORIES</button>
          <button class="nav-item-tab" data-tab="denylist">BLOCKLIST</button>
        `
            : ''
        }
      </div>

      <div id="tabContent"></div>
    `;

    const statusDiv = container.querySelector('#cloudStatusContainer');
    if (syncMode === 'profile' && statusDiv) {
      statusDiv.innerHTML = `
        <div class="glass-card" style="margin-bottom: 32px; padding: 24px; display: flex; justify-content: space-between; align-items: center; border-color: ${
          isConfigured ? 'rgba(0,196,140,0.1)' : 'rgba(255,184,0,0.1)'
        };">
          <div>
            <div style="font-size: 10px; font-weight: 800; color: var(--accent); letter-spacing: 2px;">PROTECTION MODE: <span style="color:white;">STRONG</span></div>
            <div style="font-size: 13px; color: var(--muted); margin-top: 4px;">${
              isConfigured
                ? 'Cloud Rules Synchronized'
                : 'NextDNS Credentials Required'
            }</div>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn-premium" id="btnSyncCloudNow" style="padding: 8px 16px; font-size: 11px; background: rgba(255,255,255,0.02); box-shadow: none; border-color: var(--glass-border); display: ${
              isConfigured ? 'flex' : 'none'
            };">FORCE CLOUD SYNC</button>
            <div class="status-pill ${
              isConfigured ? 'active' : 'warning'
            }" style="font-size: 9px; padding: 6px 12px;">${
        isConfigured ? 'CONNECTED' : 'DISCONNECTED'
      }</div>
          </div>
        </div>
      `;

      statusDiv
        .querySelector('#btnSyncCloudNow')
        ?.addEventListener('click', async () => {
          const btn = statusDiv.querySelector(
            '#btnSyncCloudNow',
          ) as HTMLButtonElement;
          btn.innerText = 'SYNCING...';
          chrome.runtime.sendMessage({ action: 'manualSync' });
          await loadNextDNSMetadata();
          await refreshListOnly();
          btn.innerText = 'FORCE CLOUD SYNC';
        });
    }

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
      }
    }

    wireBrandLogoFallbacks(globalContainer);
    await setupHandlers(globalContainer, rulesToUse);
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
    )}" style="width: 130px; height: 32px; font-size: 11px; padding: 0 10px; border-radius: 10px; background: rgba(15, 15, 22, 0.4); font-weight: 800;">
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
      <div id="targetDrawerOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background: rgba(5, 5, 10, 0.92); backdrop-filter: blur(24px);">
        <div style="padding: 48px; height: 100%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
            <div>
              <div style="font-size: 0.6875rem; font-weight: 800; color: var(--muted); letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 6px;">App Drawer</div>
              <div style="font-size: 1.75rem; font-weight: 900; letter-spacing: -0.03em;">Add Apps to Shield</div>
            </div>
            <button style="background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); color: var(--muted); padding: 10px 20px; border-radius: 12px; font-size: 12px; font-weight: 800; cursor: pointer; letter-spacing: 0.5px; transition: all 0.2s;" id="btnCloseTargetDrawer">ESC / CLOSE</button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; padding-bottom: 60px;">
            ${NEXTDNS_SERVICES.filter(
              (s) =>
                !rules.some(
                  (r: any) => (r.customDomain || r.packageName) === s.id,
                ),
            )
              .map(
                (s) => `
                <button class="quick-add-service" data-id="${
                  s.id
                }" data-name="${s.name}" 
                  style="padding: 20px 12px; flex-direction: column; align-items: center; display: flex; gap: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; cursor: pointer; color: var(--text); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position:relative; overflow:hidden;">
                  ${renderAppIcon(s.id, s.name)}
                  <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center;">${
                    s.name
                  }</div>
                </button>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- Shielded Apps Section -->
      <div style="margin-bottom: 36px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-weight: 900; color: #FFFFFF; font-size: 1rem; letter-spacing: -0.02em;">Shielded Apps</div>
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
              : '<div style="padding: 28px 20px; border: 1px dashed rgba(255,255,255,0.08); border-radius: 16px; color: var(--muted); font-size: 12px; font-weight: 700; text-align: center; background: rgba(255,255,255,0.01); width: 100%;">No apps shielded yet � use Quick Add below.</div>'
          }
        </div>
      </div>


      <!-- Custom Domain Blocks -->
      <div style="border-top: 1px solid var(--glass-border); padding-top: 36px; margin-top: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-weight: 900; color: #FFFFFF; font-size: 1rem; letter-spacing: -0.02em;">Custom Domain Blocks</div>
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
              : '<div style="padding: 28px 20px; border: 1px dashed rgba(255,255,255,0.08); border-radius: 16px; color: var(--muted); font-size: 12px; font-weight: 700; text-align: center; background: rgba(255,255,255,0.01); width: 100%;">No custom domains shielded. Type a domain in the search bar above and press Enter.</div>'
          }
        </div>
      </div>
      <div style="display:flex; justify-content:center; margin-top: 28px;">
        <button class="btn-premium" id="btnOpenTargetDrawer" style="width: 58px; height: 58px; font-size: 24px; display:flex; align-items:center; justify-content:center; border-radius: 18px; padding: 0;">+</button>
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
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-weight: 900; color: #FFFFFF; font-size: 1rem; letter-spacing: -0.02em;">Category Toggles</div>
            ${
              activeCount > 0
                ? `<span style="font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 100px; background: rgba(61,61,74,0.2); color: var(--muted); border: 1px solid var(--glass-border);">${activeCount} active</span>`
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
          ? 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.03);'
          : 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.015);'
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
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.008); border-radius: 0 0 20px 20px;">
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
          ? 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.03);'
          : 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.015);'
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
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.008); border-radius: 0 0 20px 20px;">
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
          ? 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.03);'
          : 'border-color: rgba(255,255,255,0.03); box-shadow: none; background: rgba(255,255,255,0.015);'
      }
    ">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0; flex: 1;">
           <div style="width: 40px; height: 40px; border-radius: 11px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; font-size: 18px; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; box-shadow: none;">
             ${badge}
           </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 800;">${escapeHtml(
               category.name,
             )}</div>
             <div style="display:flex; align-items:center; gap: 6px; margin-top: 3px;">
               <span class="stat-lbl" style="font-size: 10px;">Category</span>
               ${
                 active
                   ? '<span style="font-size: 9px; font-weight: 800; color: var(--accent); letter-spacing: 0.5px; text-transform: uppercase;">Active</span>'
                   : ''
               }
             </div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
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
      <div style="display:flex; align-items:center; justify-content:space-between; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.008); border-radius: 0 0 20px 20px;">
        ${localRule ? renderLimitSelector(localRule) : '<span></span>'}
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Daily Limit</div>
      </div>`
          : ''
      }
    </div>
  `;
}

async function setupHandlers(container: HTMLElement, rules: any[]) {
  container
    .querySelector('#btnOpenTargetDrawer')
    ?.addEventListener('click', () => {
      const overlay = container.querySelector(
        '#targetDrawerOverlay',
      ) as HTMLElement;
      if (overlay) {
        overlay.style.display = 'block';
      }
    });

  container
    .querySelector('#btnCloseTargetDrawer')
    ?.addEventListener('click', () => {
      const overlay = container.querySelector(
        '#targetDrawerOverlay',
      ) as HTMLElement;
      if (overlay) {
        overlay.style.display = 'none';
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
