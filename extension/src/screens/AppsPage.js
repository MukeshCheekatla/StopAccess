import { getRules, updateRule, deleteRule } from '@focusgate/state/rules';
import {
  POPULAR_DISTRACTIONS,
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
} from '@focusgate/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import {
  getCategoryBadge,
  resolveServiceIcon as getServiceIcon,
  escapeHtml,
  sanitizeDomain,
} from '@focusgate/core';

let activeTab = 'domains';
let availableServices = [];
let availableCategories = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let isConfigured = false;
let globalContainer = null;

function renderBrandLogo(identifier, name, size = 44) {
  const icon = getServiceIcon({ id: identifier, name });
  const iconSize = Math.floor(size * 0.7);

  const safeIconUrl =
    icon.url ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      identifier,
    )}&sz=128`;

  return `
    <div class="brand-logo-container" style="position: relative; width: ${size}px; height: ${size}px; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.floor(
         size * 0.4,
       )}px; font-weight: 900; color: var(--muted); z-index: 1;"></div>
       <img src="${safeIconUrl}" 
            style="position: relative; width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2; transition: opacity 0.2s ease;" 
            onload="this.style.opacity='1';"
            onerror="
              if (!this.dataset.retried && this.src.indexOf('google.com') === -1) {
                this.dataset.retried='1';
                this.src='https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                  identifier,
                )}&sz=128';
              } else {
                this.style.display='none';
                const fallbackElement = this.parentElement.querySelector('.logo-fallback');
                if (fallbackElement) {
                   fallbackElement.innerText = '${(name || identifier)
                     .slice(0, 2)
                     .toUpperCase()}';
                }
              }
            " 
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

  if (availableServices.length === 0 || availableCategories.length === 0) {
    const cached = await chrome.storage.local.get(['cached_ndns_metadata']);
    if (cached.cached_ndns_metadata) {
      availableServices = cached.cached_ndns_metadata.services || [];
      availableCategories = cached.cached_ndns_metadata.categories || [];
    }
  }

  if (!container.querySelector('.search-bar')) {
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 32px; display: flex; gap: 12px; align-items: stretch;">
        <div style="position: relative; flex: 1;">
          <input type="text" placeholder="Filter or Add Domain (e.g. ${
            UI_EXAMPLES.DOMAIN
          })" id="appSearch" value="${escapeHtml(
      searchTerm,
    )}" class="input-premium" style="width:100%; height:60px; font-size:15px; border-radius:20px; padding-left: 24px; background: rgba(15, 15, 22, 0.4);">
          <div id="searchBadge" style="position: absolute; right: 20px; top: 20px; font-size: 10px; font-weight: 800; color: var(--muted); background: rgba(255,255,255,0.03); padding: 5px 10px; border-radius: 8px; border: 1px solid var(--glass-border); pointer-events: none;">CTRL + F</div>
        </div>
        <div id="searchActionContainer"></div>
      </div>

      <div style="display: flex; padding: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 14px; margin-bottom: 40px; width: fit-content; min-width: 400px;">
        <button class="nav-item-tab" data-tab="domains">DOMAINS</button>
        <button class="nav-item-tab" data-tab="services">APPS</button>
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

async function refreshListOnly() {
  if (!globalContainer) {
    return;
  }
  const rules = await getRules(storage);
  const tabContent = globalContainer.querySelector('#tabContent');
  const actionContainer = globalContainer.querySelector(
    '#searchActionContainer',
  );
  const searchBadge = globalContainer.querySelector('#searchBadge');

  globalContainer.querySelectorAll('.nav-item-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === activeTab);
  });

  if (searchBadge) {
    searchBadge.style.opacity = searchTerm ? '0' : '1';
  }

  if (actionContainer) {
    const showAdd =
      searchTerm.includes('.') &&
      !rules.some(
        (r) =>
          (r.customDomain || r.packageName) === searchTerm.trim().toLowerCase(),
      );
    actionContainer.innerHTML = showAdd
      ? '<button class="btn-premium" id="btnAddDomainUnified" style="padding: 0 24px; border-radius: 20px; white-space: nowrap; height: 60px;">ADD SHIELD</button>'
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
    const html = await renderSubTab(rules);
    tabContent.innerHTML = html;
    await setupHandlers(globalContainer, rules);
  }
}

