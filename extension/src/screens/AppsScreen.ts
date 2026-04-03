import { getRules, updateRule } from '@focusgate/state/rules';
import {
  POPULAR_DISTRACTIONS,
  UI_EXAMPLES,
  NEXTDNS_CATEGORIES,
  NEXTDNS_SERVICES,
  escapeHtml,
} from '@focusgate/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import {
  resolveServiceIcon as getServiceIcon,
  getCategoryBadge,
  resolveIconUrl as getDomainIcon,
} from '@focusgate/core';
import { appsController } from '../lib/appsController';
import { getLockedDomains } from '../background/sessionGuard';
import { toast } from '../lib/toast';

let activeTab = 'domains';
let availableServices = [];
let availableCategories = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let isConfigured = false;

export async function renderAppsScreen(container) {
  const rules = await getRules(storage);
  isConfigured = await nextDNSApi.isConfigured();
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';

  if (availableServices.length === 0 || availableCategories.length === 0) {
    const cached = (await chrome.storage.local.get([
      'cached_ndns_metadata',
    ])) as any;
    if (cached.cached_ndns_metadata) {
      availableServices = cached.cached_ndns_metadata.services || [];
      availableCategories = cached.cached_ndns_metadata.categories || [];
    }
  }

  container.innerHTML = `
    <div class="search-bar" style="margin-bottom: 20px;">
      <input type="text" placeholder="Search apps, services or domains..." id="appSearch" value="${escapeHtml(
        searchTerm,
      )}" class="input">
    </div>

    <div class="btn-group" style="margin-bottom: 24px;">
      <button class="btn-tab ${
        activeTab === 'domains' ? 'active' : ''
      }" data-tab="domains">Domains</button>
      <button class="btn-tab ${
        activeTab === 'services' ? 'active' : ''
      }" data-tab="services">Apps</button>
      <button class="btn-tab ${
        activeTab === 'categories' ? 'active' : ''
      }" data-tab="categories">Categories</button>
    </div>

    <div id="tabContent">
      <div class="app-card" style="background: rgba(255, 71, 87, 0.05); border-color: rgba(255, 71, 87, 0.2); margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--red); font-size: 14px; text-transform: uppercase; margin-bottom: 4px;">Emergency Protocol</div>
          <div style="font-size: 13px; color: var(--muted); line-height: 1.4;">Bypass all active blocks across all synchronized devices temporarily.</div>
        </div>
        <button class="btn btn-outline" id="panicButton" style="border-color: var(--red); color: var(--red); padding: 8px 16px; font-size: 14px;">Reset All</button>
      </div>

      ${
        syncMode === 'profile' || syncMode === 'hybrid'
          ? `
        <div class="app-card" style="background: rgba(255, 184, 0, 0.08); border-color: rgba(255, 184, 0, 0.3); margin-bottom: 24px; display: flex; align-items: center; gap: 12px; padding: 12px 16px;">
          <div style="font-size: 20px;">⚠️</div>
          <div style="font-size: 13px; line-height: 1.5; color: var(--text);">
            <strong style="color: var(--yellow);">Profile-Wide Enforcement Active.</strong> Changes to services and categories affect <strong>all devices</strong> linked to this NextDNS profile.
          </div>
        </div>
      `
          : ''
      }

      ${await renderSubTab(rules)}
    </div>
  `;

  const searchInput = container.querySelector('#appSearch');
  searchInput?.focus();
  searchInput?.setSelectionRange(searchTerm.length, searchTerm.length);
  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderAppsScreen(container);
  });

  container.querySelectorAll('.btn-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      renderAppsScreen(container);
    });
  });

  await setupHandlers(container, rules);
}

