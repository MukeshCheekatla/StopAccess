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
import { buildDashboardTabPath } from '@focusgate/core';
import type { NextDNSPrivacySettings } from '@focusgate/types';

const vm = createPrivacyVM(storage, nextDNSApi);

export async function renderPrivacyPage(container: HTMLElement): Promise<void> {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center;
      padding:40px;">
      <div class="loader"></div>
    </div>
  `;

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

  container.innerHTML = `
    <!-- Summary badges -->
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;">
      <div style="font-size:11px; font-weight:700; padding:4px 12px;
        border-radius:20px;
        background:${
          blocklistCount > 0 ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.04)'
        };
        color:${blocklistCount > 0 ? 'var(--green)' : 'var(--muted)'};
        border:1px solid ${
          blocklistCount > 0 ? 'rgba(0,196,140,0.2)' : 'rgba(255,255,255,0.06)'
        };">
        🚫 ${blocklistCount} Blocklist${blocklistCount !== 1 ? 's' : ''}
      </div>
      <div style="font-size:11px; font-weight:700; padding:4px 12px;
        border-radius:20px;
        background:${
          nativeCount > 0 ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.04)'
        };
        color:${nativeCount > 0 ? 'var(--green)' : 'var(--muted)'};
        border:1px solid ${
          nativeCount > 0 ? 'rgba(0,196,140,0.2)' : 'rgba(255,255,255,0.06)'
        };">
        📡 ${nativeCount} Native Tracker${nativeCount !== 1 ? 's' : ''}
      </div>
      <div style="font-size:11px; font-weight:700; padding:4px 12px;
        border-radius:20px;
        background:${
          disguisedActive ? 'rgba(0,196,140,0.1)' : 'rgba(255,255,255,0.04)'
        };
        color:${disguisedActive ? 'var(--green)' : 'var(--muted)'};
        border:1px solid ${
          disguisedActive ? 'rgba(0,196,140,0.2)' : 'rgba(255,255,255,0.06)'
        };">
        🎭 Disguised ${disguisedActive ? 'Blocked' : 'Allowed'}
      </div>
    </div>

    <!-- Sections -->
    ${renderBlocklistsSection(settings.blocklists ?? [])}
    ${renderNativeTrackersSection(settings.natives ?? [])}
    ${renderPrivacyOptionsSection(settings)}
  `;

  attachHandlers(container, settings);
}

function attachHandlers(
  container: HTMLElement,
  _settings: NextDNSPrivacySettings,
): void {
  // Blocklist toggles
  container.querySelectorAll('.blocklist-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const active = btn.getAttribute('data-active') === 'true';

      // Optimistic UI
      applyToggleUI(btn as HTMLElement, !active);

      let result: { ok: boolean; error?: string };
      if (!active) {
        result = await vm.addBlocklist(id);
        if (result.ok) {
          toast.success('Blocklist enabled');
        }
      } else {
        result = await vm.removeBlocklist(id);
        if (result.ok) {
          toast.success('Blocklist disabled');
        }
      }

      if (!result.ok) {
        applyToggleUI(btn as HTMLElement, active); // revert
        toast.error(result.error ?? 'Failed');
      } else {
        renderPrivacyPage(container);
      }
    });
  });

  // Native tracking toggles
  container.querySelectorAll('.native-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
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

function applyToggleUI(btn: HTMLElement, active: boolean): void {
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--accent)';
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
    knob.style.left = active ? '23px' : '3px';
  }
}

function renderNotConfigured(): string {
  return `
    <div class="app-card" style="background:rgba(255,184,0,0.05);
      border-color:rgba(255,184,0,0.2); text-align:center; padding:40px 24px;">
      <div style="font-size:40px; margin-bottom:16px;">🔒</div>
      <div style="font-size:16px; font-weight:900; color:var(--yellow);
        margin-bottom:8px;">NextDNS Required</div>
      <div style="font-size:13px; color:var(--muted); line-height:1.5;
        margin-bottom:20px;">
        Connect your NextDNS account in Settings to manage privacy filters.
      </div>
      <button class="btn" id="btn_goto_settings_from_privacy"
        style="background:rgba(255,184,0,0.1); color:var(--yellow);
          border:1px solid rgba(255,184,0,0.2);">
        Open Settings →
      </button>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="app-card" style="background:rgba(255,71,87,0.05);
      border-color:rgba(255,71,87,0.2); text-align:center; padding:40px 24px;">
      <div style="font-size:40px; margin-bottom:16px;">⚠️</div>
      <div style="font-size:16px; font-weight:900; color:var(--red);
        margin-bottom:8px;">Failed to Load</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:20px;">
        ${message}
      </div>
      <button class="btn btn-outline" id="btn_retry_privacy">Retry</button>
    </div>
  `;
}
