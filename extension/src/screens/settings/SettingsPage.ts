const iconGlobe =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
const iconLock =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconShield =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

import { toast } from '../../lib/toast';
import { checkGuard } from '../../background/sessionGuard';
import { UI_TOKENS, renderInfoTooltip } from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';

export async function renderSettingsPage(container) {
  if (!container) {
    return;
  }

  const {
    loadSettingsData,
    connectNextDNSAction,
    setStrictModeAction,
    setGuardianPinAction,
    requestPinResetAction,
    cancelPinResetAction,
    checkPinResetStatus,
    toggleChallengeAction,
    updateChallengeTextAction,
  } = await import('../../../../packages/viewmodels/src/useSettingsVM');

  const {
    profileId,
    apiKey,
    strict,
    syncState,
    challengeEnabled,
    challengeText,
  } = await loadSettingsData();

  // Clear any existing intervals to prevent 'increasing' accumulation
  if ((window as any).__pinResetInterval) {
    clearInterval((window as any).__pinResetInterval);
  }

  const dohUrl = profileId
    ? `https://dns.nextdns.io/${profileId}`
    : 'https://dns.nextdns.io/-';

  container.innerHTML = `
    <div class="fg-h-full" style="min-height: calc(100vh - 40px);">
      <main class="fg-overflow-y-auto fg-p-8 fg-max-w-6xl fg-mx-auto">
        <div class="fg-grid fg-grid-cols-2 fg-gap-6 settings-dual-grid">

          <div id="account_section_container">
            ${(
              await import('./components/AccountSection')
            ).renderAccountSection(profileId, apiKey, syncState)}
          </div>

          <section class="fg-panel-premium fg-p-6 fg-rounded-[28px]">
            <div class="fg-mb-6 fg-flex fg-gap-3">
               <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-violet-500/10 fg-flex fg-items-center fg-justify-center fg-text-violet-500">
                  ${iconGlobe}
                </div>
               <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Browser DNS Coverage</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 2px;">Use your endpoint for browser traffic outside extension rules.</p>
              </div>
            </div>
            <div class="fg-space-y-6">
              <div class="fg-flex fg-flex-col fg-gap-2">
                <label style="${
                  UI_TOKENS.TEXT.LABEL
                }; opacity: 0.5;">Private DoH Endpoint</label>
                <div class="fg-flex fg-gap-3">
                  <input type="text" id="doh_url_display" value="${dohUrl}" class="input-premium fg-flex-1 fg-h-10 fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-80 fg-font-mono fg-bg-transparent fg-border-0 fg-p-0" readonly>
                  <button id="btn_copy_doh_inline" class="btn-premium fg-px-5 fg-h-10 fg-text-[9px]  fg-tracking-widest" style="background: ${
                    COLORS.inAppActiveBg
                  }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Copy URL</button>
                </div>
              </div>
              <div>
                <div class="fg-grid fg-grid-cols-3 fg-gap-2 fg-mb-3" id="dns_browser_tabs">
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold  fg-tracking-wider fg-border fg-transition-all active" data-tab="chrome">Chrome / Edge</button>
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold  fg-tracking-wider fg-border fg-transition-all" data-tab="firefox">Firefox</button>
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-1.5 fg-text-[10px] fg-font-bold  fg-tracking-wider fg-border fg-transition-all" data-tab="system">System</button>
                </div>
                <div id="dns_steps_chrome" class="dns-steps-panel fg-space-y-2">
                  <button id="btn_open_chrome_dns" class="btn-secondary-v2 fg-px-4 fg-py-2 fg-text-[9px]  fg-tracking-widest fg-w-full fg-justify-center">Open Chrome DNS Settings</button>
                  <div class="fg-grid fg-grid-cols-2 fg-gap-x-4 fg-gap-y-1 fg-pt-1">
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">1. chrome://settings/security</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">2. Enable Use secure DNS</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">3. Select Custom Provider</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">4. Paste your DoH URL</div>
                  </div>
                </div>
                <div id="dns_steps_firefox" class="dns-steps-panel fg-hidden fg-space-y-2">
                  <button id="btn_open_firefox_dns" class="btn-secondary-v2 fg-px-4 fg-py-2 fg-text-[9px]  fg-tracking-widest fg-w-full fg-justify-center">Open Firefox Network Settings</button>
                  <div class="fg-grid fg-grid-cols-2 fg-gap-x-4 fg-gap-y-1 fg-pt-1">
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">1. about:preferences#general</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">2. Network Settings</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">3. Enable DNS over HTTPS</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">4. Paste DoH URL</div>
                  </div>
                </div>
                <div id="dns_steps_system" class="dns-steps-panel fg-hidden fg-space-y-2">
                  <button id="btn_open_nextdns_download" class="btn-secondary-v2 fg-px-4 fg-py-2 fg-text-[9px]  fg-tracking-widest fg-w-full fg-justify-center">NextDNS Official Site</button>
                  <div class="fg-grid fg-grid-cols-2 fg-gap-x-4 fg-gap-y-1 fg-pt-1">
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">1. Install Desktop App</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">2. Use Config ID</div>
                    <div class="fg-text-[11px] fg-font-medium fg-text-[var(--fg-text)] fg-opacity-70">3. Global protection</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="fg-col-span-2 fg-grid fg-grid-cols-2 fg-gap-6">
            <!-- Left Column: Security Toggles -->
            <div class="fg-flex fg-flex-col fg-gap-6">
              <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-items-center fg-justify-between">
                <div class="fg-flex fg-gap-3">
                  <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-amber-500/10 fg-flex fg-items-center fg-justify-center fg-text-amber-500">
                    ${iconLock}
                  </div>
                  <div>
                    <h2 style="${
                      UI_TOKENS.TEXT.HEADING
                    }">Strict Mode ${renderInfoTooltip(
    'Prevents disabling rules or changing security settings immediately while a focus session is active.',
  )}</h2>
                    <p style="${
                      UI_TOKENS.TEXT.SUBTEXT
                    }; margin-top: 2px;">Add friction before rules can be weakened.</p>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="chk_strict_toggle" ${
                    strict ? 'checked' : ''
                  }>
                  <span class="slider-toggle"></span>
                </label>
              </section>

              <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-flex-col fg-gap-4">
                <div class="fg-flex fg-items-center fg-justify-between">
                  <div class="fg-flex fg-gap-3">
                    <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-emerald-500/10 fg-flex fg-items-center fg-justify-center fg-text-emerald-500">
                      ${iconShield}
                    </div>
                    <div>
                      <h2 style="${
                        UI_TOKENS.TEXT.HEADING
                      }">Lock PIN ${renderInfoTooltip(
    'Requires a 4-digit code to access or modify any security settings.',
  )}</h2>
                      <p style="${
                        UI_TOKENS.TEXT.SUBTEXT
                      }; margin-top: 2px;">Require a code to change settings.</p>
                    </div>
                  </div>
                  <label class="switch-toggle" id="guard_toggle_label">
                    <input type="checkbox" id="chk_guardian_pin">
                    <span class="slider-toggle"></span>
                  </label>
                </div>
                <div id="pin_reset_container"></div>
              </section>
            </div>

            <!-- Right Column: Friction Challenge -->
            <div class="fg-flex fg-flex-col">
              <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-flex-col fg-gap-6 fg-h-full">
                <div class="fg-flex fg-items-center fg-justify-between">
                  <div class="fg-flex fg-gap-3">
                    <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-orange-500/10 fg-flex fg-items-center fg-justify-center fg-text-orange-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div>
                      <h2 style="${
                        UI_TOKENS.TEXT.HEADING
                      }">Unblock Challenge ${renderInfoTooltip(
    'Requires you to type a specific paragraph perfectly before settings can be unlocked. Adds mental friction to prevent impulsive changes.',
  )}</h2>
                      <p style="${
                        UI_TOKENS.TEXT.SUBTEXT
                      }; margin-top: 2px;">Type a paragraph perfectly to unlock settings.</p>
                    </div>
                  </div>
                  <label class="switch-toggle">
                    <input type="checkbox" id="chk_patience_challenge" ${
                      challengeEnabled ? 'checked' : ''
                    }>
                    <span class="slider-toggle"></span>
                  </label>
                </div>
                
                <div id="challenge_settings_box" class="${
                  challengeEnabled ? '' : 'fg-hidden'
                } fg-flex-1 fg-flex fg-flex-col">
                  <div style="${
                    UI_TOKENS.TEXT.LABEL
                  }; font-size: 11px; color: var(--fg-muted); letter-spacing: 0.1em; margin-bottom: 8px;">Target Paragraph</div>
                  <textarea id="txt_challenge_body" class="fg-flex-1 fg-w-full fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-2xl fg-p-4 fg-text-[13px] fg-text-[var(--fg-text)] fg-min-h-[120px] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all" placeholder="Enter custom text for the challenge...">${challengeText}</textarea>
                  
                  <div class="fg-mt-4">
                    <div style="${
                      UI_TOKENS.TEXT.LABEL
                    }; font-size: 10px; color: var(--fg-muted); margin-bottom: 8px;">Quick Presets</div>
                    <div class="fg-flex fg-flex-wrap fg-gap-2">
                       <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.">Default Focus</button>
                       <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="Self-discipline is the ability to make yourself do what you should do, when you should do it, whether you feel like it or not. I control my actions, and I choose to spend my time on meaningful work that brings me closer to my future self.">Cold Discipline</button>
                       <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="The more you think you know, the more you realize you don't. Stay humble, stay hungry, and most importantly, stay focused on the task at hand. Do not let the digital noise pull you away from what truly matters in your life today.">Mindful Clarity</button>
                    </div>
                  </div>

                  <div class="fg-flex fg-justify-between fg-mt-6 fg-items-center">
                    <button id="btn_reset_challenge_text" class="fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] fg-transition-all">Restore Default</button>
                    <button id="btn_save_challenge_text" class="btn-premium fg-px-6 fg-py-2.5 fg-rounded-xl fg-text-[10px] fg-font-black" style="background: ${
                      COLORS.inAppActiveBg
                    }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Update Challenge</button>
                  </div>
                </div>
              </section>
            </div>
          </div>

        </div>
      </main>
    </div>

    <style>
      .fg-panel-premium {
        background: var(--fg-glass-bg);
        border: 1px solid var(--fg-glass-border);
      }
      .badge-premium {
        font-size: 10px;
        font-weight: 900;
        padding: 5px 12px;
        border-radius: 999px;
        letter-spacing: 0.08em;
      }
      .badge-premium.active {
        background: var(--fg-green-soft);
        color: var(--fg-green);
      }
      .badge-premium.local {
        background: var(--fg-blue-badge);
        color: var(--fg-accent);
      }
      .input-premium {
        background: var(--fg-bg) !important;
        border: 1px solid var(--fg-glass-border) !important;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 500;
        color: var(--fg-text);
        width: 100%;
        transition: all 0.2s;
        box-shadow: none !important;
      }
      .input-premium.readonly-input {
        opacity: 0.88;
        cursor: not-allowed !important;
      }
      .input-premium::placeholder {
        font-size: 11px !important;
        font-weight: 400 !important;
        opacity: 0.5 !important;
        letter-spacing: 0.02em !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      .input-premium:not([readonly]):focus {
        border-color: var(--fg-accent) !important;
      }
      .btn-secondary-v2 {
        background: var(--fg-glass-bg);
        border: 1px solid var(--fg-glass-border);
        color: var(--fg-text);
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        transition: all 0.2s;
      }
      .btn-secondary-v2:hover {
        background: var(--fg-surface);
      }
      .switch-toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .switch-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider-toggle {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--fg-toggle-bg);
        transition: .4s;
        border-radius: 34px;
        border: 1px solid var(--fg-glass-border);
      }
      .slider-toggle:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 2px;
        bottom: 2px;
        background-color: ${COLORS.white};
        transition: .4s;
        border-radius: 50%;
        box-shadow: 0 4px 12px var(--fg-shadow);
      }
      input:checked + .slider-toggle {
        background-color: var(--fg-accent);
        border-color: var(--fg-accent);
      }
      input:checked + .slider-toggle:before {
        transform: translateX(20px);
      }
      .pin-digit-slot {
        width: 44px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--fg-overlay-subtle);
        border: 1px solid var(--fg-glass-border);
        border-radius: 14px;
        font-size: 20px;
        color: var(--fg-text);
        font-weight: 700;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .pin-digit-slot.active {
        border-color: var(--fg-accent);
        background: var(--fg-blue-soft);
        box-shadow: 0 0 20px var(--fg-blue-soft);
        transform: scale(1.05);
      }
      @keyframes fg-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .pin-digit-slot.focused-slot {
        border-color: var(--fg-accent);
        background: var(--fg-white-wash-strong);
      }
      .pin-digit-slot.focused-slot::after {
        content: "";
        width: 2px;
        height: 20px;
        background-color: var(--fg-accent);
        animation: fg-blink 1s step-end infinite;
      }
      .dns-tab-btn {
        background: transparent;
        border: 1px solid var(--fg-glass-border);
        color: var(--fg-text);
        opacity: 0.6;
        cursor: pointer;
        transition: all 0.2s;
      }
      .dns-tab-btn:hover {
        opacity: 0.8;
        background: var(--fg-white-wash);
      }
      .dns-tab-btn.active {
        opacity: 1 !important;
        background: var(--fg-in-app-active-bg) !important;
        border-color: var(--fg-in-app-active-border) !important;
        color: var(--fg-in-app-active-text) !important;
      }
      @media (max-width: 1100px) {
        .settings-dual-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;

  const openExternal = (url: string) => {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  // Modern Account Section Listeners
  const { attachAccountListeners } = await import(
    './components/AccountSection'
  );
  attachAccountListeners(
    container,
    profileId,
    apiKey,
    connectNextDNSAction,
    () => renderSettingsPage(container),
  );

  container
    .querySelector('#btn_copy_doh_inline')
    ?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(dohUrl);
      const btn = container.querySelector(
        '#btn_copy_doh_inline',
      ) as HTMLButtonElement;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = 'Copy';
      }, 2000);
    });

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

  if ((window as any).__settingsStorageListener) {
    chrome.storage.onChanged.removeListener(
      (window as any).__settingsStorageListener,
    );
  }

  const storageListener = (changes: any) => {
    if (changes.nextdns_profile_id) {
      const field = container.querySelector('#cfg_profile') as HTMLInputElement;
      if (field) {
        field.value = changes.nextdns_profile_id.newValue || '';
        toast.info('Profile ID detected automatically');
      }
    }
  };
  (window as any).__settingsStorageListener = storageListener;
  chrome.storage.onChanged.addListener(storageListener);

  container
    .querySelector('#chk_strict_toggle')
    ?.addEventListener('change', async (e) => {
      const checkbox = e.target as HTMLInputElement;
      const isChecked = checkbox.checked;

      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        checkbox.checked = !isChecked;
        return;
      }

      const performToggle = async () => {
        await setStrictModeAction(isChecked);
        toast.info(`Strict Mode ${isChecked ? 'Enabled' : 'Disabled'}`);
      };

      if (!isChecked) {
        checkbox.checked = true; // Revert until verified
        const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Disable Strict Mode',
          body: 'Verify your security to weaken your protection.',
        });

        if (confirmed) {
          await performToggle();
          checkbox.checked = false;
        }
        return;
      }

      await performToggle();
    });

  const { extensionAdapter: storage } = await import(
    '../../background/platformAdapter'
  );
  const chkGuardian = container.querySelector(
    '#chk_guardian_pin',
  ) as HTMLInputElement;

  const updateGuardianCheck = async () => {
    const pin = await storage.getString('guardian_pin');
    chkGuardian.checked = !!pin;

    // PIN Reset UI Logic
    const resetContainer = container.querySelector('#pin_reset_container');
    if (resetContainer) {
      const status = await checkPinResetStatus();

      if (status.pending) {
        // Disable toggle while reset is pending to avoid state confusion
        chkGuardian.parentElement!.classList.add(
          'fg-opacity-30',
          'fg-pointer-events-none',
        );

        const { fmtTime } = await import(
          '../../../../packages/core/src/utils/time'
        );
        resetContainer.innerHTML = `
          <div class="fg-bg-[var(--red)]/10 fg-border fg-border-[var(--red)]/20 fg-rounded-2xl fg-px-4 fg-py-3 fg-flex fg-items-center fg-justify-between">
            <div class="fg-flex fg-items-center fg-gap-4">
              <div class="fg-text-[10px] fg-font-black fg-text-[var(--red)] fg-uppercase fg-tracking-widest">Active Recovery</div>
              <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-text)] countdown-timer">${fmtTime(
                status.remainingMs!,
              )}</div>
            </div>
            <button id="btn_cancel_pin_reset" class="fg-text-[9px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-40 hover:fg-opacity-100 fg-uppercase fg-tracking-widest fg-transition-all">Cancel Request</button>
          </div>
        `;

        const interval = setInterval(() => {
          const timerEl = resetContainer.querySelector('.countdown-timer');
          if (timerEl) {
            const now = Date.now();
            const remaining = status.availableAt! - now;
            if (remaining <= 0) {
              clearInterval(interval);
              renderSettingsPage(container); // Refresh to clear PIN
            } else {
              timerEl.textContent = fmtTime(remaining);
            }
          } else {
            clearInterval(interval);
          }
        }, 1000);

        // Store interval ID to prevent leak/accumulation
        (window as any).__pinResetInterval = interval;

        resetContainer
          .querySelector('#btn_cancel_pin_reset')
          ?.addEventListener('click', async () => {
            await cancelPinResetAction();
            toast.info('Security Override CANCELLED');
            renderSettingsPage(container);
          });
      } else {
        chkGuardian.parentElement!.classList.remove(
          'fg-opacity-30',
          'fg-pointer-events-none',
        );
        if (pin) {
          resetContainer.innerHTML = `
            <button id="btn_request_pin_reset" class="fg-text-[10px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-30 hover:fg-opacity-100 fg-uppercase fg-tracking-widest fg-transition-all">Forgot PIN?</button>
          `;
          resetContainer
            .querySelector('#btn_request_pin_reset')
            ?.addEventListener('click', async () => {
              const { showConfirmDialog: showConfirm } = (await import(
                '../../lib/ui'
              )) as any;
              const confirmed = await showConfirm({
                title: 'Reset PIN',
                body: 'Forgot your PIN? Start a 12-hour reset timer. You cannot change settings or disable rules until the time is up.',
                confirmLabel: 'Start 12h Timer',
                isDestructive: true,
              });
              if (confirmed) {
                await requestPinResetAction();
                toast.info('12-Hour Reset Started');
                renderSettingsPage(container);
              }
            });
        } else {
          resetContainer.innerHTML = '';
        }
      }
    }
  };
  updateGuardianCheck();

  chkGuardian.addEventListener('change', async () => {
    const isChecking = chkGuardian.checked;
    const existingPin = await storage.getString('guardian_pin');

    const { showPinModal: openPinChallenge } = (await import(
      '../../lib/ui'
    )) as any;

    const performPinToggle = async () => {
      if (isChecking) {
        if (existingPin) {
          return;
        }
        openPinChallenge(
          'Set PIN',
          'Create a 4-digit code to lock your settings.',
          async (newPin: string) => {
            await setGuardianPinAction(newPin);
            toast.success('PIN Set Successfully');
            updateGuardianCheck();
            return true;
          },
        );
      } else {
        if (!existingPin) {
          return;
        }
        chkGuardian.checked = true; // Revert until verified
        const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Disable PIN',
          body: 'Verify your identity to remove rule protection.',
        });
        if (confirmed) {
          const { removeGuardianPinAction } = await import(
            '../../../../packages/viewmodels/src/useSettingsVM'
          );
          await removeGuardianPinAction();
          toast.info('PIN Removed');
          updateGuardianCheck();
        }
      }
    };

    await performPinToggle();
  });

  // Patience Challenge Listeners
  const chkChallenge = container.querySelector(
    '#chk_patience_challenge',
  ) as HTMLInputElement;
  const challengeBox = container.querySelector('#challenge_settings_box');
  const txtChallenge = container.querySelector(
    '#txt_challenge_body',
  ) as HTMLTextAreaElement;
  const btnSaveChallenge = container.querySelector('#btn_save_challenge_text');

  chkChallenge?.addEventListener('change', async () => {
    const enabled = chkChallenge.checked;
    await toggleChallengeAction(enabled);
    if (enabled) {
      challengeBox?.classList.remove('fg-hidden');
      toast.info('Unblock Challenge Enabled');
    } else {
      challengeBox?.classList.add('fg-hidden');
      toast.info('Unblock Challenge Disabled');
    }
  });

  btnSaveChallenge?.addEventListener('click', async () => {
    const text = txtChallenge.value.trim();
    if (text.length < 100) {
      toast.error('Min. 100 characters required');
      return;
    }
    await updateChallengeTextAction(text);
    toast.success('Challenge Updated');
  });

  container
    .querySelector('#btn_reset_challenge_text')
    ?.addEventListener('click', async () => {
      const defaultText =
        'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.';
      txtChallenge.value = defaultText;
      await updateChallengeTextAction(defaultText);
      toast.info('Restored Default Quote');
    });

  container.querySelectorAll('.preset-para-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = (btn as HTMLElement).dataset.text || '';
      txtChallenge.value = text;
      await updateChallengeTextAction(text);
      toast.info(`Switched to ${(btn as HTMLElement).innerText}`);
    });
  });
}
