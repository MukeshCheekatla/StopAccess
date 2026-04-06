/**
 * PrivacyPage
 * Full dashboard tab for NextDNS Privacy settings.
 */

import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../background/platformAdapter';
import { createPrivacyVM } from '../../../../packages/viewmodels/src/usePrivacyVM';
import { renderBlocklistsSection } from './components/BlocklistsSection';
import { renderNativeTrackersSection } from './components/NativeTrackersSection';
import { renderPrivacyOptionsSection } from './components/PrivacyOptionsSection';
import { toast } from '../../lib/toast';
import { buildDashboardTabPath, getRootDomain } from '@focusgate/core';

const vm = createPrivacyVM(storage, nextDNSApi);

// SVG icons
const iconShield =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const iconWifi =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 10a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';
const iconLayers =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
const iconLock =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconAlert =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const iconArrowRight =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

export async function renderPrivacyPage(container: HTMLElement): Promise<void> {
  if (!container) {
    return;
  }

  const { settings, isConfigured, error } = await vm.load();

  if (!isConfigured) {
    container.innerHTML = renderNotConfigured();
    container
      .querySelector('#btn_goto_settings_from_privacy')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
    return;
  }

  if (error || !settings) {
    container.innerHTML = renderError(error ?? 'Unknown error');
    container
      .querySelector('#btn_retry_privacy')
      ?.addEventListener('click', () => renderPrivacyPage(container));
    return;
  }

  const blocklistCount = await vm.getActiveBlocklistCount();
  const nativeCount = await vm.getActiveNativeCount();
  const disguisedActive = settings.disguisedTrackers;
  const availableBlocklists = await vm.getAvailableBlocklists();

  container.innerHTML = `
    <!-- Summary badges (Scan results) -->
    <div class="fg-grid fg-grid-cols-3 fg-gap-4 fg-mb-8">
      <div class="fg-flex fg-flex-col fg-gap-1 fg-p-5 fg-rounded-3xl fg-transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-1">
          <span class="fg-text-[10px] fg-font-black fg-uppercase fg-tracking-widest" style="color: ${
            blocklistCount > 0 ? 'var(--green)' : 'var(--muted)'
          }; opacity: 0.8;">Filters</span>
          <span style="color: ${
            blocklistCount > 0 ? 'var(--green)' : 'var(--muted)'
          };">${iconShield}</span>
        </div>
        <div class="fg-text-3xl fg-font-black fg-text-[var(--text)]">${blocklistCount}</div>
        <div class="fg-text-[11px] fg-text-[var(--muted)] fg-font-bold">Active Blocklists</div>
      </div>

      <div class="fg-flex fg-flex-col fg-gap-1 fg-p-5 fg-rounded-3xl fg-transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-1">
          <span class="fg-text-[10px] fg-font-black fg-uppercase fg-tracking-widest" style="color: ${
            nativeCount > 0 ? 'rgb(56,189,248)' : 'var(--muted)'
          }; opacity: 0.8;">Tracking</span>
          <span style="color: ${
            nativeCount > 0 ? 'rgb(56,189,248)' : 'var(--muted)'
          };">${iconWifi}</span>
        </div>
        <div class="fg-text-3xl fg-font-black fg-text-[var(--text)]">${nativeCount}</div>
        <div class="fg-text-[11px] fg-text-[var(--muted)] fg-font-bold">Native Rules</div>
      </div>

      <div class="fg-flex fg-flex-col fg-gap-1 fg-p-5 fg-rounded-3xl fg-transition-all" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-1">
          <span class="fg-text-[10px] fg-font-black fg-uppercase fg-tracking-widest" style="color: ${
            disguisedActive ? 'rgb(168,85,247)' : 'var(--muted)'
          }; opacity: 0.8;">Stealth</span>
          <span style="color: ${
            disguisedActive ? 'rgb(168,85,247)' : 'var(--muted)'
          };">${iconLayers}</span>
        </div>
        <div class="fg-text-3xl fg-font-black fg-text-[var(--text)]">${
          disguisedActive ? 'ON' : 'OFF'
        }</div>
        <div class="fg-text-[11px] fg-text-[var(--muted)] fg-font-bold">Cloaking Protection</div>
      </div>
    </div>

    <!-- Sections -->
    ${renderPrivacyOptionsSection(settings)}
    ${renderNativeTrackersSection(settings.natives ?? [])}
    ${renderBlocklistsSection(settings.blocklists ?? [], availableBlocklists)}
  `;

  attachHandlers(container);
}

