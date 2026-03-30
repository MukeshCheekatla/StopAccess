import { getRules, updateRule, deleteRule } from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';
import {
  getServiceIcon,
  getCategoryBadge,
  getDomainIcon,
} from '../lib/appCatalog.js';
import { addActionLog } from '../lib/logger.js';

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
    const cached = await chrome.storage.local.get(['cached_ndns_metadata']);
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
      }" data-tab="services">NextDNS Apps</button>
      <button class="btn-tab ${
        activeTab === 'categories' ? 'active' : ''
      }" data-tab="categories">Categories</button>
    </div>

    <div id="tabContent">
      <div class="app-card" style="background: rgba(255, 71, 87, 0.05); border-color: rgba(255, 71, 87, 0.2); margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--red); font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Emergency Protocol</div>
          <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">Bypass all active blocks across all synchronized devices temporarily.</div>
        </div>
        <button class="btn btn-outline" id="panicButton" style="border-color: var(--red); color: var(--red); padding: 8px 16px; font-size: 12px;">Reset All</button>
      </div>

      ${
        syncMode === 'profile' || syncMode === 'hybrid'
          ? `
        <div class="app-card" style="background: rgba(255, 184, 0, 0.08); border-color: rgba(255, 184, 0, 0.3); margin-bottom: 24px; display: flex; align-items: center; gap: 12px; padding: 12px 16px;">
          <div style="font-size: 20px;">⚠️</div>
          <div style="font-size: 11px; line-height: 1.5; color: var(--text);">
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
  if (activeTab === 'domains') {
    const domainRules = rules.filter((r) => r.type === 'domain' || !r.type);
    const visibleRules = domainRules.filter(matchesSearch);

    return `
      <div class="app-card" style="border-style: dashed; background: transparent; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        <div class="section-title" style="margin-bottom: 0;">Add Custom Domain</div>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="newDomain" placeholder="e.g. facebook.com" class="input" style="flex: 1;">
          <button class="btn" id="btnAddDomain" style="padding: 0 20px;">Add</button>
        </div>
        <div class="stat-lbl">If NextDNS is connected, this also updates your denylist.</div>
      </div>
      <div class="section-title">Popular Distractions</div>
      <div class="empty-state" style="height: auto; padding: 20px 0; border-style: dashed; background: transparent; opacity: 0.8; margin-bottom: 24px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); font-weight: 700; margin-bottom: 12px;">Quick Add Recommended</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 0 10px;">
          ${[
            { id: 'facebook.com', name: 'Facebook' },
            { id: 'instagram.com', name: 'Instagram' },
            { id: 'reddit.com', name: 'Reddit' },
            { id: 'youtube.com', name: 'YouTube' },
            { id: 'x.com', name: 'X / Twitter' },
            { id: 'tiktok.com', name: 'TikTok' },
            { id: 'netflix.com', name: 'Netflix' },
            { id: 'twitch.tv', name: 'Twitch' },
            { id: 'discord.com', name: 'Discord' },
            { id: 'amazon.com', name: 'Amazon' },
          ]
            .filter((d) => !rules.some((r) => r.customDomain === d.id))
            .map(
              (d) =>
                `<button class="btn btn-outline quick-add-domain" data-domain="${d.id}" data-name="${d.name}" style="padding: 6px 14px; font-size: 11px; border-radius: 20px; border-color: rgba(255,255,255,0.1); color: var(--text);">+ ${d.name}</button>`,
            )
            .join('')}
        </div>
      </div>

      <div class="section-title">Your Custom Rules (${
        visibleRules.length
      })</div>
        ${
          visibleRules.length
            ? visibleRules.map((rule) => renderDomainRuleCard(rule)).join('')
            : `
            <div class="empty-state" style="height: 160px; border-style: dashed; background: transparent; opacity: 0.8;">
              <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
              <div style="font-weight: 700;">Shield Is Idle</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px; max-width: 200px; text-align: center;">Add your first custom domain or NextDNS app to start enforcing focus.</div>
            </div>
            `
        }
      </div>
    `;
  }

  if (activeTab === 'services') {
    if (!isConfigured) {
      return renderNeedsLoginState(
        'Connect NextDNS in Settings to toggle real parental-control apps.',
      );
    }

    if (availableServices.length === 0 && !isLoadingNextDNS) {
      loadNextDNSMetaData();
      return '<div class="loader">Loading NextDNS app list...</div>';
    }

    const visibleServices = availableServices.filter(matchesSearch);
    return `
      <div class="section-title">NextDNS App Toggles (${
        visibleServices.length
      })</div>
      <div class="stat-lbl" style="margin-bottom: 12px;">These switches write the real <code>active: true/false</code> state in your NextDNS parental-control services.</div>
      <div class="service-grid">
        ${visibleServices
          .map((service) => renderServiceCard(service, rules))
          .join('')}
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

    const visibleCategories = availableCategories.filter(matchesSearch);
    return `
      <div class="section-title">Category Toggles (${
        visibleCategories.length
      })</div>
      <div class="stat-lbl" style="margin-bottom: 12px;">Use these for profile-wide categories like social networks, porn, games, and streaming.</div>
      <div class="service-grid">
        ${visibleCategories
          .map((category) => renderCategoryCard(category, rules))
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
      <div style="font-size: 12px; line-height: 1.5; color: var(--text);">${copy}</div>
      <div class="stat-lbl" style="margin-top: 12px;">Open Settings, paste your NextDNS Profile ID and API key, then save.</div>
    </div>
  `;
}

