import { getRules, updateRule, deleteRule } from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import {
  getServiceIcon,
  getCategoryBadge,
  getDomainIcon,
} from '../lib/appCatalog.js';

let activeTab = 'domains';
let availableServices = [];
let availableCategories = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let isConfigured = false;

export async function renderAppsScreen(container) {
  const rules = await getRules(storage);
  isConfigured = await nextDNSApi.isConfigured();

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
      <div class="section-title">Custom Domain Rules (${
        visibleRules.length
      })</div>
      <div class="app-list">
        ${
          visibleRules.length
            ? visibleRules.map((rule) => renderDomainRuleCard(rule)).join('')
            : '<div class="empty-state" style="height: 120px;">No matching domain rules yet.</div>'
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
  const active = rule.mode === 'block' && rule.blockedToday;
  return `
    <div class="app-card rule-card" data-pkg="${escapeHtml(
      rule.packageName,
    )}" data-name="${escapeHtml(
    rule.appName,
  )}" style="display:flex; align-items:center; justify-content:space-between; gap: 12px;">
      <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
        <img src="${getDomainIcon(domain)}" alt="" class="app-icon">
        <div class="app-info" style="min-width: 0;">
          <div class="stat-val" style="font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
            rule.appName,
          )}</div>
          <div class="stat-lbl">${escapeHtml(domain)}</div>
        </div>
      </div>
      <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
        <button class="toggle-switch-btn ${
          active ? 'active' : ''
        }" data-kind="domain" data-id="${escapeHtml(
    domain,
  )}" data-pkg="${escapeHtml(rule.packageName)}">
          <span>${active ? 'ON' : 'OFF'}</span>
        </button>
        <button class="btn-outline delete-rule" data-pkg="${escapeHtml(
          rule.packageName,
        )}" style="padding: 6px;">Delete</button>
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
  const iconNode =
    icon.kind === 'remote'
      ? `<img src="${icon.url}" alt="" class="app-icon" style="background:${icon.accent}15;">`
      : `<div class="app-icon app-icon-fallback" style="background:${icon.accent}22; color:${icon.accent};">${icon.label}</div>`;

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    service.id,
  )}" data-type="service" data-name="${escapeHtml(service.name)}">
      ${iconNode}
      <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
        <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
          service.name,
        )}</div>
        <div class="stat-lbl">NextDNS parental control</div>
      </div>
      <button class="toggle-switch-btn ${
        active ? 'active' : ''
      }" data-kind="service" data-id="${escapeHtml(
    service.id,
  )}" data-name="${escapeHtml(service.name)}">
        <span>${active ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  `;
}

function renderCategoryCard(category, rules) {
  const localRule = rules.find(
    (rule) => rule.packageName === category.id && rule.type === 'category',
  );
  const active = category.active ?? localRule?.blockedToday ?? false;
  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    category.id,
  )}" data-type="category" data-name="${escapeHtml(category.name)}">
      <div class="app-icon app-icon-fallback" style="background: rgba(124, 111, 247, 0.16); color: var(--accent);">
        ${escapeHtml(getCategoryBadge(category))}
      </div>
      <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
        <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
          category.name,
        )}</div>
        <div class="stat-lbl">${escapeHtml(category.id)}</div>
      </div>
      <button class="toggle-switch-btn ${
        active ? 'active' : ''
      }" data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
        <span>${active ? 'ON' : 'OFF'}</span>
      </button>
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
    chrome.runtime.sendMessage({ action: 'manualSync' });
    renderAppsScreen(container);
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
            updatedAt: Date.now(),
          });
          if (isConfigured) {
            await nextDNSApi.setDenylistDomainState(id, nextActive);
          }
        }

        chrome.runtime.sendMessage({ action: 'manualSync' });
        renderAppsScreen(container);
      } catch (error) {
        alert(`Toggle failed: ${error.message}`);
        btn.removeAttribute('disabled');
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
