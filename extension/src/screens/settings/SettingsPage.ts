import { toast } from '../../lib/toast';
import { checkGuard } from '../../background/sessionGuard';

export async function renderSettingsPage(container) {
  if (!container) {
    return;
  }

  const {
    loadSettingsData,
    connectNextDNSAction,
    setSyncModeAction,
    setStrictModeAction,
    exportRulesAction,
    importRulesAction,
    setGuardianPinAction,
    verifyAndRemoveGuardianPinAction,
    testDomainCoverageAction,
  } = await import('../../../../packages/viewmodels/src/useSettingsVM');

  const { profileId, apiKey, strict, syncMode, dnrRules, healthOk, syncState } =
    await loadSettingsData();

  const sessionGuardResult = await checkGuard('change_settings');
  const isLocked = !sessionGuardResult.allowed;

  container.innerHTML = `
    <div class="fg-flex fg-h-full" style="min-height: calc(100vh - 40px); margin: -20px;">
      <!-- Floating Navigation (Sidebar Bar Removed) -->
      <aside class="fg-w-56 fg-p-6 fg-flex fg-flex-col fg-justify-center fg-gap-3">
        <div class="fg-kicker fg-mb-4 fg-px-3 fg-opacity-90 fg-text-white">Controls</div>
        
        <button class="settings-tab-btn active" data-target="tab_engine">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span class="fg-font-bold">Engine</span>
        </button>
        
        <button class="settings-tab-btn" data-target="tab_security">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span class="fg-font-bold">Security</span>
        </button>
        
        <button class="settings-tab-btn" data-target="tab_advanced">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span class="fg-font-bold">Advanced</span>
        </button>

        <div class="fg-absolute fg-bottom-10 fg-left-0 fg-w-full fg-opacity-40 fg-text-[11px] fg-font-black fg-tracking-widest fg-text-center fg-text-white">
          FOCUS GATE v1.1
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="fg-flex-1 fg-overflow-y-auto fg-p-12 fg-max-w-4xl fg-mx-auto">
        
        <!-- Tab: Engine -->
        <div id="tab_engine" class="tab-content" style="display: block;">
          <header class="fg-mb-10">
            <h1 class="fg-text-4xl fg-font-black fg-mb-3 fg-tracking-tight fg-text-white">Filtering Engine</h1>
            <p class="fg-text-[var(--fg-muted)] fg-text-sm fg-opacity-100">Orchestrate your network protection layers and synchronization settings.</p>
          </header>

          <div class="fg-grid fg-gap-10">
            <!-- Sync Mode Selection -->
            <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
              <div class="fg-flex fg-items-center fg-justify-between fg-mb-8">
                <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white">Blocking Core</h2>
                <span class="badge-premium ${healthOk ? 'active' : 'local'}">
                  ${healthOk ? 'SYNC ACTIVE' : 'LOCAL ENGINE'}
                </span>
              </div>
              
              <div class="fg-grid fg-grid-cols-2 fg-gap-6">
                <div class="mode-card-v2 ${
                  syncMode === 'browser' ? 'active' : ''
                } ${isLocked ? 'locked' : ''} group" data-mode="browser">
                  <div class="fg-font-black fg-text-[15px] fg-mb-1 fg-text-white">Standard</div>
                  <p class="fg-text-xs fg-opacity-80 fg-leading-relaxed">Native filtering logic. Low latency, browser-level security.</p>
                </div>
                <div class="mode-card-v2 ${
                  syncMode === 'profile' ? 'active' : ''
                } ${isLocked ? 'locked' : ''} group" data-mode="profile">
                  <div class="fg-font-black fg-text-[15px] fg-mb-1 fg-text-white">Cloud Boost</div>
                  <p class="fg-text-xs fg-opacity-80 fg-leading-relaxed">Sync with NextDNS for multi-platform DNS-level filtering.</p>
                </div>
              </div>
            </section>

            <!-- NextDNS Credentials -->
            <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
              <div class="fg-flex fg-justify-between fg-items-center fg-mb-6">
                <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white">Cloud Identity</h2>
                <button id="btn_edit_credentials" class="fg-text-[11px] fg-font-black fg-text-[var(--fg-accent)] hover:fg-underline fg-uppercase fg-tracking-wider">Edit Setup</button>
              </div>
              
              <div class="fg-grid fg-gap-6">
                <div class="fg-grid fg-grid-cols-2 fg-gap-6">
                  <div class="fg-space-y-3">
                    <label class="fg-text-[11px] fg-font-black fg-opacity-80 fg-uppercase fg-tracking-wider fg-text-white">Profile ID</label>
                    <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input-premium readonly-input" readonly>
                  </div>
                  <div class="fg-space-y-3">
                    <label class="fg-text-[11px] fg-font-black fg-opacity-80 fg-uppercase fg-tracking-wider fg-text-white">API Secret Key</label>
                    <input type="password" id="cfg_apiKey" value="" placeholder="${
                      apiKey ? '••••••••••••••••' : 'Enter Secret'
                    }" class="input-premium readonly-input" readonly>
                  </div>
                </div>
                
                <div id="connection_feedback" class="fg-hidden fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-text-center"></div>

                <div class="fg-flex fg-justify-center">
                  <button class="btn-premium fg-w-full fg-max-w-xs fg-justify-center fg-h-12 fg-hidden" id="btn_save_config">Update & Verify Sync</button>
                </div>
                
                <div class="fg-flex fg-justify-center fg-gap-8 fg-mt-3">
                  <button class="fg-text-xs fg-font-black fg-opacity-90 hover:fg-opacity-100 Transition fg-text-white" id="btn_open_nextdns_setup">SETUP GUIDE</button>
                  <button class="fg-text-xs fg-font-black fg-opacity-90 hover:fg-opacity-100 Transition fg-text-white" id="btn_copy_doh_url">COPY DOH LINK</button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <!-- Tab: Security -->
        <div id="tab_security" class="tab-content" style="display: none;">
          <header class="fg-mb-10">
            <h1 class="fg-text-4xl fg-font-black fg-mb-3 fg-tracking-tight fg-text-white">Safety Layers</h1>
            <p class="fg-text-[var(--fg-muted)] fg-text-sm fg-opacity-100">Add intentional friction to prevent accidental policy changes.</p>
          </header>

          <div class="fg-grid fg-gap-8">
            <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
              <div class="fg-flex fg-items-center fg-justify-between">
                <div>
                  <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white fg-mb-1">Strict Enforcement</h2>
                  <p class="fg-text-xs fg-opacity-80" id="strict_status_msg">Lock modifications when an active session is in progress.</p>
                </div>
                <label class="switch">
                  <input type="checkbox" id="chk_strict" ${
                    strict ? 'checked' : ''
                  }>
                  <span class="slider"></span>
                </label>
              </div>
            </section>

            <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
              <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white fg-mb-6">Global Security PIN</h2>
              <div class="fg-flex fg-gap-5">
                <input type="password" id="guardian_pin_input" placeholder="----" maxlength="4" class="input-premium fg-text-center fg-tracking-[10px] fg-font-black fg-text-2xl fg-w-48">
                <button class="btn-premium fg-flex-1 fg-justify-center" id="btn_save_pin">CONFIRM PIN</button>
              </div>
              <button id="btn_clear_pin" class="fg-mt-8 fg-text-[11px] fg-font-black fg-text-[var(--fg-red)] fg-opacity-90 hover:fg-opacity-100 fg-uppercase fg-tracking-widest transition fg-w-full">DEACTIVATE SECURITY SHIELD</button>
            </section>
          </div>
        </div>

        <!-- Tab: Advanced -->
        <div id="tab_advanced" class="tab-content" style="display: none;">
          <header class="fg-mb-10">
            <h1 class="fg-text-4xl fg-font-black fg-mb-3 fg-tracking-tight fg-text-white">System Utilities</h1>
            <p class="fg-text-[var(--fg-muted)] fg-text-sm fg-opacity-100">Heuristics, audit trails, and manual override controls.</p>
          </header>

          <div class="fg-grid fg-gap-8">
            <div class="fg-grid fg-grid-cols-2 fg-gap-8">
              <!-- Rule Tester -->
              <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
                <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white fg-mb-6">Rule Checker</h2>
                <div class="fg-space-y-5">
                  <input type="text" id="test_domain" placeholder="domain.com" class="input-premium">
                  <button class="btn-premium fg-w-full fg-justify-center" id="btn_test_domain">ANALYZE</button>
                </div>
                <div id="test_result" class="fg-hidden fg-mt-4 fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black"></div>
              </section>

              <!-- Sync Stats -->
              <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
                <div class="fg-flex fg-items-center fg-justify-between fg-mb-6">
                  <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white">Sync Health</h2>
                  <div class="fg-flex fg-gap-4">
                    <button class="fg-text-[11px] fg-font-black fg-text-[var(--fg-accent)] hover:fg-opacity-70" id="btn_force_sync">PUSH</button>
                    <button class="fg-text-[11px] fg-font-black fg-opacity-90 hover:fg-opacity-100 fg-text-white" id="btn_refresh_sync">POLL</button>
                  </div>
                </div>
                <div id="sync_stats" class="fg-text-xs fg-font-mono fg-space-y-4"></div>
              </section>
            </div>

            <!-- Persistence -->
            <section class="fg-panel-premium fg-p-8 fg-rounded-[34px]">
              <h2 class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest fg-opacity-70 fg-text-white fg-mb-6">Data Vault</h2>
              <div class="fg-flex fg-gap-5">
                <button class="btn-secondary-v2 fg-flex-1 fg-py-4" id="btn_view_logs">AUDIT TRAIL</button>
                <button class="btn-secondary-v2 fg-flex-1 fg-py-4" id="btn_export_rules">EXPORT STATE</button>
                <button class="btn-secondary-v2 fg-flex-1 fg-py-4" id="btn_import_rules">IMPORT STATE</button>
              </div>
            </section>
          </div>
        </div>

      </main>
    </div>

    <style>
      .settings-tab-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        border-radius: 18px;
        color: var(--fg-muted);
        font-size: 14px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .settings-tab-btn:hover {
        background: rgba(255,255,255,0.06);
        color: var(--fg-text);
      }
      .settings-tab-btn.active {
        background: var(--fg-accent);
        color: white;
      }
      .fg-panel-premium {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .mode-card-v2 {
        padding: 24px;
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.04);
        background: rgba(255,255,255,0.01);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .mode-card-v2:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.15);
        transform: scale(1.02);
      }
      .mode-card-v2.active {
        background: rgba(255,255,255,0.08);
        border-color: var(--fg-accent);
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      }
      .mode-card-v2.locked {
        opacity: 0.3;
        cursor: not-allowed;
        grayscale: 1;
      }
      .badge-premium {
        font-size: 10px;
        font-weight: 900;
        padding: 5px 12px;
        border-radius: 999px;
        letter-spacing: 0.8px;
      }
      .badge-premium.active {
        background: rgba(16, 185, 129, 0.2);
        color: var(--fg-green);
      }
      .badge-premium.local {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .input-premium {
        background: rgba(0,0,0,0.2) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
        border-radius: 16px;
        padding: 14px 18px;
        font-size: 14px;
        color: white;
        width: 100%;
        transition: all 0.2s;
        box-shadow: none !important;
      }
      .input-premium.readonly-input {
        opacity: 0.85;
      }
      .input-premium:not([readonly]):focus {
        border-color: var(--fg-accent) !important;
        background: rgba(0,0,0,0.3) !important;
      }
      .btn-secondary-v2 {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.05);
        color: white;
        border-radius: 18px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 1.2px;
        transition: all 0.2s;
      }
      .btn-secondary-v2:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.15);
      }
      .tab-content {
        animation: fgBlurFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fgBlurFadeIn {
        from { opacity: 0; filter: blur(5px); transform: translateY(8px); }
        to { opacity: 1; filter: blur(0); transform: translateY(0); }
      }
    </style>
  `;

  // --- Logic & Event Handlers ---

  const tabs = container.querySelectorAll('.settings-tab-btn');
  const contents = container.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      contents.forEach((content) => {
        content.style.display = content.id === targetId ? 'block' : 'none';
      });
    });
  });

  const openExternal = (url: string) => {
    if (chrome?.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 1180, height: 900 });
    } else {
      window.open(url, '_blank');
    }
  };

  // Edit Mode Logic
  const editBtn = container.querySelector('#btn_edit_credentials');
  const saveBtn = container.querySelector('#btn_save_config');
  const inputs = container.querySelectorAll('.readonly-input');

  editBtn?.addEventListener('click', () => {
    const isEditing = editBtn.innerText === 'CANCEL';
    if (isEditing) {
      editBtn.innerText = 'EDIT SETUP';
      saveBtn?.classList.add('fg-hidden');
      inputs.forEach((input) => {
        (input as HTMLInputElement).readOnly = true;
        input.classList.add('readonly-input');
      });
    } else {
      editBtn.innerText = 'CANCEL';
      saveBtn?.classList.remove('fg-hidden');
      inputs.forEach((input) => {
        (input as HTMLInputElement).readOnly = false;
        input.classList.remove('readonly-input');
      });
    }
  });

  // Blocking Mode Selection
  container.querySelectorAll('.mode-card-v2').forEach((card) => {
    card.addEventListener('click', async () => {
      if (card.classList.contains('locked')) {
        return;
      }
      const mode = card.getAttribute('data-mode');
      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      const { extensionAdapter: storage } = await import(
        '../../background/platformAdapter'
      );
      const currentPin = await storage.getString('guardian_pin');
      if (currentPin) {
        const challenge = prompt('Verification Required');
        if (challenge !== currentPin) {
          toast.error('Identity Failed');
          return;
        }
      }

      await setSyncModeAction(mode);
      container
        .querySelectorAll('.mode-card-v2')
        .forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      toast.success(`Strategy synchronized: ${mode.toUpperCase()}`);
    });
  });

  // NextDNS Actions
  container
    .querySelector('#btn_open_nextdns_setup')
    ?.addEventListener('click', () =>
      openExternal('https://my.nextdns.io/setup'),
    );
  container
    .querySelector('#btn_copy_doh_url')
    ?.addEventListener('click', async () => {
      const pidInput = container.querySelector(
        '#cfg_profile',
      ) as HTMLInputElement;
      const url = `https://dns.nextdns.io/${
        pidInput.value.trim() || 'YOUR_ID'
      }`;
      await navigator.clipboard.writeText(url);
      toast.success('DoH Link Purged to Clipboard');
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

      btn.innerText = 'VERIFYING IDENTITY...';
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
          feedback.innerText = 'CRYPTO-HANDSHAKE OPTIMAL';
          btn.innerText = 'LINK SECURED';
          toast.success('Cloud sync persistent');

          // Re-lock UI
          setTimeout(() => renderSettingsPage(container), 1500);
        } else {
          throw new Error(result.error || 'Identity Rejected');
        }
      } catch (err) {
        feedback.className =
          'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-[var(--fg-red)]/20 fg-text-[var(--fg-red)]';
        feedback.innerText = err.message;
        btn.innerText = 'RETRY HANDSHAKE';
        btn.disabled = false;
      }
    });

  // Security Logic
  container
    .querySelector('#chk_strict')
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

  container
    .querySelector('#btn_save_pin')
    ?.addEventListener('click', async () => {
      const input = container.querySelector(
        '#guardian_pin_input',
      ) as HTMLInputElement;
      const pin = input.value.trim();
      if (pin.length !== 4) {
        toast.error('PIN requires 4 digits');
        return;
      }
      await setGuardianPinAction(pin);
      toast.success('Verification Sequence Set');
      input.value = '';
    });

  container
    .querySelector('#btn_clear_pin')
    ?.addEventListener('click', async () => {
      const { extensionAdapter: storage } = await import(
        '../../background/platformAdapter'
      );
      const currentPin = await storage.getString('guardian_pin');
      if (!currentPin) {
        return;
      }
      const challenge = prompt('Enter Sequence to Deactivate');
      if (challenge && (await verifyAndRemoveGuardianPinAction(challenge))) {
        toast.info('Security Shield Offline');
      } else {
        toast.error('Sequence Invalid');
      }
    });

  // Advanced Tools
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
      resultDiv.innerText = 'SCANNING HEURISTICS...';
      const { localMatch, dnrMatch } = await testDomainCoverageAction(
        domain,
        dnrRules,
      );
      if (localMatch || dnrMatch) {
        resultDiv.className =
          'fg-mt-4 fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-green)]/20 fg-text-[var(--fg-green)] fg-border fg-border-[var(--fg-green)]/20';
        resultDiv.innerText = localMatch
          ? 'BLOCK EVENT: PERSISTENT'
          : 'BLOCK EVENT: VIRTUAL';
      } else {
        resultDiv.className =
          'fg-mt-4 fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-red)]/20 fg-text-[var(--fg-red)] fg-border fg-border-[var(--fg-red)]/20';
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
      a.download = 'focusgate_state.json';
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
      const { extensionAdapter: storage, STORAGE_KEYS } = await import(
        '../../background/platformAdapter'
      );
      const logs = JSON.parse(
        (await storage.getString(STORAGE_KEYS.LOGS)) || '[]',
      ).reverse();
      const modal = document.createElement('div');
      modal.className =
        'fg-fixed fg-inset-0 fg-bg-black/70 fg-backdrop-blur-xl fg-flex fg-items-center fg-justify-center fg-z-50 fg-p-8';
      modal.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-w-full fg-max-w-xl fg-rounded-[44px] fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-max-h-[85vh] fg-shadow-2xl">
        <div class="fg-p-10 fg-border-b fg-border-[var(--fg-glass-border)] fg-flex fg-justify-between fg-items-center">
          <div class="fg-font-black fg-uppercase fg-tracking-widest fg-text-xs fg-opacity-30">Audit Trail History</div>
          <button id="close_logs" class="fg-opacity-30 hover:fg-opacity-100 transition">✕</button>
        </div>
        <div class="fg-flex-1 fg-overflow-y-auto fg-p-8 fg-space-y-4">
          ${
            logs
              .map(
                (l) => `
            <div class="fg-p-5 fg-bg-white/5 fg-rounded-3xl fg-text-[11px] fg-font-mono fg-flex fg-gap-5">
              <span class="fg-opacity-20">${new Date(
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
            '<div class="fg-text-center fg-opacity-20 fg-py-20 fg-font-black fg-uppercase fg-tracking-widest fg-text-[10px]">Vault Unaccessed</div>'
          }
        </div>
        <div class="fg-p-8 fg-flex fg-justify-end">
           <button class="btn-premium fg-px-10" id="modal_close_btn">Close Terminal</button>
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