function attachHandlers(container: HTMLElement): void {
  // Blocklist Search (Main Section)
  const searchMain = container.querySelector(
    '#blocklist-search-main',
  ) as HTMLInputElement;
  const gridMain = container.querySelector(
    '#blocklists-grid-main',
  ) as HTMLElement;
  if (searchMain && gridMain) {
    searchMain.addEventListener('input', () => {
      const q = searchMain.value.toLowerCase().trim();
      const cards = gridMain.querySelectorAll('.blocklist-card');
      cards.forEach((card: any) => {
        const nameEl = card.querySelector('.fg-font-bold') as HTMLElement;
        const name = nameEl ? (nameEl.textContent || '').toLowerCase() : '';
        if (name.includes(q)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Blocklist Drawer Discovery
  const drawerOverlay = container.querySelector(
    '#blocklist-drawer-overlay',
  ) as HTMLElement;
  const drawer = container.querySelector('#blocklist-drawer') as HTMLElement;
  const openDrawerBtn = container.querySelector('#open-blocklist-drawer');
  const closeDrawerBtn = container.querySelector('#close-blocklist-drawer');

  const openDrawer = () => {
    if (!drawerOverlay || !drawer) {
      return;
    }
    drawerOverlay.style.display = 'flex';
    setTimeout(() => {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }, 10);
  };

  const closeDrawer = () => {
    if (!drawerOverlay || !drawer) {
      return;
    }
    drawer.style.opacity = '0';
    drawer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      drawerOverlay.style.display = 'none';
    }, 300);
  };

  if (openDrawerBtn) {
    openDrawerBtn.addEventListener('click', openDrawer);
  }
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawerBtnClick);
  }
  function closeDrawerBtnClick() {
    closeDrawer();
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) {
        closeDrawer();
      }
    });

    // Delegate icon load/error events to bypass CSP inline handler restrictions
    if (!(container as any).__iconListenersAttached) {
      container.addEventListener(
        'load',
        (e) => {
          const target = e.target as HTMLImageElement;
          if (target.tagName === 'IMG' && target.dataset.type === 'blocklist') {
            target.style.display = 'block';
            if (target.previousElementSibling) {
              (target.previousElementSibling as HTMLElement).style.display =
                'none';
            }
          }
        },
        true,
      );

      container.addEventListener(
        'error',
        (e) => {
          const target = e.target as HTMLImageElement;
          if (target.tagName === 'IMG' && target.dataset.type === 'blocklist') {
            const domain = target.dataset.domain;
            if (domain && !target.dataset.triedFallback) {
              target.dataset.triedFallback = 'true';
              target.src = `https://www.google.com/s2/favicons?domain=${getRootDomain(
                domain,
              )}&sz=64`;
            } else {
              target.style.display = 'none';
              if (target.previousElementSibling) {
                (target.previousElementSibling as HTMLElement).style.display =
                  'flex';
              }
            }
          }
        },
        true,
      );
      (container as any).__iconListenersAttached = true;
    }
  }

  // Drawer Search
  const searchDrawer = container.querySelector(
    '#blocklist-search-drawer',
  ) as HTMLInputElement;
  const drawerList = container.querySelector(
    '#blocklist-drawer-list',
  ) as HTMLElement;
  if (searchDrawer && drawerList) {
    searchDrawer.addEventListener('input', () => {
      const q = searchDrawer.value.toLowerCase().trim();
      const rows = drawerList.querySelectorAll('.blocklist-row');
      rows.forEach((row: any) => {
        const name = row.getAttribute('data-name') || '';
        const desc = row.getAttribute('data-desc') || '';
        if (name.includes(q) || desc.includes(q)) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Blocklist card & row clicks
  container
    .querySelectorAll('.blocklist-card, .blocklist-row')
    .forEach((el) => {
      el.addEventListener('click', async (e) => {
        const btn = el.querySelector('.blocklist-toggle-btn') as HTMLElement;
        if (!btn || e.target === btn || btn.contains(e.target as Node)) {
          return;
        }
        btn.click();
      });
    });

  container.querySelectorAll('.blocklist-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id')!;
      const active = btn.getAttribute('data-active') === 'true';

      const card = btn.closest('.blocklist-card') as HTMLElement;
      applyCardUI(card, btn as HTMLElement, !active);

      let result: { ok: boolean; error?: string };
      if (!active) {
        result = await vm.addBlocklist(id);
        if (result.ok) {
          toast.success(`${id} enabled`);
        }
      } else {
        result = await vm.removeBlocklist(id);
        if (result.ok) {
          toast.success(`${id} removed`);
        }
      }

      if (!result.ok) {
        applyCardUI(card, btn as HTMLElement, active); // revert
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });

  // Native tracker card clicks
  container.querySelectorAll('.native-toggle-card').forEach((card) => {
    card.addEventListener('click', async (e) => {
      const btn = card.querySelector('.native-toggle-btn') as HTMLElement;
      if (!btn) {
        return;
      }
      if (e.target === btn || btn.contains(e.target as Node)) {
        return;
      }
      btn.click();
    });
  });

  container.querySelectorAll('.native-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id')!;
      const active = btn.getAttribute('data-active') === 'true';

      applyToggleUI(btn as HTMLElement, !active);

      let result: { ok: boolean; error?: string };
      if (!active) {
        result = await vm.addNativeTracking(id);
        if (result.ok) {
          toast.success(`${id} tracking blocked`);
        }
      } else {
        result = await vm.removeNativeTracking(id);
        if (result.ok) {
          toast.success(`${id} tracking allowed`);
        }
      }

      if (!result.ok) {
        applyToggleUI(btn as HTMLElement, active);
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });

  // Privacy option toggles
  container.querySelectorAll('.privacy-option-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.getAttribute('data-key') as
        | 'disguisedTrackers'
        | 'allowAffiliate';
      const active = btn.getAttribute('aria-checked') === 'true';
      const newVal = !active;

      applyToggleUI(btn as HTMLElement, newVal);

      let result: { ok: boolean; error?: string };
      if (key === 'disguisedTrackers') {
        result = await vm.toggleDisguisedTrackers(newVal);
      } else {
        result = await vm.toggleAllowAffiliate(newVal);
      }

      if (!result.ok) {
        applyToggleUI(btn as HTMLElement, active);
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });
}

function applyCardUI(
  card: HTMLElement | null,
  btn: HTMLElement,
  active: boolean,
): void {
  if (card) {
    card.setAttribute('data-active', String(active));
  }
  btn.setAttribute('data-active', String(active));
  btn.setAttribute('aria-pressed', String(active));
  btn.style.background = active
    ? 'rgba(0,196,140,0.12)'
    : 'rgba(255,255,255,0.04)';
  btn.style.borderColor = active
    ? 'rgba(0,196,140,0.35)'
    : 'rgba(255,255,255,0.12)';
  btn.style.color = active ? 'var(--green)' : 'var(--muted)';
  if (active) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

function applyToggleUI(btn: HTMLElement, active: boolean): void {
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--green)';
    btn.setAttribute('data-active', 'true');
    btn.setAttribute('aria-checked', 'true');
  } else {
    btn.classList.remove('active');
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.setAttribute('data-active', 'false');
    btn.setAttribute('aria-checked', 'false');
  }
  const knob = btn.querySelector('span') as HTMLElement;
  if (knob) {
    knob.style.left = active ? '16px' : '2px';
  }
}

function renderNotConfigured(): string {
  return `
    <div class="app-card fg-text-center fg-py-10 fg-px-6" style="background: rgba(255,184,0,0.05); border-color: rgba(255,184,0,0.2);">
      <div class="fg-mb-4 fg-text-[var(--yellow)] fg-flex fg-justify-center">${iconLock}</div>
      <div class="fg-text-base fg-font-black fg-mb-2" style="color: var(--yellow);">NextDNS Required</div>
      <div class="fg-text-[13px] fg-text-[var(--muted)] fg-leading-normal fg-mb-5">
        Connect your NextDNS account in Settings to manage privacy filters.
      </div>
      <button class="btn" id="btn_goto_settings_from_privacy"
        style="background: rgba(255,184,0,0.1); color: var(--yellow); border: 1px solid rgba(255,184,0,0.2); display: flex; align-items: center; gap: 8px; justify-content: center;">
        Open Settings ${iconArrowRight}
      </button>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="app-card fg-text-center fg-py-10 fg-px-6" style="background: rgba(255,71,87,0.05); border-color: rgba(255,71,87,0.2);">
      <div class="fg-mb-4 fg-text-[var(--red)] fg-flex fg-justify-center">${iconAlert}</div>
      <div class="fg-text-base fg-font-black fg-text-[var(--red)] fg-mb-2">Failed to Load</div>
      <div class="fg-text-xs fg-text-[var(--muted)] fg-mb-5">${message}</div>
      <button class="btn btn-outline" id="btn_retry_privacy">Retry</button>
    </div>
  `;
}