function renderDomainRuleCard(rule) {
  const domain = rule.customDomain || rule.packageName;
  const active = rule.blockedToday;
  const limitValue = rule.dailyLimitMinutes || 0;

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
            </div>
          </div>
        </div>
        <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
          <button class="toggle-switch-btn ${
            active ? 'active' : ''
          }" data-kind="domain" data-id="${escapeHtml(
    domain,
  )}" data-pkg="${escapeHtml(rule.packageName)}">
            <span>${active ? 'BLOCK' : 'ALLOW'}</span>
          </button>
          <button class="btn-outline delete-rule" data-pkg="${escapeHtml(
            rule.packageName,
          )}" style="padding: 6px;">Delete</button>
        </div>
      </div>
      
      <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase;">Daily Limit (Minutes)</div>
        <div style="display:flex; align-items:center; gap: 8px;">
           <input type="number" class="input edit-limit" value="${limitValue}" data-pkg="${escapeHtml(
    rule.packageName,
  )}" style="width: 60px; padding: 4px 8px; font-size: 12px; text-align: center;">
           <span style="font-size: 11px; color: var(--muted);">min</span>
        </div>
      </div>
    </div>
  `;
}

function renderServiceCard(service, rules) {
  const icon = getServiceIcon(service);
  const localRule = rules.find(
    (rule) => rule.packageName === service.id && rule.type === 'service',
  );
  const active = service.active ?? localRule?.blockedToday ?? false;
  const limitValue = localRule?.dailyLimitMinutes || 0;

  const iconNode =
    icon.kind === 'remote'
      ? `<img src="${icon.url}" alt="" class="app-icon" style="background:${icon.accent}15;">`
      : `<div class="app-icon app-icon-fallback" style="background:${icon.accent}22; color:${icon.accent};">${icon.label}</div>`;

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    service.id,
  )}" data-type="service" data-name="${escapeHtml(
    service.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; min-height: 140px; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          ${iconNode}
          <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
            <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
              service.name,
            )}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
              <div class="stat-lbl" style="font-size: 10px;">NextDNS App</div>
              <div style="font-size: 8px; padding: 1px 4px; border-radius: 4px; background: var(--accent); color: #fff; font-weight: 800;">PROFILE</div>
            </div>
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

      <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           <input type="number" class="input edit-limit" value="${limitValue}" data-pkg="${escapeHtml(
    service.id,
  )}" style="width: 50px; padding: 4px; font-size: 11px; text-align: center;">
           <span style="font-size: 10px; color: var(--muted); font-weight: 700;">MIN</span>
        </div>
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase;">Daily Limit</div>
      </div>
    </div>
  `;
}