async function renderSubTab(rules) {
  const lockedDomains = await getLockedDomains();
  if (activeTab === 'domains') {
    const domainRules = rules.filter((r) => r.type === 'domain' || !r.type);
    const visibleRules = domainRules.filter(matchesSearch);

    return `
      <div class="app-card" style="border-style: dashed; background: transparent; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        <div class="section-title" style="margin-bottom: 0;">Add Custom Domain</div>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="newDomain" placeholder="e.g. ${
            UI_EXAMPLES.DOMAIN
          }" class="input" style="flex: 1;">
          <button class="btn" id="btnAddDomain" style="padding: 0 20px;">Add</button>
        </div>
        <div class="stat-lbl">If NextDNS is connected, this also updates your denylist.</div>
      </div>
      <div class="section-title">Popular Distractions</div>
      <div class="empty-state" style="height: auto; padding: 20px 0; border-style: dashed; background: transparent; opacity: 0.8; margin-bottom: 24px;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; margin-bottom: 12px;">Quick Add Recommended</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 0 10px;">
          ${POPULAR_DISTRACTIONS.filter(
            (d) => !rules.some((r) => r.customDomain === d.id),
          )
            .map(
              (d) =>
                `<button class="btn btn-outline quick-add-domain" data-domain="${d.id}" data-name="${d.name}" style="padding: 6px 14px; font-size: 13px; border-radius: 20px; border-color: rgba(255,255,255,0.1); color: var(--text);">+ ${d.name}</button>`,
            )
            .join('')}
        </div>
      </div>

      <div class="section-title">Your Custom Rules (${
        visibleRules.length
      })</div>
        ${
          visibleRules.length
            ? visibleRules
                .map((rule) => renderDomainRuleCard(rule, lockedDomains))
                .join('')
            : `
            <div class="empty-state" style="height: 160px; border-style: dashed; background: transparent; opacity: 0.8;">
              <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
              <div style="font-weight: 700;">Shield Is Idle</div>
              <div style="font-size: 13px; color: var(--muted); margin-top: 4px; max-width: 200px; text-align: center;">Add your first custom domain or NextDNS app to start enforcing focus.</div>
            </div>
            `
        }
      </div>
    `;
  }

  if (activeTab === 'services') {
    if (!isConfigured) {
      return renderNeedsLoginState(
        'Connect NextDNS in Settings to toggle real apps and services.',
      );
    }

    // Only show apps that are actually in local rules
    const activeApps = NEXTDNS_SERVICES.filter((std) =>
      rules.some((r) => r.packageName === std.id && r.type === 'service'),
    ).map((std) => {
      const synced = availableServices.find((s) => s.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });

    const visibleApps = activeApps.filter(matchesSearch);
    const availableToAdd = NEXTDNS_SERVICES.filter(
      (s) => !rules.some((r) => (r.customDomain || r.packageName) === s.id),
    );

    if (availableServices.length === 0 && isLoadingNextDNS) {
      return '<div class="loader">Loading NextDNS apps...</div>';
    }

    return `
      <div class="section-title">Shielded Apps (${visibleApps.length})</div>
      <div class="stat-lbl" style="margin-bottom: 12px;">Configured app perimeters under profile control.</div>
      <div class="service-grid">
        ${visibleApps
          .map((app) => renderServiceCard(app, rules, lockedDomains))
          .join('')}
      </div>

      <div class="section-title" style="margin-top: 32px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 24px;">Add More Apps</div>
      <div class="empty-state" style="height: auto; padding: 20px 0; border-style: dashed; background: transparent; opacity: 0.8; margin-bottom: 24px;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; margin-bottom: 12px;">Quick Add Recommended</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 0 10px;">
          ${availableToAdd
            .slice(0, 15)
            .map(
              (s) =>
                `<button class="btn btn-outline quick-add-service" data-id="${s.id}" data-name="${s.name}" style="padding: 6px 14px; font-size: 13px; border-radius: 20px; border-color: rgba(255,255,255,0.1); color: var(--text);">+ ${s.name}</button>`,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  if (activeTab === 'categories') {
    if (!isConfigured) {
      return renderNeedsLoginState(
        'Connect NextDNS in Settings to toggle real category blocks.',
      );
    }

    if (availableCategories.length === 0 && !isLoadingNextDNS) {
      loadNextDNSMetaData();
      return '<div class="loader">Loading NextDNS categories...</div>';
    }

    // Show all standard categories. Merge with current active state if synced.
    const allCategories = NEXTDNS_CATEGORIES.map((std) => {
      const synced = availableCategories.find((ac) => ac.id === std.id);
      return { ...std, active: synced?.active ?? false };
    });

    const visibleCategories = allCategories.filter(matchesSearch);
    return `
      <div class="section-title">Category Toggles (${
        visibleCategories.length
      })</div>
      <div class="stat-lbl" style="margin-bottom: 12px;">Use these for profile-wide categories like social networks, porn, games, and streaming.</div>
      <div class="service-grid">
        ${visibleCategories
          .map((category) => renderCategoryCard(category, rules, lockedDomains))
          .join('')}
      </div>
    `;
  }

  return '';
}

function renderNeedsLoginState(copy) {
  return `
    <div class="app-card" style="background: rgba(255, 184, 0, 0.05); border-color: rgba(255, 184, 0, 0.2);">
      <div class="section-title" style="margin-top: 0; color: var(--yellow);">NextDNS Login Required</div>
      <div style="font-size: 14px; line-height: 1.5; color: var(--text);">${copy}</div>
      <div class="stat-lbl" style="margin-top: 12px;">Open Settings, paste your NextDNS Profile ID and API key, then save.</div>
    </div>
  `;
}

function renderDomainRuleCard(rule, lockedDomains: string[] = []) {
  const domain = rule.customDomain || rule.packageName;
  const active = rule.blockedToday;
  const limitValue = rule.dailyLimitMinutes || 0;
  const usedValue = Math.round(rule.usedMinutesToday || 0);
  const extensionsUsed = rule.extensionCountToday || 0;
  const isLocked = lockedDomains.includes(rule.packageName);

  const limitOptions = [
    { value: 0, label: 'No Limit' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];

  const isCustomLimit =
    limitValue > 0 && !limitOptions.some((o) => o.value === limitValue);
  const optionsHtml =
    limitOptions
      .map(
        (o) =>
          `<option value="${o.value}" ${
            o.value === limitValue ? 'selected' : ''
          }>${o.label}</option>`,
      )
      .join('') +
    (isCustomLimit
      ? `<option value="${limitValue}" selected>${limitValue} min</option>`
      : '');

  // Progress bar
  let progressHtml = '';
  if (limitValue > 0) {
    const pct = Math.min(100, Math.round((usedValue / limitValue) * 100));
    const barColor =
      pct >= 100 ? 'var(--red)' : pct >= 75 ? 'var(--yellow)' : 'var(--accent)';
    progressHtml = `
      <div style="margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 11px; color: var(--muted);">${usedValue}m used</span>
          <span style="font-size: 11px; color: ${
            pct >= 100 ? 'var(--red)' : 'var(--muted)'
          }; font-weight: 700;">${pct}%</span>
        </div>
        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  // Extensions badge
  let extensionBadge = '';
  if (extensionsUsed > 0) {
    extensionBadge = `
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
        <div style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(108, 71, 255, 0.1); border: 1px solid rgba(108, 71, 255, 0.2); color: #9f8cff; font-weight: 800;">
          ${extensionsUsed}/5 extensions used today
        </div>
      </div>
    `;
  }

  return `
    <div class="app-card rule-card" data-pkg="${escapeHtml(
      rule.packageName,
    )}" data-name="${escapeHtml(
    rule.appName,
  )}" style="display:flex; flex-direction:column; gap: 12px; padding: 16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap: 12px;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          <img src="${getDomainIcon(domain)}" alt="" class="app-icon">
          <div class="app-info" style="min-width: 0;">
            <div class="stat-val" style="font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
              rule.appName,
            )}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
              <div class="stat-lbl">${escapeHtml(domain)}</div>
              <div style="font-size: 8px; padding: 2px 6px; border-radius: 4px; background: ${
                rule.scope === 'profile'
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.05)'
              }; color: ${
    rule.scope === 'profile' ? '#fff' : 'var(--muted)'
  }; font-weight: 800; border: 1px solid ${
    rule.scope === 'profile' ? 'transparent' : 'rgba(255,255,255,0.1)'
  };">
                ${rule.scope === 'profile' ? 'NEXTDNS' : 'LOCAL'}
              </div>
              ${
                active
                  ? '<div style="font-size: 8px; padding: 2px 6px; border-radius: 4px; background: rgba(255,71,87,0.1); color: var(--red); font-weight: 800; border: 1px solid rgba(255,71,87,0.2);">BLOCKED</div>'
                  : ''
              }
            </div>
          </div>
        </div>
        <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="domain" data-id="${escapeHtml(domain)}" data-pkg="${escapeHtml(
    rule.packageName,
  )}">
            <span>${active ? 'BLOCK' : 'ALLOW'}</span>
          </button>
          <button class="btn-outline delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(rule.packageName)}" style="padding: 6px;">
            ${isLocked ? '🔒' : 'Delete'}
          </button>
        </div>
      </div>
      
      <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style="color: var(--muted);">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase;">Daily Limit</span>
          </div>
          <select class="input edit-limit-select" data-pkg="${escapeHtml(
            rule.packageName,
          )}" style="width: auto; min-width: 120px; padding: 6px 12px; font-size: 13px; font-weight: 700; text-align: right; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: var(--text); appearance: auto;">
            ${optionsHtml}
          </select>
        </div>
        ${progressHtml}
        ${extensionBadge}
      </div>
    </div>
  `;
}

function renderServiceCard(service, rules, lockedDomains: string[] = []) {
  const icon = getServiceIcon(service);
  const localRule = rules.find(
    (rule) => rule.packageName === service.id && rule.type === 'service',
  );
  const active = service.active ?? localRule?.blockedToday ?? false;
  const isLocked = lockedDomains.includes(service.id);

  const iconNode =
    icon.kind === 'remote'
      ? `<img src="${icon.url}" alt="" class="app-icon" style="background:${icon.accent}15;">`
      : `<div class="app-icon app-icon-fallback" style="background:${icon.accent}22; color:${icon.accent};">${icon.label}</div>`;

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    service.id,
  )}" data-type="service" data-name="${escapeHtml(
    service.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          ${iconNode}
          <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
            <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
              service.name,
            )}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
              <div class="stat-lbl" style="font-size: 10px;">App</div>
              <div style="font-size: 8px; padding: 1px 4px; border-radius: 4px; background: var(--accent); color: #fff; font-weight: 800;">PROFILE</div>
            </div>
          </div>
        </div>
        <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="service" data-id="${escapeHtml(
    service.id,
  )}" data-name="${escapeHtml(service.name)}">
            <span>${active ? 'ON' : 'OFF'}</span>
          </button>
          <button class="btn-outline delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(
    service.id,
  )}" style="padding: 6px; font-size: 10px;">
            ${isLocked ? '🔒' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCategoryCard(category, rules, lockedDomains: string[] = []) {
  const localRule = rules.find(
    (rule) => rule.packageName === category.id && rule.type === 'category',
  );
  const active = category.active ?? localRule?.blockedToday ?? false;
  const isLocked = lockedDomains.includes(category.id);

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    category.id,
  )}" data-type="category" data-name="${escapeHtml(
    category.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          <div class="app-icon app-icon-fallback" style="background: rgba(124, 111, 247, 0.16); color: var(--accent);">
            ${escapeHtml(getCategoryBadge(category))}
          </div>
          <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
            <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
              category.name,
            )}</div>
            <div class="stat-lbl" style="font-size: 10px;">Category Blocking</div>
          </div>
        </div>
        <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
          <span>${active ? 'ON' : 'OFF'}</span>
        </button>
        ${isLocked ? '<div style="font-size:12px;">🔒</div>' : ''}
      </div>
    </div>
  `;
}

async function setupHandlers(container, rules) {
  const btnAdd = container.querySelector('#btnAddDomain');
  const inputAdd = container.querySelector('#newDomain');
  btnAdd?.addEventListener('click', async () => {
    const domain = sanitizeDomain(inputAdd.value);
    if (!domain) {
      toast.error(`Enter a valid domain like ${UI_EXAMPLES.DOMAIN}`);
      return;
    }

    const result = await appsController.addDomainRule(domain);
    if (result.ok) {
      renderAppsScreen(container);
    }
  });

  container.querySelectorAll('.quick-add-domain').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const domain = btn.getAttribute('data-domain');
      const result = await appsController.addDomainRule(domain);
      if (result.ok) {
        renderAppsScreen(container);
      }
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const packageName = btn.getAttribute('data-pkg');
      const result = await appsController.removeRule(packageName, rules);
      if (result.ok) {
        renderAppsScreen(container);
      }
    });
  });

  container.querySelectorAll('.quick-add-service').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name') || id;
      const result = await appsController.toggleRule(
        'service',
        id,
        name,
        true,
        rules,
      );
      if (result.ok) {
        renderAppsScreen(container);
      }
    });
  });

  container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const id = btn.getAttribute('data-id');
      const kind = btn.getAttribute('data-kind');
      const name = btn.getAttribute('data-name') || id;
      const active = btn.classList.contains('active');
      const targetState = !active;

      btn.style.opacity = '0.5';

      const result = await appsController.toggleRule(
        kind,
        id,
        name,
        targetState,
        rules,
      );
      if (result.ok) {
        renderAppsScreen(container);
      } else {
        btn.style.opacity = '1';
      }
    });
  });

  container
    .querySelector('#panicButton')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector('#panicButton') as HTMLButtonElement;

      // Custom UI Confirmation for Panic
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:320px; z-index:10000; padding:32px; text-align:center; background:rgba(20,20,20,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color:white;">
          <div style="font-size:32px; margin-bottom:16px;">🆘</div>
          <div style="font-size:16px; font-weight:900; color:var(--text); margin-bottom:12px; letter-spacing:1px;">EMERGENCY RESET?</div>
          <div style="font-size:12px; color:var(--muted); line-height:1.6; margin-bottom:24px;">This will wipe local state and re-sync with the cloud hub. Use only if rules are stuck.</div>
          <div style="display:flex; gap:12px; justify-content:center;">
            <button class="btn-cancel" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text); padding:10px; border-radius:12px; cursor:pointer; font-weight:800; font-size:11px;">CANCEL</button>
            <button class="btn-confirm" style="flex:1; background:var(--red); border:none; color:white; padding:10px; border-radius:12px; cursor:pointer; font-weight:800; font-size:11px;">RESET</button>
          </div>
        </div>
        <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; backdrop-filter:blur(4px);"></div>
      `;
      document.body.appendChild(modalContainer);

      const cleanup = () => document.body.removeChild(modalContainer);
      modalContainer
        .querySelector('.btn-cancel')
        ?.addEventListener('click', cleanup);
      modalContainer
        .querySelector('.btn-confirm')
        ?.addEventListener('click', async () => {
          cleanup();
          btn.innerText = 'Resetting...';
          btn.disabled = true;

          try {
            await storage.set(STORAGE_KEYS.RULES, JSON.stringify([]));
            if (isConfigured) {
              await nextDNSApi.unblockAll();
            }
            chrome.runtime.sendMessage({ action: 'manualSync' });
            renderAppsScreen(container);
          } catch (err) {
            toast.error(`Reset failed: ${err.message}`);
            btn.innerText = 'Reset All';
            btn.disabled = false;
          }
        });
    });

  container.querySelectorAll('.edit-limit-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const pkg = select.getAttribute('data-pkg');
      const val = parseInt((select as HTMLSelectElement).value, 10) || 0;
      const rule = rules.find((r) => r.packageName === pkg);
      if (rule) {
        const usedToday = rule.usedMinutesToday || 0;
        // If new limit is less than already used, it will block immediately — that's expected
        await updateRule(storage, {
          ...rule,
          dailyLimitMinutes: val,
          mode: val > 0 ? 'limit' : rule.mode === 'limit' ? 'allow' : rule.mode,
          blockedToday: val > 0 && usedToday >= val,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        renderAppsScreen(container);
      }
    });
  });
}

async function loadNextDNSMetaData() {
  if (isLoadingNextDNS || !isConfigured) {
    return;
  }
  isLoadingNextDNS = true;
  try {
    const [services, categories] = await Promise.all([
      nextDNSApi.getParentalControlServices(),
      nextDNSApi.getParentalControlCategories(),
    ]);
    availableServices = services.ok ? services.data.filter((service) => service.id) : [];
    availableCategories = categories.ok
      ? categories.data.filter((category) => category.id)
      : [];
    await chrome.storage.local.set({
      cached_ndns_metadata: {
        services: availableServices,
        categories: availableCategories,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Failed to load NextDNS metadata', error);
  } finally {
    isLoadingNextDNS = false;
    const root = document.getElementById('mainContent');
    if (document.querySelector('[data-tab="apps"].active')) {
      renderAppsScreen(root);
    }
  }
}

function sanitizeDomain(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return clean.includes('.') ? clean : '';
}

function matchesSearch(entry) {
  if (!searchTerm) {
    return true;
  }
  const haystack = [entry.name, entry.id, entry.appName, entry.packageName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchTerm);
}
