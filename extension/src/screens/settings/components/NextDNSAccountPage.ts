import {
  UI_TOKENS,
  attachGlobalIconListeners,
  renderBrandLogo,
} from '../../../lib/ui';
import { toast } from '../../../lib/toast';
import { COLORS } from '../../../lib/designTokens';
import { escapeHtml } from '@stopaccess/core';

const iconExternal =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="fg-ml-1.5 fg-opacity-70"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
export async function renderNextDNSAccountPage(container: HTMLElement) {
  if (!container) {
    return;
  }

  const { loadSettingsData, connectNextDNSAction } = await import(
    '../../../../../packages/viewmodels/src/useSettingsVM'
  );

  const { profileId, apiKey, syncState } = await loadSettingsData();

  const isSetupActive = !!profileId && !!apiKey;
  const isOffline = !navigator.onLine;
  const safeProfileId = escapeHtml(String(profileId || ''));

  const getStatus = () => {
    if (isOffline) {
      return {
        label: 'OFFLINE',
        color: 'fg-text-amber-500',
        bg: 'fg-bg-amber-500/10',
      };
    }
    if (syncState.status === 'syncing') {
      return {
        label: 'SYNCING...',
        color: 'fg-text-blue-500',
        bg: 'fg-bg-blue-500/10',
      };
    }
    if (syncState.status === 'error') {
      return {
        label: 'ERROR',
        color: 'fg-text-rose-500',
        bg: 'fg-bg-rose-500/10',
      };
    }
    return {
      label: 'CONNECTED',
      color: 'fg-text-emerald-500',
      bg: 'fg-bg-emerald-500/10',
    };
  };

  const status = getStatus();

  container.innerHTML = `
    <div class="fg-p-10 fg-flex fg-flex-col fg-h-full">
      <div class="fg-flex fg-items-center fg-gap-4 fg-mb-10">
        <button id="backToSettings" class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[${
          COLORS.glassBg
        }] fg-border fg-border-[${COLORS.glassBorder}] fg-text-[${
    COLORS.text
  }] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 style="${
            UI_TOKENS.TEXT.HERO
          }; font-size: 24px; letter-spacing: -0.02em;">NextDNS Profile Sync</h1>
          <p style="${
            UI_TOKENS.TEXT.LABEL
          }; opacity: 0.5;">Remote service and rule synchronization</p>
        </div>
      </div>

          <div class="fg-grid fg-grid-cols-1 md:fg-grid-cols-2 fg-gap-10">
            <!-- Account Section -->
            <div class="fg-panel-premium fg-p-8 fg-rounded-[32px] fg-flex fg-flex-col fg-gap-8 fg-w-full md:fg-max-w-[480px]">
              <div class="fg-flex fg-items-start fg-justify-between">
                <div class="fg-flex fg-gap-5">
                  <div class="fg-text-[var(--fg-accent)]">
                    ${renderBrandLogo('nextdns.io', 'NextDNS', 48)}
                  </div>
                  <div>
                    <h2 style="${
                      UI_TOKENS.TEXT.HEADING
                    }; font-size: 20px;">Connection Status</h2>
                    <p style="${
                      UI_TOKENS.TEXT.SUBTEXT
                    }; margin-top: 4px;">Link your NextDNS account.</p>
                  </div>
                </div>
                ${
                  isSetupActive
                    ? `<div class="fg-flex fg-items-center fg-gap-2 ${status.bg} ${status.color} fg-px-4 fg-py-1.5 fg-rounded-full fg-text-[10px] fg-font-black fg-tracking-widest">${status.label}</div>`
                    : ''
                }
              </div>

              <div class="fg-space-y-6">
                <div class="fg-flex fg-flex-col fg-gap-3">
                  <label style="${UI_TOKENS.TEXT.LABEL}">Profile ID</label>
                  <div class="fg-flex fg-items-center fg-gap-3">
                    <input type="text" id="cfg_profile" value="${safeProfileId}" placeholder="e.g. abc123" 
                      class="input-premium fg-flex-1 fg-h-12 fg-px-5 fg-text-sm fg-font-bold ${
                        isSetupActive ? 'readonly-input' : ''
                      }" ${isSetupActive ? 'readonly' : ''} maxlength="12">
                    <button id="btn_open_nextdns_setup" class="fg-h-12 fg-px-4 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-flex fg-items-center fg-justify-center fg-text-[10px] fg-font-black fg-tracking-widest fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all fg-whitespace-nowrap">
                      <span>FIND ID</span>
                      ${iconExternal}
                    </button>
                  </div>
                </div>

                <div class="fg-flex fg-flex-col fg-gap-3">
                  <label style="${UI_TOKENS.TEXT.LABEL}">API Token</label>
                  <div class="fg-flex fg-items-center fg-gap-3">
                    <input type="password" id="cfg_apiKey" value="" placeholder="${
                      apiKey ? 'Token saved' : 'Paste API token'
                    }" 
                      class="input-premium fg-flex-1 fg-h-12 fg-px-5 fg-text-sm fg-font-bold ${
                        isSetupActive ? 'readonly-input' : ''
                      }" ${isSetupActive ? 'readonly' : ''}>
                    <button id="btn_open_nextdns_account" class="fg-h-12 fg-px-4 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-flex fg-items-center fg-justify-center fg-text-[10px] fg-font-black fg-tracking-widest fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all fg-whitespace-nowrap">
                      <span>GET KEY</span>
                      ${iconExternal}
                    </button>
                  </div>
                </div>
              </div>

              <div id="connection_feedback" class="fg-hidden fg-mt-4 fg-p-4 fg-rounded-xl fg-text-xs fg-font-bold fg-text-center"></div>

              <div class="fg-flex fg-gap-4">
                <button class="btn-premium fg-flex-1 fg-justify-center fg-h-12 fg-rounded-xl fg-text-xs fg-font-black fg-tracking-widest ${
                  isSetupActive ? 'fg-hidden' : ''
                }" id="btn_save_config" style="background: ${
    COLORS.inAppActiveBg
  }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">VERIFY & LINK</button>
                <button id="btn_edit_credentials" class="btn-secondary-v2 fg-flex-1 fg-justify-center fg-h-12 fg-rounded-xl fg-text-[10px] fg-font-black fg-tracking-widest ${
                  isSetupActive ? '' : 'fg-hidden'
                }">MODIFY CREDENTIALS</button>
              </div>
            </div>

            <!-- DNS Coverage Section -->
            <div class="fg-panel-premium fg-p-8 fg-rounded-[32px] fg-flex fg-flex-col fg-gap-6">
              <div class="fg-flex fg-gap-4">
                <div class="fg-text-violet-500">
                  ${renderBrandLogo('nextdns.io', 'NextDNS', 32)}
                </div>
                <div>
                  <h2 style="${
                    UI_TOKENS.TEXT.HEADING
                  }; font-size: 18px;">Browser DNS Coverage</h2>
                  <p style="${
                    UI_TOKENS.TEXT.SUBTEXT
                  }; margin-top: 2px;">Route all browser traffic through NextDNS.</p>
                </div>
              </div>

              <div class="fg-space-y-6">
                <div class="fg-flex fg-flex-col fg-gap-2">
                  <label style="${
                    UI_TOKENS.TEXT.LABEL
                  }; opacity: 0.5;">Private DoH Endpoint</label>
                  <div class="fg-flex fg-gap-3">
                    <input type="text" id="doh_url_display" value="https://dns.nextdns.io/${
                      safeProfileId || '-'
                    }" class="input-premium fg-flex-1 fg-h-10 fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-80 fg-font-mono fg-bg-transparent fg-border-0 fg-p-0" readonly>
                    <button id="btn_copy_doh_inline" class="btn-premium fg-px-5 fg-h-10 fg-text-[9px] fg-tracking-widest" style="background: ${
                      COLORS.inAppActiveBg
                    }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Copy URL</button>
                  </div>
                </div>
                
                <div>
                  <div class="fg-grid fg-grid-cols-3 fg-gap-2 fg-mb-3" id="dns_browser_tabs">
                    <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold fg-tracking-wider fg-border fg-transition-all active" data-tab="chrome">Chrome / Edge</button>
                    <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold fg-tracking-wider fg-border fg-transition-all" data-tab="firefox">Firefox</button>
                    <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold fg-tracking-wider fg-border fg-transition-all" data-tab="system">System</button>
                  </div>
                  
                  <div id="dns_steps_chrome" class="dns-steps-panel fg-space-y-3">
                    <div class="fg-flex fg-items-center fg-gap-6">
                      <div class="fg-grid fg-grid-cols-1 fg-gap-2 fg-flex-1">
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">1. chrome://settings/security</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">2. Enable "Use secure DNS"</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">3. Select "Custom" Provider</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">4. Paste your DoH URL</div>
                      </div>
                      <button id="btn_open_chrome_dns" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[9px] fg-tracking-widest fg-whitespace-nowrap fg-shrink-0">OPEN CHROME SETTINGS</button>
                    </div>
                  </div>
                  
                  <div id="dns_steps_firefox" class="dns-steps-panel fg-hidden fg-space-y-3">
                    <div class="fg-flex fg-items-center fg-gap-6">
                      <div class="fg-grid fg-grid-cols-1 fg-gap-2 fg-flex-1">
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">1. about:preferences#general</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">2. Network Settings</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">3. Enable DNS over HTTPS</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">4. Paste DoH URL</div>
                      </div>
                      <button id="btn_open_firefox_dns" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[9px] fg-tracking-widest fg-whitespace-nowrap fg-shrink-0">OPEN FIREFOX SETTINGS</button>
                    </div>
                  </div>
                  
                  <div id="dns_steps_system" class="dns-steps-panel fg-hidden fg-space-y-3">
                    <div class="fg-flex fg-items-center fg-gap-6">
                      <div class="fg-grid fg-grid-cols-1 fg-gap-2 fg-flex-1">
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">1. Install Desktop App</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">2. Use Config ID</div>
                        <div class="fg-text-[11px] fg-font-medium fg-opacity-60">3. Global protection</div>
                      </div>
                      <button id="btn_open_nextdns_download" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[9px] fg-tracking-widest fg-whitespace-nowrap fg-shrink-0">DOWNLOAD DESKTOP APP</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .dns-tab-btn { background: transparent; border: 1px solid var(--fg-glass-border); color: var(--fg-text); opacity: 0.6; cursor: pointer; }
      .dns-tab-btn.active { opacity: 1; background: var(--fg-in-app-active-bg) !important; color: var(--fg-in-app-active-text) !important; }
      .readonly-input { cursor: not-allowed; }
    </style>
    </div>
  `;

  // Listeners
  container.querySelector('#backToSettings')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('sa_navigate', { detail: { tab: 'settings' } }),
    );
  });

  const profileInput = container.querySelector(
    '#cfg_profile',
  ) as HTMLInputElement;
  const apiKeyInput = container.querySelector(
    '#cfg_apiKey',
  ) as HTMLInputElement;
  const saveBtn = container.querySelector(
    '#btn_save_config',
  ) as HTMLButtonElement;
  const editBtn = container.querySelector(
    '#btn_edit_credentials',
  ) as HTMLButtonElement;
  const feedback = container.querySelector(
    '#connection_feedback',
  ) as HTMLElement;

  editBtn?.addEventListener('click', () => {
    const isEditing = editBtn.classList.contains('active-edit');
    if (isEditing) {
      editBtn.classList.remove('active-edit');
      editBtn.innerText = 'MODIFY CREDENTIALS';
      saveBtn?.classList.add('fg-hidden');
      profileInput.readOnly = true;
      profileInput.classList.add('readonly-input');
      apiKeyInput.readOnly = true;
      apiKeyInput.classList.add('readonly-input');
    } else {
      editBtn.classList.add('active-edit');
      editBtn.innerText = 'CANCEL EDIT';
      saveBtn?.classList.remove('fg-hidden');
      profileInput.readOnly = false;
      profileInput.classList.remove('readonly-input');
      apiKeyInput.readOnly = false;
      apiKeyInput.classList.remove('readonly-input');
      apiKeyInput.focus();
    }
  });

  saveBtn?.addEventListener('click', async () => {
    const sanitizeCredential = (value: string) =>
      String(value || '')
        .trim()
        .split('')
        .filter((char) => char.charCodeAt(0) <= 127)
        .join('');
    const pid = sanitizeCredential(profileInput.value);
    const key = sanitizeCredential(apiKeyInput.value) || apiKey;

    if (!pid || !key) {
      toast.error('Profile ID and API Key are required');
      return;
    }

    saveBtn.innerText = 'VERIFYING...';
    saveBtn.disabled = true;
    feedback.classList.remove('fg-hidden');
    feedback.className =
      'fg-p-5 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-[var(--fg-glass-bg)] fg-text-[var(--fg-muted)]';
    feedback.innerText = 'Connecting to NextDNS...';

    try {
      const result = await connectNextDNSAction(pid, key);
      if (result.ok) {
        feedback.className =
          'fg-p-5 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-green-500/10 fg-text-green-500';
        feedback.innerText = 'Account Linked Successfully';
        toast.success('NextDNS account linked');
        setTimeout(() => renderNextDNSAccountPage(container), 1000);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (err: any) {
      feedback.className =
        'fg-p-5 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-red-500/10 fg-text-red-500';
      feedback.innerText = err.message;
      saveBtn.innerText = 'RETRY';
      saveBtn.disabled = false;
    }
  });

  const openWithIntent = (url: string, mode: 'setup' | 'api') => {
    chrome?.storage?.local?.set({
      fg_helper_intent: { mode, expiresAt: Date.now() + 10 * 60 * 1000 },
    });
    chrome.tabs.create({ url });
  };

  container
    .querySelector('#btn_open_nextdns_setup')
    ?.addEventListener('click', () => {
      openWithIntent('https://my.nextdns.io/setup', 'setup');
    });

  container
    .querySelector('#btn_open_nextdns_account')
    ?.addEventListener('click', () => {
      openWithIntent('https://my.nextdns.io/account', 'api');
    });

  // DNS Coverage Listeners
  const dohUrl = profileId
    ? `https://dns.nextdns.io/${profileId}`
    : 'https://dns.nextdns.io/-';
  container
    .querySelector('#btn_copy_doh_inline')
    ?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(dohUrl);
      const btn = container.querySelector(
        '#btn_copy_doh_inline',
      ) as HTMLButtonElement;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy URL';
      }, 2000);
    });

  const openExternal = (url: string) => {
    chrome.tabs.create({ url });
  };
  container
    .querySelector('#btn_open_chrome_dns')
    ?.addEventListener('click', () =>
      openExternal('chrome://settings/security'),
    );
  container
    .querySelector('#btn_open_firefox_dns')
    ?.addEventListener('click', () =>
      openExternal('about:preferences#general'),
    );
  container
    .querySelector('#btn_open_nextdns_download')
    ?.addEventListener('click', () => openExternal('https://nextdns.io'));

  container.querySelectorAll('.dns-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      container
        .querySelectorAll('.dns-tab-btn')
        .forEach((node) => node.classList.remove('active'));
      btn.classList.add('active');
      container
        .querySelectorAll('.dns-steps-panel')
        .forEach((panel) => panel.classList.add('fg-hidden'));
      container
        .querySelector(`#dns_steps_${tab}`)
        ?.classList.remove('fg-hidden');
    });
  });

  attachGlobalIconListeners(container);
}
