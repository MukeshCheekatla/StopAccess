import { updateRule } from '@focusgate/state/rules';
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
} from '../../background/platformAdapter';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { toast } from '../../lib/toast';

// Sub-components (Stateless UI Templates)
import { renderDomainRuleCard } from './components/DomainRuleCard';
import { renderServiceCard } from './components/ServiceCard';
import { renderCategoryCard } from './components/CategoryCard';

let activeTab = 'domains';
let availableServices = [];
let availableCategories = [];
let isLoadingNextDNS = false;
let searchTerm = '';
let isConfigured = false;

/**
 * AppsScreen
 * Unified entry point for managing app & domain blocking rules.
 */
export async function renderAppsScreen(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  const { loadAppsScreenData } = await import(
    '../../../../packages/viewmodels/src/useAppsScreenVM'
  );
  const data = await loadAppsScreenData();
  const rules = data.rules;
  isConfigured = data.isConfigured;
  const syncMode = data.syncMode;

  if (availableServices.length === 0 || availableCategories.length === 0) {
    availableServices = data.availableServices;
    availableCategories = data.availableCategories;
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
      ${
        context === 'page'
          ? `
      <div style="margin-bottom: 24px; display: flex; align-items: flex-end; justify-content: space-between;">
        <div>
          <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">Block List</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">Manage focus protocols and synced rules.</div>
        </div>
        <div class="status-badge ${isConfigured ? 'active' : ''}">
          ${isConfigured ? '⚡ CLOUD SYNC ACTIVE' : '🔌 OFFLINE MODE'}
        </div>
      </div>
      `
          : ''
      }
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

  const searchInput = container.querySelector('#appSearch') as HTMLInputElement;
  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(searchTerm.length, searchTerm.length);
    searchInput.addEventListener('input', (e: any) => {
      searchTerm = e.target.value.toLowerCase();
      renderAppsScreen(container);
    });
  }

  container.querySelectorAll('.btn-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab')!;
      renderAppsScreen(container);
    });
  });

  await setupHandlers(container, rules);
}

async function renderSubTab(rules: any[]): Promise<string> {
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

    if (availableServices.length === 0 && isLoadingNextDNS) {
      return '<div class="loader">Loading NextDNS apps...</div>';
    }

    // All apps — merged with live sync state (blocked = toggle ON)
    const allApps = NEXTDNS_SERVICES.map((std) => {
      const inRules = rules.some(
        (r) => r.packageName === std.id && r.type === 'service',
      );
      const synced = availableServices.find((s) => s.id === std.id);
      return { ...std, active: inRules ? synced?.active ?? true : false };
    }).filter(matchesSearch);

    // Blocked apps first
    const sorted = [
      ...allApps.filter((a) => a.active),
      ...allApps.filter((a) => !a.active),
    ];

    const blockedCount = allApps.filter((a) => a.active).length;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div class="section-title" style="margin: 0;">All Apps</div>
        <div class="status-badge ${
          blockedCount > 0 ? 'active' : ''
        }">${blockedCount} BLOCKED</div>
      </div>
      <div class="stat-lbl" style="margin-bottom: 16px;">Toggle any app to block it profile-wide via NextDNS.</div>
      <div class="service-grid">
        ${sorted
          .map((app) => renderServiceCard(app, rules, lockedDomains))
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

function renderNeedsLoginState(copy: string): string {
  return `
    <div class="app-card" style="background: rgba(255, 184, 0, 0.05); border-color: rgba(255, 184, 0, 0.2);">
      <div class="section-title" style="margin-top: 0; color: var(--yellow);">NextDNS Login Required</div>
      <div style="font-size: 14px; line-height: 1.5; color: var(--text);">${copy}</div>
      <div class="stat-lbl" style="margin-top: 12px;">Open Settings, paste your NextDNS Profile ID and API key, then save.</div>
    </div>
  `;
}

async function setupHandlers(
  container: HTMLElement,
  rules: any[],
): Promise<void> {
  const btnAdd = container.querySelector('#btnAddDomain');
  const inputAdd = container.querySelector('#newDomain') as HTMLInputElement;
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
      const domain = btn.getAttribute('data-domain')!;
      const result = await appsController.addDomainRule(domain);
      if (result.ok) {
        renderAppsScreen(container);
      }
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const packageName = btn.getAttribute('data-pkg')!;
      const result = await appsController.removeRule(packageName, rules);
      if (result.ok) {
        renderAppsScreen(container);
      }
    });
  });

  container.querySelectorAll('.quick-add-service').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
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
      const id = btn.getAttribute('data-id')!;
      const kind = btn.getAttribute('data-kind')!;
      const name = btn.getAttribute('data-name') || id;
      const active = btn.classList.contains('active');
      const targetState = !active;

      (btn as HTMLElement).style.opacity = '0.5';

      const result = await appsController.toggleRule(
        kind as any,
        id,
        name,
        targetState,
        rules,
      );
      if (result.ok) {
        renderAppsScreen(container);
      } else {
        (btn as HTMLElement).style.opacity = '1';
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
          } catch (err: any) {
            toast.error(`Reset failed: ${err.message}`);
            btn.innerText = 'Reset All';
            btn.disabled = false;
          }
        });
    });

  container.querySelectorAll('.edit-limit-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const pkg = select.getAttribute('data-pkg')!;
      const val = parseInt((select as HTMLSelectElement).value, 10) || 0;
      const rule = rules.find((r) => r.packageName === pkg);
      if (rule) {
        const usedToday = rule.usedMinutesToday || 0;
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

async function loadNextDNSMetaData(): Promise<void> {
  if (isLoadingNextDNS || !isConfigured) {
    return;
  }
  isLoadingNextDNS = true;
  try {
    const [servicesRes, categoriesRes] = await Promise.all([
      nextDNSApi.getParentalControlServices(),
      nextDNSApi.getParentalControlCategories(),
    ]);

    if ((servicesRes as any).ok) {
      availableServices = (servicesRes as any).data.filter((s: any) => s.id);
    }
    if ((categoriesRes as any).ok) {
      availableCategories = (categoriesRes as any).data.filter(
        (c: any) => c.id,
      );
    }
    await chrome.storage.local.set({
      [STORAGE_KEYS.CACHED_METADATA]: {
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
    if (document.querySelector('[data-tab="apps"].active') && root) {
      renderAppsScreen(root);
    }
  }
}

function sanitizeDomain(value: string): string {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return clean.includes('.') ? clean : '';
}

function matchesSearch(entry: any): boolean {
  if (!searchTerm) {
    return true;
  }
  const haystack = [entry.name, entry.id, entry.appName, entry.packageName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchTerm);
}
