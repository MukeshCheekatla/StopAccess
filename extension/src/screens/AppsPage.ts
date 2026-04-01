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
let isConfigured = false;
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
  isConfigured = await nextDNSApi.isConfigured();
  await loadNextDNSMetadata();

  if (!container.querySelector('.search-bar')) {
    container.innerHTML = `
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

      <div style="display: flex; padding: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 14px; margin-bottom: 40px; width: fit-content; min-width: 400px;">
        <button class="nav-item-tab" data-tab="shield">BLOCK LIST</button>
        <button class="nav-item-tab" data-tab="categories">CATEGORIES</button>
      </div>

      <div id="tabContent"></div>
    `;

    container.querySelector('#appSearch')?.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      refreshListOnly();
    });

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
    const normalizedSearch = searchTerm.includes('.')
      ? searchTerm.trim().toLowerCase()
      : '';
    const resolvedTarget = normalizedSearch
      ? await nextDNSApi.resolveTargetInput(normalizedSearch)
      : null;
    const existingId =
      resolvedTarget?.kind === 'service'
        ? resolvedTarget.normalizedId
        : normalizedSearch;
    const showAdd =
      Boolean(normalizedSearch) &&
      !rules.some((r) => (r.customDomain || r.packageName) === existingId);
    actionContainer.innerHTML = showAdd
      ? '<button class="btn-premium" id="btnAddDomainUnified" style="padding: 0 24px; border-radius: 20px; white-space: nowrap; height: 60px;">ADD RULE</button>'
      : '<button class="btn-premium" id="btnOpenTargetDrawer" style="width: 60px; height: 60px; font-size: 24px; display: flex; align-items: center; justify-content: center; border-radius: 20px; padding: 0;">+</button>';

    globalContainer
      .querySelector('#btnAddDomainUnified')
      ?.addEventListener('click', handleAddDomain);
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

  const btn = globalContainer.querySelector('#btnAddDomainUnified');
  if (btn) {
    btn.innerText = 'BLOCKING...';
    btn.disabled = true;
  }

  const result = await appsController.addDomainRule(input);
  if (result.ok) {
    searchTerm = '';
    const searchInput = globalContainer.querySelector('#appSearch');
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
      <div id="targetDrawerOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background: rgba(5, 5, 10, 0.9); backdrop-filter: blur(20px);">
        <div style="padding: 40px; height: 100%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent); letter-spacing: 2px;">QUICK SETUP</div>
              <div style="font-size: 1.5rem; font-weight: 900; margin-top: 4px;">Initialize Active Rules</div>
            </div>
            <button class="btn-premium" style="background: transparent; box-shadow: none; border: 1px solid var(--glass-border); padding: 8px 16px;" id="btnCloseTargetDrawer">CLOSE</button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; padding-bottom: 60px;">
            ${NEXTDNS_SERVICES.filter(
              (s) =>
                !rules.some((r) => (r.customDomain || r.packageName) === s.id),
            )
              .map(
                (s) => `
                <button class="btn-premium quick-add-service" data-id="${
                  s.id
                }" data-name="${s.name}" 
                  style="padding: 24px 16px; flex-direction: column; gap: 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); box-shadow:none; min-height: 140px; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position:relative; overflow:hidden;">
                  <div style="position:absolute; top:10px; right:12px; width:22px; height:22px; border-radius:50%; background: #3F3F46; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:400; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">+</div>
                  ${renderAppIcon(s.id, s.name)}
                  <div style="font-size: 0.9375rem; font-weight: 800; color: #FFFFFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; letter-spacing: -0.01em;">${
                    s.name
                  }</div>
                </button>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 32px;">
        <div style="font-weight: 800; color: #FFFFFF; font-size: 1.125rem; letter-spacing: -0.01em; margin-bottom: 8px;">Enforced Apps</div>
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
        <div style="font-weight: 800; color: #FFFFFF; font-size: 1.125rem; letter-spacing: -0.01em; margin-bottom: 8px;">Custom Domain Blocks</div>
        <div style="font-size: 0.875rem; color: var(--muted); opacity: 0.8; line-height: 1.6; margin-bottom: 24px;">Granular domain-level intercepts.</div>
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
      const overlay = container.querySelector('#targetDrawerOverlay');
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
      const targetState = !active;
      const name = btn.getAttribute('data-name') || id;

      // Optimistic visual feedback (using partial opacity to signify pending)
      btn.style.opacity = '0.5';

      try {
        // 1. Remote Sync First
        if (isConfigured) {
          const result = await nextDNSApi.setTargetState(kind, id, targetState);
          if (!result.ok) {
            const errorMsg =
              typeof (result.error as any) === 'object'
                ? (result.error as any).message
                : result.error;
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
                ...buildRule(id, 'domain', name, targetState),
                customDomain: id,
              }
            : buildRule(id, kind, name, targetState));

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
