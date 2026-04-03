import { getRules, updateRule } from '@focusgate/state/rules';
import { AppRule } from '@focusgate/types';
import {
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
} from '@focusgate/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter';
import {
  getCategoryBadge,
  resolveServiceIcon as getServiceIcon,
  escapeHtml,
} from '@focusgate/core';
import { toast } from '../lib/toast';
import { appsController } from '../lib/appsController';
import { getLockedDomains } from '../background/sessionGuard';

let activeTab = 'shield';
let availableServices = [];
let availableCategories = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let globalContainer = null;

function renderBrandLogo(identifier, name, size = 44) {
  // Use the service brain to resolve the correct domain/mapping
  const iconInfo = getServiceIcon({ id: identifier, name });
  const targetDomain = iconInfo.domain || identifier;

  const safeIconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    targetDomain,
  )}&sz=128`;
  const iconSize = Math.floor(size * 0.7);

  return `
    <div class="brand-logo-container" style="position: relative; width: ${size}px; height: ${size}px; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.floor(
         size * 0.4,
       )}px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0;">${(
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

function renderAppIcon(domain, name) {
  return renderBrandLogo(domain, name, 44);
}

export async function renderAppsPage(container) {
  globalContainer = container;
  await loadNextDNSMetadata();

  if (!container.querySelector('.search-bar')) {
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 32px; position: relative;">
        <input type="text" placeholder="Filter or Add Domain (e.g. ${
          UI_EXAMPLES.DOMAIN
        })" id="appSearch" value="${escapeHtml(
      searchTerm,
    )}" class="input-premium" style="width:100%; height:60px; font-size:15px; border-radius:20px; padding-left: 24px; background: rgba(15, 15, 22, 0.4);">
        <div id="searchBadge" style="position: absolute; right: 20px; top: 15px; font-size: 12px; font-weight: 800; color: var(--muted); background: rgba(255,255,255,0.03); padding: 5px 10px; border-radius: 8px; border: 1px solid var(--glass-border); pointer-events: none;">CTRL + F</div>
      </div>

      <div style="display: flex; padding: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 14px; margin-bottom: 40px; width: fit-content; min-width: 400px;">
        <button class="nav-item-tab" data-tab="shield">BLOCK LIST</button>
        <button class="nav-item-tab" data-tab="categories">CATEGORIES</button>
      </div>

      <div id="tabContent" style="padding-bottom: 100px;"></div>

      <div id="searchActionContainer" style="position: fixed; bottom: 40px; right: 60px; z-index: 100;"></div>
    `;

    if (!(window as any).__appsCtrlFBound) {
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
          const searchInput = document.getElementById('appSearch');
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
          }
        }
      });
      (window as any).__appsCtrlFBound = true;
    }

    const searchInputEl = container.querySelector('#appSearch');
    if (searchInputEl) {
      searchInputEl.addEventListener('input', (e) => {
        searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        refreshListOnly();
      });
      searchInputEl.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          e.preventDefault();
          handleAddDomain();
        }
      });
    }

    container.querySelectorAll('.nav-item-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab') || 'domains';
        refreshListOnly();
      });
    });
  }

  await refreshListOnly();
}

async function loadNextDNSMetadata() {
  isLoadingNextDNS = true;
  try {
    const metadata = await nextDNSApi.refreshNextDNSMetadata();
    availableServices = metadata.services || [];
    availableCategories = metadata.categories || [];
  } catch (err) {
    const cached = (await chrome.storage.local.get([
      'cached_ndns_metadata',
    ])) as any;
    availableServices = cached.cached_ndns_metadata?.services || [];
    availableCategories = cached.cached_ndns_metadata?.categories || [];
    console.error('[FocusGate] Metadata Sync Fail:', err);
  } finally {
    isLoadingNextDNS = false;
  }
}

async function refreshListOnly() {
  if (!globalContainer) {
    return;
  }

  const rules = await getRules(storage);
  const lockedDomains = await getLockedDomains();
  const tabContent = globalContainer.querySelector('#tabContent');
  const actionContainer = globalContainer.querySelector(
    '#searchActionContainer',
  );
  const searchBadge = globalContainer.querySelector('#searchBadge');

  if (tabContent && isLoadingNextDNS && availableServices.length === 0) {
    tabContent.innerHTML =
      '<div class="loader">Synchronizing with NextDNS...</div>';
  }

  globalContainer.querySelectorAll('.nav-item-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
  });

  if (searchBadge) {
    searchBadge.style.opacity = searchTerm ? '0' : '1';
  }

  if (actionContainer) {
    actionContainer.innerHTML =
      '<button class="btn-premium" id="btnOpenTargetDrawer" style="width: 64px; height: 64px; font-size: 28px; display: flex; align-items: center; justify-content: center; border-radius: 32px; padding: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.6); background: var(--accent);">+</button>';

    globalContainer
      .querySelector('#btnOpenTargetDrawer')
      ?.addEventListener('click', () => {
        const overlay = globalContainer.querySelector('#targetDrawerOverlay');
        if (overlay) {
          overlay.style.display = 'block';
        }
      });
  }

  if (tabContent) {
    const html = await renderSubTab(rules, lockedDomains);
    tabContent.innerHTML = html;
    wireBrandLogoFallbacks(globalContainer);
    await setupHandlers(globalContainer, rules);
  }
}

function wireBrandLogoFallbacks(container) {
  container.querySelectorAll('.brand-logo-container').forEach((logo) => {
    const img = logo.querySelector('.brand-logo-image');
    const fallback = logo.querySelector('.logo-fallback');
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
  const input = searchTerm.trim().toLowerCase();
  if (!input) {
    return;
  }

  const searchInput = globalContainer.querySelector(
    '#appSearch',
  ) as HTMLInputElement;
  if (searchInput) {
    searchInput.disabled = true;
  }

  const result = await appsController.addDomainRule(input);
  if (result.ok) {
    searchTerm = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = false;
      searchInput.focus();
    }
    await refreshListOnly();
  } else {
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.focus();
    }
    toast.error('Failed to add rule');
  }
}

function matchesSearch(item) {
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

function buildRule(id, type, name, active) {
  return {
    packageName: id,
    appName: name || id,
    type: type as any,
    scope: (type === 'domain' ? 'browser' : 'profile') as any,
    mode: (active ? 'block' : 'allow') as any,
    dailyLimitMinutes: 0,
    blockedToday: active,
    desiredBlockingState: active,
    usedMinutesToday: 0,
    addedByUser: true,
    updatedAt: Date.now(),
  } as AppRule;
}

function getRuleActiveState(rule) {
  return Boolean(
    rule?.desiredBlockingState ?? rule?.blockedToday ?? rule?.mode !== 'allow',
  );
}

function renderLimitSelector(rule) {
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

async function renderSubTab(rules, lockedDomains: string[]) {
  if (activeTab === 'shield') {
    const domainRules = rules.filter((r) => r.type === 'domain' || !r.type);
    const visibleDomains = domainRules.filter(matchesSearch);

    const allApps = NEXTDNS_SERVICES.map((std) => {
      const synced = availableServices.find((s) => s.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });
    // For the active list, we only show apps that are actually enabled in rules or synced active
    const activeApps = allApps.filter((app) =>
      rules.some((r) => r.packageName === app.id && r.type === 'service'),
    );
    const visibleApps = activeApps.filter(matchesSearch);

    return `
      <div id="targetDrawerOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 900px; max-width: 90vw; height: 75vh; max-height: 800px; background: #0c0c0e; border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
          <div style="padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); flex-shrink: 0;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent); letter-spacing: 2px;">QUICK SETUP</div>
              <div style="font-size: 1.5rem; font-weight: 900; margin-top: 4px;">Initialize Active Rules</div>
            </div>
            <div style="flex: 1;"></div>
            <button class="btn-premium" style="background: transparent; box-shadow: none; border: 1px solid var(--glass-border); padding: 8px 16px;" id="btnCloseTargetDrawer">CLOSE</button>
          </div>
          
          <div style="padding: 32px 40px; overflow-y: auto; flex: 1;">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-bottom: 60px;">
            ${
              NEXTDNS_SERVICES.filter(
                (s) =>
                  !rules.some(
                    (r) => (r.customDomain || r.packageName) === s.id,
                  ),
              )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(
                  (s) => `
                <button class="btn-premium quick-add-service" data-id="${
                  s.id
                }" data-name="${s.name}" 
                  style="padding: 14px 20px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 16px; box-shadow:none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; cursor: pointer;">
                  <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                      ${renderAppIcon(s.id, s.name)}
                    </div>
                    <div style="font-size: 0.95rem; font-weight: 600; color: #E4E4E5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${
                      s.name
                    }</div>
                  </div>
                  <div style="font-size: 24px; font-weight: 300; color: #FFFFFF; opacity: 0.4;">+</div>
                </button>`,
                )
                .join('') ||
              `<div style="grid-column: 1/-1; text-align: center; padding: 120px 20px; color: var(--muted); background: rgba(255,255,255,0.01); border-radius: 24px; border: 1px dashed var(--glass-border);">
                <div style="font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">No matching apps found</div>
                <div style="font-size: 0.875rem; opacity: 0.6;">Try adding a custom domain from the main search bar.</div>
              </div>`
            }

            </div>
          </div>
        </div>
      </div>

      

      <div style="margin-bottom: 40px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <div style="font-weight: 800; color: #FFFFFF; font-size: 1.125rem; letter-spacing: -0.01em;">NextDNS Blocklist</div>
          
        </div>
        <div style="font-size: 0.875rem; color: var(--muted); opacity: 0.8; line-height: 1.6; margin-bottom: 24px;">Configured app perimeters under profile control.</div>
        <div class="service-grid">
          ${
            visibleApps.length
              ? visibleApps
                  .map((app) => renderServiceCard(app, rules, lockedDomains))
                  .join('')
              : '<div style="color:var(--muted); font-size:12px; opacity:0.5; font-weight:700;">No services currently active in the block list.</div>'
          }
        </div>
      </div>

      <div style="margin-top: 48px; border-top: 1px solid var(--glass-border); padding-top: 48px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
          <div style="font-weight: 800; color: #FFFFFF; font-size: 1.125rem; letter-spacing: -0.01em;">Normal Blocklist</div>
          <div class="status-pill muted">LOCAL DOMAINS</div>
        </div>
        <div style="font-size: 0.875rem; color: var(--muted); opacity: 0.8; line-height: 1.6; margin-bottom: 24px;">Granular domain-level intercepts stored and enforced by this extension.</div>
        <div class="service-grid">
          ${
            visibleDomains.length
              ? visibleDomains
                  .map((rule) => renderDomainRuleCard(rule, lockedDomains))
                  .join('')
              : '<div style="color:var(--muted); font-size:12px; opacity:0.5; font-weight:700;">No custom domains shielded.</div>'
          }
        </div>
      </div>
    `;
  }

  if (activeTab === 'categories') {
    const allCategories = NEXTDNS_CATEGORIES.map((std) => {
      const synced = availableCategories.find((ac) => ac.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });
    const visibleCategories = allCategories.filter(matchesSearch);
    if (isLoadingNextDNS) {
      return '<div class="empty-state">SYNCING CATEGORIES...</div>';
    }
    return `
      <div class="service-grid">
        ${visibleCategories
          .map((cat) => renderCategoryCard(cat, rules, lockedDomains))
          .join('')}
      </div>
    `;
  }
  return '';
}

function renderDomainRuleCard(rule, lockedDomains: string[] = []) {
  const active = getRuleActiveState(rule);
  const isLocked = lockedDomains.includes(rule.packageName);

  return `
    <div class="service-card ${
      active ? 'active' : ''
    }" style="display:flex; flex-direction:column; gap: 12px; height: auto; min-height: 140px; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
           ${renderBrandLogo(
             rule.customDomain || rule.packageName,
             rule.appName,
             44,
           )}
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
               rule.appName || rule.packageName,
             )}</div>
             <div class="stat-lbl" style="font-size: 11px;">Domain</div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px;">
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
                ? '🔒'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>'
            }
          </button>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           ${renderLimitSelector(rule)}
        </div>
        <div style="font-size: 8px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Usage Allowance</div>
      </div>
    </div>
  `;
}

function renderServiceCard(service, rules, lockedDomains: string[] = []) {
  const localRule = rules.find(
    (rule) => rule.packageName === service.id && rule.type === 'service',
  );
  const active =
    localRule !== undefined
      ? getRuleActiveState(localRule)
      : service.active ?? false;

  const isLocked = lockedDomains.includes(service.id);

  return `
    <div class="service-card ${
      active ? 'active' : ''
    }" style="display:flex; flex-direction:column; gap: 12px; height: auto; min-height: 140px; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
           ${renderBrandLogo(service.id, service.name, 44)}
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
               service.name,
             )}</div>
             <div class="stat-lbl" style="font-size: 11px;">App</div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px;">
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
                ? '🔒'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>'
            }
          </button>
        </div>
      </div>
      <div style="display:${
        active ? 'flex' : 'none'
      }; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           ${localRule ? renderLimitSelector(localRule) : ''}
        </div>
        <div style="font-size: 8px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Usage Allowance</div>
      </div>
    </div>
  `;
}

function renderCategoryCard(category, rules, lockedDomains: string[] = []) {
  const localRule = rules.find(
    (rule) => rule.packageName === category.id && rule.type === 'category',
  );
  const active =
    localRule !== undefined
      ? getRuleActiveState(localRule)
      : category.active ?? false;
  const badge = getCategoryBadge(category);
  const isLocked = lockedDomains.includes(category.id);

  return `
    <div class="service-card ${
      active ? 'active' : ''
    }" style="display:flex; flex-direction:column; gap: 12px; height: auto; min-height: 140px; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
           <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: var(--accent); border: 1px solid var(--glass-border); flex-shrink: 0;">
             ${badge}
           </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
               category.name,
             )}</div>
             <div class="stat-lbl" style="font-size: 11px;">Category</div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          <button class="btn-icon delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(category.id)}">
            ${
              isLocked
                ? '🔒'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>'
            }
          </button>
        </div>
      </div>
      <div style="display:${
        active ? 'flex' : 'none'
      }; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           ${localRule ? renderLimitSelector(localRule) : ''}
        </div>
        <div style="font-size: 8px; color: var(--muted); text-transform: uppercase; font-weight: 800; letter-spacing: 1px;">Usage Allowance</div>
      </div>
    </div>
  `;
}

async function setupHandlers(container, rules) {
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
      await appsController.toggleRule('service', id, name, true, rules);
      await refreshListOnly();
    });
  });

  container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kind = btn.getAttribute('data-kind');
      const id = btn.getAttribute('data-id') || btn.getAttribute('data-pkg');
      const active = btn.classList.contains('active');
      const isTabConfigured = kind !== 'domain';
      const targetState = !active;
      const targetName = btn.getAttribute('data-name') || id;

      // Optimistic visual feedback (using partial opacity to signify pending)
      btn.style.opacity = '0.5';

      try {
        // 1. Remote Sync First
        if (isTabConfigured) {
          const result = await nextDNSApi.setTargetState(kind, id, targetState);
          if (!result.ok) {
            const failedResult = result as { ok: false; error?: unknown };
            const errorMsg =
              typeof failedResult.error === 'object' &&
              failedResult.error !== null &&
              'message' in failedResult.error
                ? String((failedResult.error as { message?: string }).message)
                : String(failedResult.error || 'Sync failed');
            throw new Error(errorMsg || 'Sync failed');
          }
          await nextDNSApi.refreshNextDNSMetadata();
        }
        // 2. Commit Local State
        const existingRule = rules.find(
          (r) =>
            (r.customDomain || r.packageName) === id &&
            (kind !== 'service' || r.type === 'service'),
        );
        const baseRule =
          existingRule ||
          (kind === 'domain'
            ? {
                ...buildRule(id, 'domain', targetName, targetState),
                customDomain: id,
              }
            : buildRule(id, kind, targetName, targetState));

        const newMode = !targetState
          ? 'allow'
          : (baseRule.dailyLimitMinutes || 0) > 0
          ? 'limit'
          : 'block';

        await updateRule(storage, {
          ...baseRule,
          blockedToday: targetState,
          mode: newMode,
          dailyLimitMinutes: baseRule.dailyLimitMinutes ?? 0,
          desiredBlockingState: targetState,
          updatedAt: Date.now(),
        });

        // 3. Refresh & Hardware Signal
        chrome.runtime.sendMessage({ action: 'manualSync' });
        await refreshListOnly();
      } catch (err) {
        console.error('[FocusGate] Toggle Fail:', err);
        toast.error(`Sync Error: ${err.message}`);
        btn.style.opacity = '1';
        refreshListOnly();
      }
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      const result = await appsController.removeRule(pkg, rules);
      if (result.ok) {
        await refreshListOnly();
      }
    });
  });

  container.querySelectorAll('.edit-limit-select').forEach((input) => {
    input.addEventListener('change', async () => {
      const pkg = input.getAttribute('data-pkg');
      const val = parseInt(input.value, 10) || 0;
      const rule = rules.find((r) => (r.customDomain || r.packageName) === pkg);
      if (rule) {
        const newMode = val > 0 ? 'limit' : 'block';
        await updateRule(storage, {
          ...rule,
          dailyLimitMinutes: val,
          mode: newMode,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(
          `Usage limit updated: ${input.options[input.selectedIndex].text}`,
        );
        await refreshListOnly();
      }
    });
  });
}