async function handleAddDomain() {
  const domain = sanitizeDomain(searchTerm);
  if (!domain) {
    return;
  }
  const btn = globalContainer.querySelector('#btnAddDomainUnified');
  if (btn) {
    btn.innerText = 'ADDING...';
  }

  await updateRule(storage, buildRule(domain, 'domain', domain, true));
  if (isConfigured) {
    await nextDNSApi.setDenylistDomainState(domain, true);
  }
  searchTerm = '';
  const searchInput = globalContainer.querySelector('#appSearch');
  if (searchInput) {
    searchInput.value = '';
  }
  chrome.runtime.sendMessage({ action: 'manualSync' });
  refreshListOnly();
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
    type,
    mode: active ? 'block' : 'allow',
    dailyLimitMinutes: 0,
    blockedToday: active,
    desiredBlockingState: active,
    updatedAt: Date.now(),
  };
}

async function renderSubTab(rules) {
  if (activeTab === 'domains') {
    const domainRules = rules.filter((r) => r.type === 'domain' || !r.type);
    const visibleRules = domainRules.filter(matchesSearch);

    return `
      <div style="margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between;">
         <div class="widget-title" style="margin-bottom: 0;">Active Protected Domains (${
           visibleRules.length
         })</div>
      </div>

      <div id="targetDrawerOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; background: rgba(5, 5, 10, 0.9); backdrop-filter: blur(20px);">
        <div style="padding: 40px; height: 100%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent); letter-spacing: 2px;">QUICK SETUP</div>
              <div style="font-size: 1.5rem; font-weight: 900; margin-top: 4px;">Popular Distractions</div>
            </div>
            <button class="btn-premium" style="background: transparent; box-shadow: none; border: 1px solid var(--glass-border); padding: 8px 16px;" id="btnCloseTargetDrawer">CLOSE</button>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; padding-bottom: 60px;">
            ${POPULAR_DISTRACTIONS.filter(
              (d) =>
                !rules.some((r) => (r.customDomain || r.packageName) === d.id),
            )
              .map(
                (d) => `
                <button class="btn-premium quick-add-domain" data-domain="${
                  d.id
                }" data-name="${d.name}" 
                  style="padding: 24px 16px; flex-direction: column; gap: 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); box-shadow:none; min-height: 140px; justify-content: center; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position:relative; overflow:hidden;">
                  <div style="position:absolute; top:10px; right:12px; width:22px; height:22px; border-radius:50%; background: #3F3F46; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:400; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">+</div>
                  ${renderAppIcon(d.id, d.name)}
                  <div style="font-size: 0.9375rem; font-weight: 800; color: #FFFFFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; letter-spacing: -0.01em;">${
                    d.name
                  }</div>
                </button>`,
              )
              .join('')}
          </div>
        </div>
      </div>

      <div class="service-grid">
        ${
          visibleRules.length
            ? visibleRules.map((rule) => renderDomainRuleCard(rule)).join('')
            : `
            <div class="glass-card" style="height: 240px; display: flex; flex-direction:column; align-items:center; justify-content:center; grid-column: 1 / -1; background:rgba(255,255,255,0.01); border-color:var(--glass-border); border-style: solid;">
              <div style="font-weight: 900; font-size: 32px; color: var(--accent); opacity: 0.2; margin-bottom: 16px; letter-spacing: -2px;">FG</div>
              <div style="font-weight: 800; color: var(--muted); letter-spacing:1px; text-transform:uppercase; font-size:12px;">No active rules for ${activeTab}</div>
              <div style="font-size: 13px; color: var(--muted); margin-top: 8px; opacity: 0.5;">Add a new shield or select from popular services.</div>
            </div>`
        }
      </div>
    `;
  }

  if (activeTab === 'services') {
    const allApps = NEXTDNS_SERVICES.map((std) => {
      const synced = availableServices.find((s) => s.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });
    const visibleApps = allApps.filter(matchesSearch);
    if (isLoadingNextDNS && availableServices.length === 0) {
      return '<div class="empty-state">SYNCING NEXTDNS ENGINE...</div>';
    }
    return `
      <div style="margin-bottom: 32px;">
        <div style="font-weight: 800; color: #FFFFFF; font-size: 1.125rem; letter-spacing: -0.01em; margin-bottom: 8px;">Websites, Apps & Games</div>
        <div style="font-size: 0.875rem; color: var(--muted); opacity: 0.8; line-height: 1.6;">Restrict access to specific popular apps, games and social networks profile-wide.</div>
      </div>
      <div class="service-grid">
        ${visibleApps
          .map((service) => renderServiceCard(service, rules))
          .join('')}
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
          .map((cat) => renderCategoryCard(cat, rules))
          .join('')}
      </div>
    `;
  }
  return '';
}

