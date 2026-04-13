const iconCloud =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7s.7-1.1.7-1.8c0-1.4-1.1-2.5-2.5-2.5-.1 0-.3 0-.4.1C16.5 10.6 13.5 8 10 8c-3.1 0-5.7 2.1-6.7 5h-.3C1.3 13 0 14.3 0 15.9c0 1.6 1.3 2.9 2.9 2.9h14.6z"/></svg>';
const iconGlobe =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
const iconLock =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconShield =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const iconSearch =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const iconActivity =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
const iconDatabase =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>';
const iconEdit =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="fg-mr-1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';

import { toast } from '../../lib/toast';
import { checkGuard } from '../../background/sessionGuard';
import { UI_TOKENS } from '../../lib/ui';

export async function renderSettingsPage(container) {
  if (!container) {
    return;
  }

  const {
    loadSettingsData,
    connectNextDNSAction,
    setStrictModeAction,
    exportRulesAction,
    importRulesAction,
    setGuardianPinAction,
    verifyAndRemoveGuardianPinAction,
    testDomainCoverageAction,
  } = await import('../../../../packages/viewmodels/src/useSettingsVM');

  const { profileId, apiKey, strict, dnrRules, syncState } =
    await loadSettingsData();

  const dohUrl = profileId
    ? `https://dns.nextdns.io/${profileId}`
    : 'https://dns.nextdns.io/-';

  const isSetupActive = !!profileId && !!apiKey;

  container.innerHTML = `
    <div class="fg-h-full" style="min-height: calc(100vh - 40px);">
      <main class="fg-overflow-y-auto fg-p-8 fg-max-w-6xl fg-mx-auto">
        <div class="fg-grid fg-grid-cols-2 fg-gap-6 settings-dual-grid">

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px]">
            <div class="fg-flex fg-items-start fg-justify-between fg-mb-8">
              <div class="fg-flex fg-gap-4">
                <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-sky-500/10 fg-flex fg-items-center fg-justify-center fg-text-sky-500">
                  ${iconCloud}
                </div>
                <div>
                  <h2 style="${
                    UI_TOKENS.TEXT.HEADING
                  }">NextDNS Profile Sync</h2>
                  <p style="${
                    UI_TOKENS.TEXT.SUBTEXT
                  }; margin-top: 4px;">Sync services, denylist domains, privacy lists, security toggles, and diagnostics.</p>
                </div>
              </div>
              <button id="btn_edit_credentials" class="fg-flex fg-items-center fg-text-[9px] fg-font-black fg-text-[var(--fg-accent)] hover:fg-opacity-80 fg-uppercase fg-tracking-[0.2em] fg-bg-[var(--fg-accent)]/10 fg-px-3 fg-py-2 fg-rounded-lg fg-transition-opacity ${
                isSetupActive ? '' : 'fg-hidden'
              }">
                ${iconEdit}
                <span>MODIFY</span>
              </button>
            </div>
            <div class="fg-flex fg-flex-col fg-gap-8 fg-mt-4">
              <div class="fg-flex fg-flex-col fg-gap-2.5">
                <label style="${UI_TOKENS.TEXT.LABEL}">Active Profile</label>
                <div class="fg-flex fg-items-center fg-gap-5">
                  <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input-premium fg-w-20 fg-h-12 fg-text-xl fg-font-black fg-text-[var(--fg-accent)] fg-bg-transparent fg-border-0 fg-p-0 ${
    isSetupActive ? 'readonly-input' : ''
  }" ${isSetupActive ? 'readonly' : ''}>
                  <button class="btn-secondary-v2 fg-px-5 fg-py-2 fg-h-10 fg-whitespace-nowrap fg-text-[9px]" id="btn_open_nextdns_setup">Locate ID</button>
                </div>
              </div>

              <div class="fg-flex fg-flex-col fg-gap-2.5">
                <label style="${
                  UI_TOKENS.TEXT.LABEL
                }">Dedicated API Token</label>
                <div class="fg-flex fg-items-center fg-gap-5">
                  <input type="password" id="cfg_apiKey" value="" placeholder="${
                    apiKey ? 'Token saved' : 'Paste dedicated token'
                  }" class="input-premium fg-flex-1 fg-h-12 fg-text-xl fg-font-black fg-text-[var(--fg-text)] fg-bg-transparent fg-border-0 fg-p-0 ${
    isSetupActive ? 'readonly-input' : ''
  }" ${isSetupActive ? 'readonly' : ''}>
                  <button class="btn-secondary-v2 fg-px-5 fg-py-2 fg-h-10 fg-whitespace-nowrap fg-text-[9px]" id="btn_open_nextdns_account">Generate Token</button>
                </div>
              </div>
            </div>
            <div id="connection_feedback" class="fg-hidden fg-mt-4 fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-text-center"></div>
            <div class="fg-mt-6">
              <button class="btn-premium fg-w-full fg-justify-center fg-h-14 fg-rounded-2xl fg-text-sm fg-font-black fg-uppercase fg-tracking-widest ${
                isSetupActive ? 'fg-hidden' : ''
              }" id="btn_save_config">Secure & Initialize Sync</button>
            </div>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px]">
            <div class="fg-mb-8 fg-flex fg-gap-4">
               <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-violet-500/10 fg-flex fg-items-center fg-justify-center fg-text-violet-500">
                  ${iconGlobe}
                </div>
               <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Browser DNS Coverage</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 4px;">Use your private NextDNS endpoint when browser traffic should be covered outside extension rules.</p>
              </div>
            </div>
            <div class="fg-space-y-8 fg-mt-6">
              <div class="fg-flex fg-flex-col fg-gap-3">
                <label style="${
                  UI_TOKENS.TEXT.LABEL
                }; opacity: 0.5;">Private DoH Endpoint</label>
                <div class="fg-flex fg-gap-4">
                  <input type="text" id="doh_url_display" value="${dohUrl}" class="input-premium fg-flex-1 fg-h-12 fg-text-xs fg-text-[var(--fg-text)] fg-opacity-80 fg-font-mono fg-bg-transparent fg-border-0 fg-p-0" readonly>
                  <button id="btn_copy_doh_inline" class="btn-premium fg-px-6 fg-h-12 fg-text-[10px] fg-uppercase fg-tracking-widest">Copy URL</button>
                </div>
              </div>
              <div>
                <div class="fg-grid fg-grid-cols-3 fg-gap-2 fg-mb-4" id="dns_browser_tabs">
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-2 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-wider fg-border fg-transition-all active" data-tab="chrome">Chrome / Edge</button>
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-2 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-wider fg-border fg-transition-all" data-tab="firefox">Firefox</button>
                  <button class="dns-tab-btn fg-rounded-xl fg-px-3 fg-py-2 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-wider fg-border fg-transition-all" data-tab="system">System</button>
                </div>
                <div id="dns_steps_chrome" class="dns-steps-panel fg-space-y-4 fg-mt-6">
                  <button id="btn_open_chrome_dns" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[10px] fg-uppercase fg-tracking-widest fg-w-full fg-justify-center">Open Chrome DNS Settings</button>
                  <div class="fg-space-y-2 fg-pt-2">
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">1. Open chrome://settings/security</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">2. Go to Advanced and enable Use secure DNS</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">3. Select With Custom Provider</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">4. Paste your DoH URL and save</div>
                  </div>
                </div>
                <div id="dns_steps_firefox" class="dns-steps-panel fg-hidden fg-space-y-4 fg-mt-6">
                  <button id="btn_open_firefox_dns" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[10px] fg-uppercase fg-tracking-widest fg-w-full fg-justify-center">Open Firefox Network Settings</button>
                  <div class="fg-space-y-2 fg-pt-2">
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">1. Open about:preferences#general</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">2. Open Network Settings</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">3. Enable DNS over HTTPS and choose Custom</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">4. Paste your DoH URL and confirm</div>
                  </div>
                </div>
                <div id="dns_steps_system" class="dns-steps-panel fg-hidden fg-space-y-4 fg-mt-6">
                  <button id="btn_open_nextdns_download" class="btn-secondary-v2 fg-px-5 fg-py-3 fg-text-[10px] fg-uppercase fg-tracking-widest fg-w-full fg-justify-center">NextDNS Official Site</button>
                  <div class="fg-space-y-2 fg-pt-2">
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">1. Install the NextDNS desktop app</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">2. Use your Configuration ID</div>
                    <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] fg-opacity-90 fg-leading-relaxed">3. Enable protection for all apps on this device</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px] fg-flex fg-items-center fg-justify-between">
            <div class="fg-flex fg-gap-4">
              <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-amber-500/10 fg-flex fg-items-center fg-justify-center fg-text-amber-500">
                ${iconLock}
              </div>
              <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Strict Mode</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 4px;">Add friction before rules, sessions, or sensitive settings can be weakened.</p>
              </div>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" id="chk_strict_toggle" ${
                strict ? 'checked' : ''
              }>
              <span class="slider-toggle"></span>
            </label>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px] fg-flex fg-items-center fg-justify-between">
            <div class="fg-flex fg-gap-4">
              <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-emerald-500/10 fg-flex fg-items-center fg-justify-center fg-text-emerald-500">
                ${iconShield}
              </div>
              <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Guardian PIN</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 4px;">Require a 4-digit code before protected changes are allowed.</p>
              </div>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" id="chk_guardian_pin">
              <span class="slider-toggle"></span>
            </label>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px]">
            <div class="fg-mb-8 fg-flex fg-gap-4">
              <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-blue-500/10 fg-flex fg-items-center fg-justify-center fg-text-blue-500">
                ${iconSearch}
              </div>
              <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Domain Coverage Test</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 4px;">Check whether a host is covered by local extension rules or synced DNS rules.</p>
              </div>
            </div>
            <div class="fg-space-y-4">
              <div class="fg-flex fg-gap-3">
                <input type="text" id="test_domain" placeholder="domain.com" class="input-premium fg-flex-1 fg-h-12 fg-text-sm fg-text-[var(--fg-text)]">
                <button class="btn-premium fg-px-8 fg-h-12 fg-text-[10px] fg-uppercase fg-tracking-widest" id="btn_test_domain">Run Scan</button>
              </div>
              <div id="test_result" class="fg-hidden fg-p-5 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-uppercase fg-tracking-widest"></div>
            </div>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px]">
            <div class="fg-flex fg-items-center fg-justify-between fg-mb-8">
              <div class="fg-flex fg-gap-4">
                <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-rose-500/10 fg-flex fg-items-center fg-justify-center fg-text-rose-500">
                  ${iconActivity}
                </div>
                <div>
                  <h2 style="${UI_TOKENS.TEXT.HEADING}">Sync Health</h2>
                  <p style="${
                    UI_TOKENS.TEXT.SUBTEXT
                  }; margin-top: 4px;">Recent sync status, pending rule changes, and connection state.</p>
                </div>
              </div>
              <div class="fg-flex fg-gap-2">
                <button class="fg-text-[9px] fg-font-black fg-text-[var(--fg-accent)] fg-bg-[var(--fg-accent)]/10 fg-px-3 fg-py-1.5 fg-rounded-lg hover:fg-opacity-70" id="btn_force_sync">Push</button>
                <button class="fg-text-[9px] fg-font-black fg-opacity-100 fg-text-[var(--fg-text)] fg-bg-white/10 fg-px-3 fg-py-1.5 fg-rounded-lg hover:fg-bg-white/20" id="btn_refresh_sync">Poll</button>
              </div>
            </div>
            <div id="sync_stats" class="fg-text-[11px] fg-font-mono fg-space-y-3 fg-text-[var(--fg-text)]"></div>
          </section>

          <section class="fg-panel-premium fg-p-8 fg-rounded-[32px]">
            <div class="fg-mb-8 fg-flex fg-gap-4">
              <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-indigo-500/10 fg-flex fg-items-center fg-justify-center fg-text-indigo-500">
                ${iconDatabase}
              </div>
              <div>
                <h2 style="${UI_TOKENS.TEXT.HEADING}">Rules And Logs</h2>
                <p style="${
                  UI_TOKENS.TEXT.SUBTEXT
                }; margin-top: 4px;">Review recent actions and import or export local rule state.</p>
              </div>
            </div>
            <div class="fg-grid fg-grid-cols-3 fg-gap-3">
              <button class="btn-secondary-v2 fg-py-5 fg-text-[9px] fg-uppercase fg-tracking-widest" id="btn_view_logs">History</button>
              <button class="btn-secondary-v2 fg-py-5 fg-text-[9px] fg-uppercase fg-tracking-widest" id="btn_export_rules">Export</button>
              <button class="btn-secondary-v2 fg-py-5 fg-text-[9px] fg-uppercase fg-tracking-widest" id="btn_import_rules">Import</button>
            </div>
          </section>
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
        background: rgba(16, 185, 129, 0.18);
        color: var(--fg-green);
      }
      .badge-premium.local {
        background: rgba(59, 130, 246, 0.18);
        color: var(--fg-accent);
      }
      .input-premium {
        background: var(--fg-bg) !important;
        border: 1px solid var(--fg-glass-border) !important;
        border-radius: 16px;
        padding: 14px 18px;
        font-size: 14px;
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
        opacity: 0.4 !important;
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
        border-radius: 18px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        transition: all 0.2s;
      }
      .btn-secondary-v2:hover {
        background: var(--fg-surface);
      }
      .switch-toggle {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 28px;
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
        background-color: rgba(100, 116, 139, 0.15);
        transition: .4s;
        border-radius: 34px;
        border: 1px solid rgba(100, 116, 139, 0.2);
      }
      .slider-toggle:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
      input:checked + .slider-toggle {
        background-color: var(--fg-accent);
        border-color: var(--fg-accent);
      }
      input:checked + .slider-toggle:before {
        transform: translateX(20px);
      }
      .pin-digit-slot {
        width: 48px;
        height: 62px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--fg-glass-border);
        border-radius: 16px;
        font-size: 24px;
        color: var(--fg-text);
        font-weight: 900;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .pin-digit-slot.active {
        border-color: var(--fg-accent);
        background: rgba(14, 165, 233, 0.1);
        box-shadow: 0 0 20px rgba(14, 165, 233, 0.1);
        transform: scale(1.05);
      }
      @keyframes fg-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .pin-digit-slot.focused-slot {
        border-color: var(--fg-accent);
        background: rgba(255,255,255,0.06);
      }
      .pin-digit-slot.focused-slot::after {
        content: "";
        width: 2px;
        height: 24px;
        background-color: var(--fg-accent);
        animation: fg-blink 1s step-end infinite;
      }
      .dns-tab-btn {
        background: transparent;
        border: 1px solid var(--fg-glass-border);
        color: var(--fg-text);
        opacity: 0.4;
        cursor: pointer;
        transition: all 0.2s;
      }
      .dns-tab-btn:hover {
        opacity: 0.7;
        background: rgba(255,255,255,0.05);
      }
      .dns-tab-btn.active {
        opacity: 1 !important;
        background: var(--fg-accent) !important;
        border-color: var(--fg-accent) !important;
        color: white !important;
      }
      .pin-slot {
        display: flex;
        width: 48px;
        height: 56px;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        border: 1px solid var(--fg-glass-border);
        background: var(--fg-bg);
        color: var(--fg-muted);
        font-size: 22px;
        font-weight: 900;
      }
      @media (max-width: 1024px) {
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

  const editBtn = container.querySelector('#btn_edit_credentials');
  const saveBtn = container.querySelector('#btn_save_config');
  const editLabel = editBtn?.querySelector('span');

  const inputs = container.querySelectorAll(
    '#cfg_profile, #cfg_apiKey',
  ) as NodeListOf<HTMLInputElement>;

  editBtn?.addEventListener('click', () => {
    const isEditing = editBtn.classList.contains('active-edit');
    if (isEditing) {
      editBtn.classList.remove('active-edit');
      if (editLabel) {
        editLabel.innerText = 'MODIFY';
      }
      saveBtn?.classList.add('fg-hidden');
      inputs.forEach((input) => {
        input.readOnly = true;
        input.classList.add('readonly-input');
      });
    } else {
      editBtn.classList.add('active-edit');
      if (editLabel) {
        editLabel.innerText = 'CANCEL';
      }
      saveBtn?.classList.remove('fg-hidden');
      inputs.forEach((input) => {
        input.readOnly = false;
        input.classList.remove('readonly-input');
      });
    }
  });

  container
    .querySelector('#btn_open_nextdns_setup')
    ?.addEventListener('click', () => {
      chrome?.storage?.local?.set({
        fg_helper_intent: {
          mode: 'setup',
          expiresAt: Date.now() + 10 * 60 * 1000,
        },
      });
      openExternal('https://my.nextdns.io/setup');
    });

  container
    .querySelector('#btn_open_nextdns_account')
    ?.addEventListener('click', () => {
      chrome?.storage?.local?.set({
        fg_helper_intent: {
          mode: 'api',
          expiresAt: Date.now() + 10 * 60 * 1000,
        },
      });
      openExternal('https://my.nextdns.io/account');
    });

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

  container
    .querySelector('#btn_save_config')
    ?.addEventListener('click', async () => {
      const pid = (
        container.querySelector('#cfg_profile') as HTMLInputElement
      ).value.trim();
      const enteredKey = (
        container.querySelector('#cfg_apiKey') as HTMLInputElement
      ).value.trim();
      const finalKey = enteredKey || apiKey;

      const feedback = container.querySelector(
        '#connection_feedback',
      ) as HTMLElement;
      const btn = container.querySelector(
        '#btn_save_config',
      ) as HTMLButtonElement;

      if (!pid || !finalKey) {
        toast.error('Identity parameters incomplete');
        return;
      }

      btn.innerText = 'VERIFYING...';
      btn.disabled = true;
      feedback.classList.remove('fg-hidden');
      feedback.className =
        'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-black/30 fg-text-[var(--fg-muted)]';
      feedback.innerText = 'Negotiating with NextDNS Cloud...';

      try {
        const result = await connectNextDNSAction(pid, finalKey);
        if (result.ok) {
          feedback.className =
            'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-[var(--fg-green)]/20 fg-text-[var(--fg-green)]';
          feedback.innerText = 'Sync verified';
          btn.innerText = 'LINKED';
          toast.success('Cloud sync persistent');
          setTimeout(() => renderSettingsPage(container), 1500);
        } else {
          throw new Error(result.error || 'Identity rejected');
        }
      } catch (err) {
        feedback.className =
          'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-[var(--fg-red)]/20 fg-text-[var(--fg-red)]';
        feedback.innerText = err.message;
        btn.innerText = 'RETRY';
        btn.disabled = false;
      }
    });

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

      if (!isChecked) {
        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const currentPin = await storage.getString('guardian_pin');
        if (currentPin) {
          const challenge = prompt('Verification Required');
          if (challenge !== currentPin) {
            toast.error('Identity Conflict');
            checkbox.checked = true;
            return;
          }
        }
      }

      await setStrictModeAction(isChecked);
      toast.info(`Shield Lock ${isChecked ? 'ENGAGED' : 'RELEASED'}`);
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
  };
  updateGuardianCheck();

  const showPinModal = (
    title: string,
    subtitle: string,
    onConfirm: (pin: string) => Promise<boolean>,
  ) => {
    const modal = document.createElement('div');
    modal.className =
      'fg-fixed fg-inset-0 fg-bg-black/80 fg-backdrop-blur-xl fg-flex fg-items-center fg-justify-center fg-z-[100] fg-p-8 fg-animate-in fg-fade-in fg-duration-300';
    modal.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-w-full fg-max-w-md fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-p-10 fg-shadow-2xl fg-animate-in fg-zoom-in-95 fg-duration-300">
        <div class="fg-text-center fg-mb-8">
          <div class="fg-w-16 fg-h-16 fg-rounded-2xl fg-bg-[var(--fg-accent)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)] fg-mx-auto fg-mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3 class="fg-text-xl fg-font-black fg-text-white fg-mb-2">${title}</h3>
          <p class="fg-text-sm fg-text-[var(--fg-muted)]">${subtitle}</p>
        </div>
        
        <div class="fg-relative fg-flex fg-justify-center fg-mb-8">
          <input type="password" id="modal_pin_input" autofocus maxlength="4" inputmode="numeric" class="fg-absolute fg-inset-0 fg-opacity-0 fg-cursor-pointer fg-z-10">
          <div class="fg-flex fg-gap-3">
            <div class="pin-digit-slot modal-slot"></div>
            <div class="pin-digit-slot modal-slot"></div>
            <div class="pin-digit-slot modal-slot"></div>
            <div class="pin-digit-slot modal-slot"></div>
          </div>
        </div>
        
        <div class="fg-flex fg-gap-3">
          <button id="modal_cancel" class="btn-secondary-v2 fg-flex-1 fg-h-14">CANCEL</button>
          <button id="modal_confirm" class="btn-premium fg-flex-1 fg-h-14 fg-opacity-50 fg-pointer-events-none">CONTINUE</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#modal_pin_input') as HTMLInputElement;
    const slots = modal.querySelectorAll('.modal-slot');
    const confirmBtn = modal.querySelector(
      '#modal_confirm',
    ) as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#modal_cancel') as HTMLButtonElement;

    const close = () => {
      modal.classList.add('fg-fade-out');
      setTimeout(() => modal.remove(), 300);
    };

    input.focus();
    input.addEventListener('input', () => {
      const val = input.value.replace(/\D/g, '').slice(0, 4);
      input.value = val;
      slots.forEach((s, i) => {
        s.classList.remove('active', 'focused-slot');
        if (i < val.length) {
          s.textContent = '•';
          s.classList.add('active');
        } else {
          s.textContent = '';
          if (i === val.length) {
            s.classList.add('focused-slot');
          }
        }
      });
      if (val.length === 4) {
        confirmBtn.classList.remove('fg-opacity-50', 'fg-pointer-events-none');
      } else {
        confirmBtn.classList.add('fg-opacity-50', 'fg-pointer-events-none');
      }
    });

    // Initial focus state
    slots[0].classList.add('focused-slot');

    cancelBtn.addEventListener('click', () => {
      close();
      updateGuardianCheck();
    });

    confirmBtn.addEventListener('click', async () => {
      const success = await onConfirm(input.value);
      if (success) {
        close();
        updateGuardianCheck();
      } else {
        input.value = '';
        slots.forEach((s) => {
          s.textContent = '';
          s.classList.remove('active');
        });
        confirmBtn.classList.add('fg-opacity-50', 'fg-pointer-events-none');
      }
    });
  };

  chkGuardian.addEventListener('change', async (_e) => {
    const isChecking = chkGuardian.checked;
    const existingPin = await storage.getString('guardian_pin');

    if (isChecking) {
      if (existingPin) {
        return;
      } // Should not happen
      showPinModal(
        'Establish Security',
        'Create a 4-digit code to lock your shield.',
        async (newPin) => {
          await setGuardianPinAction(newPin);
          toast.success('Identity Shield Active');
          return true;
        },
      );
    } else {
      if (!existingPin) {
        return;
      } // Should not happen
      showPinModal(
        'Shield Verification',
        'Enter your code to dissolve protection.',
        async (enteredPin) => {
          if (await verifyAndRemoveGuardianPinAction(enteredPin)) {
            toast.info('Security Shield Offline');
            return true;
          } else {
            toast.error('Identity Conflict');
            return false;
          }
        },
      );
    }
  });

  const renderStats = () => {
    const statsDiv = container.querySelector('#sync_stats');
    if (!statsDiv) {
      return;
    }
    statsDiv.innerHTML = `
      <div class="fg-flex fg-justify-between fg-opacity-70"><span>Engine Health</span> <span class="${
        syncState.status === 'error'
          ? 'fg-text-[var(--fg-red)]'
          : 'fg-text-[var(--fg-green)]'
      } fg-font-black">${syncState.status.toUpperCase()}</span></div>
      <div class="fg-flex fg-justify-between fg-opacity-70"><span>Telemetry Cycle</span> <span class="fg-font-black">${
        syncState.lastSyncAt
          ? new Date(syncState.lastSyncAt).toLocaleTimeString()
          : 'INACTIVE'
      }</span></div>
      <div class="fg-flex fg-justify-between fg-opacity-70"><span>Pending Blobs</span> <span class="fg-text-[var(--fg-accent)] fg-font-black">${
        syncState.pendingOps || 0
      } UNITS</span></div>
    `;
  };
  renderStats();

  container
    .querySelector('#btn_refresh_sync')
    ?.addEventListener('click', async () => {
      const fresh = await loadSettingsData();
      Object.assign(syncState, fresh.syncState);
      renderStats();
      toast.success('Telemetry Refreshed');
    });

  container.querySelector('#btn_force_sync')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'manualSync' });
    toast.info('Manual push sequence active');
  });

  container
    .querySelector('#btn_test_domain')
    ?.addEventListener('click', async () => {
      const input = container.querySelector('#test_domain') as HTMLInputElement;
      const domain = input.value.trim().toLowerCase();
      const resultDiv = container.querySelector('#test_result') as HTMLElement;
      if (!domain) {
        return;
      }
      resultDiv.classList.remove('fg-hidden');
      resultDiv.innerText = 'SCANNING...';
      const { localMatch, dnrMatch } = await testDomainCoverageAction(
        domain,
        dnrRules,
      );
      if (localMatch || dnrMatch) {
        resultDiv.className =
          'fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-green)]/20 fg-text-[var(--fg-green)] fg-border fg-border-[var(--fg-green)]/20';
        resultDiv.innerText = localMatch
          ? 'BLOCK EVENT: PERSISTENT'
          : 'BLOCK EVENT: VIRTUAL';
      } else {
        resultDiv.className =
          'fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-red)]/20 fg-text-[var(--fg-red)] fg-border fg-border-[var(--fg-red)]/20';
        resultDiv.innerText = 'TRAFFIC CLEAN';
      }
    });

  container
    .querySelector('#btn_export_rules')
    ?.addEventListener('click', async () => {
      const rules = await exportRulesAction();
      const blob = new Blob([rules], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StopAccess_state.json';
      a.click();
      toast.success('State Archived');
    });

  container
    .querySelector('#btn_import_rules')
    ?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          return;
        }
        try {
          const text = await file.text();
          await importRulesAction(text);
          toast.success('State Restored');
          renderSettingsPage(container);
        } catch (err) {
          toast.error('State Corruption');
        }
      };
      input.click();
    });

  container
    .querySelector('#btn_view_logs')
    ?.addEventListener('click', async () => {
      const { extensionAdapter: logStorage, STORAGE_KEYS } = await import(
        '../../background/platformAdapter'
      );
      const logs = JSON.parse(
        (await logStorage.getString(STORAGE_KEYS.LOGS)) || '[]',
      ).reverse();
      const modal = document.createElement('div');
      modal.className =
        'fg-fixed fg-inset-0 fg-bg-black/70 fg-backdrop-blur-xl fg-flex fg-items-center fg-justify-center fg-z-50 fg-p-8';
      modal.innerHTML = `
        <div class="fg-bg-[var(--fg-surface)] fg-w-full fg-max-w-xl fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-max-h-[85vh] fg-shadow-2xl">
          <div class="fg-p-8 fg-border-b fg-border-[var(--fg-glass-border)] fg-flex fg-justify-between fg-items-center">
            <div class="fg-font-black fg-uppercase fg-tracking-widest fg-text-xs fg-opacity-50">Audit Trail History</div>
            <button id="close_logs" class="fg-opacity-40 hover:fg-opacity-100 transition">×</button>
          </div>
          <div class="fg-flex-1 fg-overflow-y-auto fg-p-6 fg-space-y-4">
            ${
              logs
                .map(
                  (l) => `
                <div class="fg-p-4 fg-bg-white/5 fg-rounded-2xl fg-text-[11px] fg-font-mono fg-flex fg-gap-4">
                  <span class="fg-opacity-30">${new Date(
                    l.timestamp,
                  ).toLocaleTimeString()}</span>
                  <span class="${
                    l.level === 'error'
                      ? 'fg-text-[var(--fg-red)]'
                      : 'fg-text-[var(--fg-green)]'
                  } fg-font-black">[${l.level.toUpperCase()}]</span>
                  <span class="fg-opacity-80">${l.message}</span>
                </div>
              `,
                )
                .join('') ||
              '<div class="fg-text-center fg-opacity-30 fg-py-20 fg-font-black fg-uppercase fg-tracking-widest fg-text-[10px]">Vault Unaccessed</div>'
            }
          </div>
          <div class="fg-p-6 fg-flex fg-justify-end">
            <button class="btn-premium fg-px-8 fg-py-3" id="modal_close_btn">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('#close_logs')?.addEventListener('click', close);
      modal.querySelector('#modal_close_btn')?.addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          close();
        }
      });
    });
}