function renderCategoryCard(category, rules) {
  const localRule = rules.find(
    (rule) => rule.packageName === category.id && rule.type === 'category',
  );
  const active = category.active ?? localRule?.blockedToday ?? false;
  const limitValue = localRule?.dailyLimitMinutes || 0;

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    category.id,
  )}" data-type="category" data-name="${escapeHtml(
    category.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; min-height: 140px; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          <div class="app-icon app-icon-fallback" style="background: rgba(124, 111, 247, 0.16); color: var(--accent);">
            ${escapeHtml(getCategoryBadge(category))}
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

      <div style="display:flex; align-items:center; justify-content:space-between; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); width: 100%;">
        <div style="display:flex; align-items:center; gap: 8px;">
           <input type="number" class="input edit-limit" value="${limitValue}" data-pkg="${escapeHtml(
    category.id,
  )}" style="width: 50px; padding: 4px; font-size: 11px; text-align: center;">
           <span style="font-size: 10px; color: var(--muted); font-weight: 700;">MIN</span>
        </div>
        <div style="font-size: 9px; color: var(--muted); text-transform: uppercase;">Daily Limit</div>
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
      alert('Enter a valid domain like facebook.com');
      return;
    }

    await updateRule(storage, buildRule(domain, 'domain', domain, true));
    if (isConfigured) {
      await nextDNSApi.setDenylistDomainState(domain, true);
    }
    await addActionLog(`Added and blocked custom domain: ${domain}`, 'success');
    chrome.runtime.sendMessage({ action: 'manualSync' });
    renderAppsScreen(container);
  });

  container.querySelectorAll('.quick-add-domain').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const domain = btn.getAttribute('data-domain');
      const name = btn.getAttribute('data-name') || domain;
      await updateRule(storage, buildRule(domain, 'domain', name, true));
      if (isConfigured) {
        await nextDNSApi.setDenylistDomainState(domain, true);
      }
      await addActionLog(`Quick added and blocked: ${name}`, 'success');
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderAppsScreen(container);
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const packageName = btn.getAttribute('data-pkg');
      const rule = rules.find((entry) => entry.packageName === packageName);
      if (rule && isConfigured && rule.type === 'domain') {
        await nextDNSApi.setDenylistDomainState(
          rule.customDomain || rule.packageName,
          false,
        );
      }
      await deleteRule(storage, packageName);
      await addActionLog(`Deleted rule for: ${rule?.appName || packageName}`);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderAppsScreen(container);
    });
  });

  container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const id = btn.getAttribute('data-id');
      const kind = btn.getAttribute('data-kind');
      const name = btn.getAttribute('data-name') || id;
      const currentlyActive = btn.classList.contains('active');
      const nextActive = !currentlyActive;

      btn.setAttribute('disabled', 'disabled');

      try {
        if (kind === 'service') {
          await nextDNSApi.setParentalControlServiceState(id, nextActive);
          availableServices = availableServices.map((service) =>
            service.id === id ? { ...service, active: nextActive } : service,
          );
          await updateRule(storage, buildRule(id, 'service', name, nextActive));
        } else if (kind === 'category') {
          await nextDNSApi.setParentalControlCategoryState(id, nextActive);
          availableCategories = availableCategories.map((category) =>
            category.id === id ? { ...category, active: nextActive } : category,
          );
          await updateRule(
            storage,
            buildRule(id, 'category', name, nextActive),
          );
        } else if (kind === 'domain') {
          const pkg = btn.getAttribute('data-pkg');
          const domainRule = rules.find((rule) => rule.packageName === pkg);
          await updateRule(storage, {
            ...domainRule,
            mode: nextActive ? 'block' : 'allow',
            blockedToday: nextActive,
            desiredBlockingState: nextActive, // Capture intent
            updatedAt: Date.now(),
          });
          if (isConfigured) {
            await nextDNSApi.setDenylistDomainState(id, nextActive);
          }
        }

        chrome.runtime.sendMessage({ action: 'manualSync' });
        await addActionLog(
          `Toggled ${kind} ${name} to ${nextActive ? 'ON' : 'OFF'}`,
          nextActive ? 'success' : 'info',
        );
        renderAppsScreen(container);
      } catch (error) {
        await addActionLog(
          `Failed to toggle ${name}: ${error.message}`,
          'error',
        );
        alert(`Toggle failed: ${error.message}`);
        btn.removeAttribute('disabled');
      }
    });
  });

  container
    .querySelector('#panicButton')
    ?.addEventListener('click', async () => {
      const confirmed = confirm(
        'EMERGENCY RESET: This will delete all local rules and reset NextDNS parental controls. Continue?',
      );
      if (confirmed) {
        const btn = container.querySelector('#panicButton');
        btn.innerText = 'Resetting...';
        btn.disabled = true;

        try {
          // 1. Clear Local Rules
          await storage.set(STORAGE_KEYS.RULES, JSON.stringify([]));

          // 2. NextDNS unblock all
          if (isConfigured) {
            await nextDNSApi.unblockAll();
          }

          // 3. Sync
          chrome.runtime.sendMessage({ action: 'manualSync' });
          renderAppsScreen(container);
        } catch (err) {
          alert(`Reset failed: ${err.message}`);
          btn.innerText = 'Reset All';
          btn.disabled = false;
        }
      }
    });

  container.querySelectorAll('.edit-limit').forEach((input) => {
    input.addEventListener('change', async () => {
      const pkg = input.getAttribute('data-pkg');
      const val = parseInt(input.value, 10) || 0;
      const rule = rules.find((r) => r.packageName === pkg);
      if (rule) {
        await updateRule(storage, {
          ...rule,
          dailyLimitMinutes: val,
          mode: val > 0 ? 'limit' : rule.mode === 'limit' ? 'allow' : rule.mode,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
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
    availableServices = services.filter((service) => service.id);
    availableCategories = categories.filter((category) => category.id);
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

function buildRule(id, type, name, active) {
  return {
    appName: name,
    packageName: id,
    customDomain: type === 'domain' ? id : undefined,
    type,
    scope: type === 'domain' ? 'browser' : 'profile',
    mode: active ? 'block' : 'allow',
    addedByUser: true,
    blockedToday: active,
    desiredBlockingState: active,
    dailyLimitMinutes: 0,
    usedMinutesToday: 0,
    updatedAt: Date.now(),
  };
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