function renderDomainRuleCard(rule) {
  const active =
    rule.mode === 'block' || rule.mode === 'limit' || rule.blockedToday;
  const limitValue = rule.dailyLimitMinutes || 0;

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
             <div class="stat-lbl" style="font-size: 10px;">${escapeHtml(
               rule.customDomain || rule.packageName,
             )}</div>
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px;">
          <button class="toggle-switch-btn ${
            active ? 'active' : ''
          }" data-kind="domain" data-pkg="${escapeHtml(
    rule.packageName,
  )}" data-name="${escapeHtml(rule.appName || rule.packageName)}">
            <span>${active ? 'ON' : 'OFF'}</span>
          </button>
          <button class="btn-icon delete-rule" data-pkg="${escapeHtml(
            rule.packageName,
          )}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           <input type="number" class="input edit-limit" value="${limitValue}" data-pkg="${escapeHtml(
    rule.packageName,
  )}" style="width: 50px; padding: 4px; font-size: 11px; text-align: center;">
           <span style="font-size: 10px; color: var(--muted); font-weight: 700;">MIN</span>
        </div>
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase;">Daily Limit</div>
      </div>
    </div>
  `;
}

function renderServiceCard(service, rules) {
  const localRule = rules.find(
    (rule) => rule.packageName === service.id && rule.type === 'service',
  );
  const active = service.active ?? localRule?.blockedToday ?? false;

  return `
    <div class="service-card ${
      active ? 'active' : ''
    }" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
           ${renderBrandLogo(service.id, service.name, 44)}
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
               service.name,
             )}</div>
             <div class="stat-lbl" style="font-size: 10px;">App</div>
           </div>
        </div>
        <button class="toggle-switch-btn ${
          active ? 'active' : ''
        }" data-kind="service" data-id="${escapeHtml(
    service.id,
  )}" data-name="${escapeHtml(service.name)}">
          <span>${active ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  `;
}

function renderCategoryCard(category, rules) {
  const active = category.active || false;
  const badge = getCategoryBadge(category);

  return `
    <div class="service-card ${
      active ? 'active' : ''
    }" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
           <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: var(--accent); border: 1px solid var(--glass-border); flex-shrink: 0;">
             ${badge}
           </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
             <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
               category.name,
             )}</div>
             <div class="stat-lbl" style="font-size: 10px;">Category</div>
           </div>
        </div>
        <button class="toggle-switch-btn ${
          active ? 'active' : ''
        }" data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
          <span>${active ? 'ON' : 'OFF'}</span>
        </button>
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

  container.querySelectorAll('.quick-add-domain').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-domain');
      const name = btn.getAttribute('data-name');
      await updateRule(storage, buildRule(id, 'domain', name, true));
      if (isConfigured) {
        await nextDNSApi.setDenylistDomainState(id, true);
      }
      chrome.runtime.sendMessage({ action: 'manualSync' });
      refreshListOnly();
    });
  });

  container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kind = btn.getAttribute('data-kind');
      const id = btn.getAttribute('data-id') || btn.getAttribute('data-pkg');
      const active = btn.classList.contains('active');

      if (kind === 'domain') {
        const rule = rules.find(
          (r) => (r.customDomain || r.packageName) === id,
        );
        if (rule) {
          await updateRule(storage, {
            ...rule,
            blockedToday: !active,
            mode: !active ? 'block' : 'allow',
            desiredBlockingState: !active,
            updatedAt: Date.now(),
          });
        }
      }

      if (isConfigured) {
        if (kind === 'service') {
          await nextDNSApi.setServiceState(id, !active);
        }
        if (kind === 'category') {
          await nextDNSApi.setCategoryState(id, !active);
        }
        if (kind === 'domain') {
          await nextDNSApi.setDenylistDomainState(id, !active);
        }
      }

      chrome.runtime.sendMessage({ action: 'manualSync' });
      btn.classList.toggle('active', !active);
      btn.querySelector('span').innerText = !active ? 'ON' : 'OFF';
      btn.closest('.service-card').classList.toggle('active', !active);
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      if (confirm(`Remove shield directive for ${pkg}?`)) {
        await deleteRule(storage, pkg);
        if (isConfigured) {
          await nextDNSApi.setDenylistDomainState(pkg, false);
        }
        chrome.runtime.sendMessage({ action: 'manualSync' });
        refreshListOnly();
      }
    });
  });

  container.querySelectorAll('.edit-limit').forEach((input) => {
    input.addEventListener('change', async () => {
      const pkg = input.getAttribute('data-pkg');
      const val = parseInt(input.value, 10) || 0;
      const rule = rules.find((r) => (r.customDomain || r.packageName) === pkg);
      if (rule) {
        await updateRule(storage, {
          ...rule,
          dailyLimitMinutes: val,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
      }
    });
  });
}
