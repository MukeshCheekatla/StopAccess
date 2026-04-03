import { UI_EXAMPLES } from '@focusgate/core';
import { addActionLog } from '../../lib/logger';
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
    clearEngineLogsAction,
    testDomainCoverageAction,
  } = await import('../../../../packages/viewmodels/src/useSettingsVM');

  const { profileId, apiKey, strict, syncMode, dnrRules, healthOk } =
    await loadSettingsData();

  const sessionGuardResult = await checkGuard('change_settings');
  const isLocked = !sessionGuardResult.allowed;

  container.innerHTML = `
      <!-- Top Metrics Row -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); margin-bottom: var(--space-xl);">
        <div class="glass-card" style="padding: var(--space-lg);">
          <div class="field-label">Shield Status</div>
          <div style="font-size: 18px; font-weight: 800; color: ${
            healthOk ? 'var(--green)' : 'var(--red)'
          }; margin-top: 4px;">${healthOk ? 'ONLINE' : 'OFFLINE'}</div>
        </div>
        <div class="glass-card" style="padding: var(--space-lg);">
          <div class="field-label">Active Protocol</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text); margin-top: 4px;">${syncMode.toUpperCase()}</div>
        </div>
        <div class="glass-card" style="padding: var(--space-lg);">
          <div class="field-label">Strict Mode</div>
          <div style="font-size: 18px; font-weight: 800; color: ${
            strict ? 'var(--accent)' : 'var(--muted)'
          }; margin-top: 4px;">${strict ? 'ENABLED' : 'DISABLED'}</div>
        </div>
        <div class="glass-card" style="padding: var(--space-lg);">
          <div class="field-label">Local Rules</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text); margin-top: 4px;">${
            (dnrRules as any[]).length
          } Active</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: var(--space-xl); align-items: start;">
        <div style="display: flex; flex-direction: column; gap: var(--space-xl);">
          
          <!-- Section 1: Protection -->
          <section>
            <div class="section-label">Enforcement Strategy</div>
            <div style="font-size: 13px; color: var(--muted); margin-bottom: var(--space-lg);">Choose how strictly FocusGate should filter your network traffic and browser requests.</div>
            <div class="enforcement-grid" style="grid-template-columns: 1fr 1fr; margin: 0;">
              <div class="enforcement-card ${
                syncMode === 'browser' ? 'active' : ''
              } ${isLocked ? 'locked' : ''}" data-mode="browser">
                <div class="enforcement-level">STANDARD</div>
                <div class="enforcement-tag">Browser Logic</div>
                <div class="enforcement-desc">Fast, local intercepts using browser-native blocking. No external DNS required.</div>
              </div>
              <div class="enforcement-card ${
                syncMode === 'profile' ? 'active' : ''
              } ${isLocked ? 'locked' : ''}" data-mode="profile">
                <div class="enforcement-level">STRONG</div>
                <div class="enforcement-tag">Cloud Hardened</div>
                <div class="enforcement-desc">Full NextDNS integration for network-wide enforcement. Maximum friction.</div>
              </div>
            </div>
          </section>

          <!-- Section 2: Diagnostics -->
          <section>
            <div class="section-label">Diagnostic Tools</div>
            <div class="action-grid" style="grid-template-columns: 1fr 1fr; margin: 0;">
               <div class="glass-card" style="padding: var(--space-lg);">
                <div class="field-label" style="margin-bottom: 12px;">Rule Compliance</div>
                <div style="display: flex; gap: var(--space-sm);">
                   <input type="text" id="test_domain" placeholder="${
                     UI_EXAMPLES.GENERIC_DOMAIN
                   }" class="input-premium" style="font-size: 13px;">
                   <button class="btn-premium" id="btn_test_domain" style="padding: 0 16px;">TEST</button>
                </div>
                <div id="test_result" style="display: none; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: 700; margin-top: 12px; text-align: center; border: 1px solid var(--glass-border);"></div>
              </div>

              <div class="glass-card" style="padding: var(--space-lg);">
                <div class="field-label" style="margin-bottom: 12px;">Node Status</div>
                <div id="sync_stats" style="min-height: 42px; margin-bottom: 12px;"></div>
                <div style="display: flex; gap: var(--space-sm);">
                  <button class="btn-premium" id="btn_force_sync" style="flex:1; font-size: 11px; background: var(--accent); justify-content: center;">PUSH</button>
                  <button class="btn-premium" id="btn_refresh_sync" style="flex:1; font-size: 11px; background: rgba(255,255,255,0.03); box-shadow: none; border: 1px solid var(--glass-border); justify-content: center;">POLL</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 3: Data -->
          <section>
            <div class="section-label">Persistence & Audit</div>
            <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-lg);">
              <div>
                <div style="font-weight: 700; font-size: 14px;">Audit Trail</div>
                <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">View all background enforcement decisions.</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn-premium" id="btn_view_logs" style="background: transparent; border: 1px solid var(--glass-border); box-shadow: none;">VIEW LOGS</button>
                <div style="width: 1px; height: 32px; background: var(--glass-border); margin: 0 8px;"></div>
                <button class="btn-premium" id="btn_export_rules" style="background: transparent; border: 1px solid var(--glass-border); box-shadow: none;">BACKUP</button>
                <button class="btn-premium" id="btn_import_rules" style="background: transparent; border: 1px solid var(--glass-border); box-shadow: none;">RESTORE</button>
              </div>
            </div>
          </section>

        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-xl);">
          
          <!-- Section 4: Credentials -->
          <section>
            <div class="section-label">DNS Credentials</div>
            <div class="glass-card" style="padding: var(--space-lg);">
              <div class="field-group">
                <div>
                  <label class="field-label">Profile ID</label>
                  <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input-premium">
                </div>
                <div>
                  <label class="field-label">API Key</label>
                  <input type="password" id="cfg_apiKey" value="${apiKey}" placeholder="••••••••••••••••" class="input-premium">
                </div>
              </div>
              <div id="connection_feedback" style="display: none; padding: 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 16px; border: 1px solid transparent;"></div>
              <button class="btn-premium" id="btn_save_config" style="width: 100%; justify-content: center; height: 48px;">SAVE & TEST</button>
            </div>
          </section>

          <!-- Section 5: Security -->
          <section>
            <div class="section-label">Security Layer</div>
            <div class="glass-card" style="padding: var(--space-lg); margin-bottom: var(--space-md);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-weight: 700; font-size: 14px;">Strict Mode</div>
                  <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;" id="strict_status_msg">Prevent settings tampering during active focus sessions.</div>
                </div>
                <label class="switch">
                  <input type="checkbox" id="chk_strict" ${
                    strict ? 'checked' : ''
                  }>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="glass-card" style="padding: var(--space-lg);">
              <div class="field-label">Guardian PIN</div>
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 16px;">Required for major configuration changes.</div>
              <div style="display: flex; gap: var(--space-sm);">
                 <input type="password" id="guardian_pin_input" placeholder="----" maxlength="4" class="input-premium" style="text-align: center; letter-spacing: 8px; font-weight: 900; font-size: 16px;">
                 <button class="btn-premium" id="btn_save_pin">SET</button>
              </div>
              <button id="btn_clear_pin" style="background:none; border:none; color:var(--red); font-size:10px; font-weight:800; cursor:pointer; margin-top: 16px; width: 100%; text-align: right; opacity: 0.6; text-transform: uppercase;">Deactivate PIN</button>
            </div>
          </section>

        </div>
      </div>

      <div style="margin-top: 64px; text-align: center; padding: 32px; border-top: 1px solid var(--glass-border); opacity: 0.5;">
         <div style="font-size: 10px; font-weight: 800; letter-spacing: 2px;">FOCUSGATE v1.0.0</div>
         <button id="btn_clear_logs" style="background:none; border:none; color:var(--red); font-size: 9px; font-weight: 800; cursor:pointer; margin-top: 8px; text-transform: uppercase;">Purge Telemetry</button>
      </div>
    `;

  // --- Logic & Event Handlers ---

  // Enforcement Mode Selection
  container.querySelectorAll('.enforcement-card').forEach((card) => {
    card.addEventListener('click', async () => {
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
        const challenge = prompt(
          'Enter Guardian PIN to change enforcement level:',
        );
        if (challenge !== currentPin) {
          toast.error('UNAUTHORIZED: Shield remains active.');
          return;
        }
      }

      await setSyncModeAction(mode);
      await addActionLog(
        `Changed enforcement mode to ${mode.toUpperCase()}`,
        'info',
      );

      // Update UI state
      container
        .querySelectorAll('.enforcement-card')
        .forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // NextDNS Save
  container
    .querySelector('#btn_save_config')
    ?.addEventListener('click', async () => {
      const pid = (
        container.querySelector('#cfg_profile') as HTMLInputElement
      ).value.trim();
      const key = (
        container.querySelector('#cfg_apiKey') as HTMLInputElement
      ).value.trim();
      const feedback = container.querySelector(
        '#connection_feedback',
      ) as HTMLElement;
      const btn = container.querySelector(
        '#btn_save_config',
      ) as HTMLButtonElement;

      if (!pid || !key) {
        toast.error('Enter both Profile ID and API Key.');
        return;
      }

      const { extensionAdapter: storage } = await import(
        '../../background/platformAdapter'
      );
      const currentPin = await storage.getString('guardian_pin');
      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      if (currentPin) {
        const challenge = prompt(
          'Enter Guardian PIN to authorize credential change:',
        );
        if (challenge !== currentPin) {
          toast.error('UNAUTHORIZED: Configuration locked.');
          return;
        }
      }

      btn.innerText = 'SYNCHRONIZING...';
      btn.disabled = true;
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(255,255,255,0.02)';
      feedback.style.color = 'var(--muted)';
      feedback.style.borderColor = 'var(--glass-border)';
      feedback.innerText = 'Verifying cloud credentials...';

      try {
        const result = await connectNextDNSAction(pid, key);
        if (result.ok) {
          feedback.style.background = 'rgba(16, 185, 129, 0.1)';
          feedback.style.borderColor = 'rgba(16, 185, 129, 0.2)';
          feedback.style.color = 'var(--green)';
          feedback.innerHTML =
            '<strong>Connection Optimal</strong><br>Handshake verified. Nodes synced.';
          btn.innerText = 'CONNECTED';
          await addActionLog('Successfully linked NextDNS account', 'success');
        } else {
          throw new Error(result.error || 'Verification signal lost.');
        }
      } catch (err) {
        await addActionLog(`Link failure: ${err.message}`, 'error');
        feedback.style.background = 'rgba(239, 68, 68, 0.1)';
        feedback.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        feedback.style.color = 'var(--red)';
        feedback.innerHTML = `<strong>Handshake Failed</strong><br>${err.message}`;
        btn.innerText = 'RETRY CONNECTION';
        btn.disabled = false;
      }
    });

  // Strict Mode Switch
  const strictCheckbox = container.querySelector(
    '#chk_strict',
  ) as HTMLInputElement;
  const strictMsg = container.querySelector(
    '#strict_status_msg',
  ) as HTMLElement;

  strictCheckbox?.addEventListener('change', async (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const checkbox = e.target as HTMLInputElement;

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
        const challenge = prompt('Enter Guardian PIN to disable Strict Mode:');
        if (challenge !== currentPin) {
          toast.error('UNAUTHORIZED: Shield remains active.');
          checkbox.checked = true;
          return;
        }
      }

      checkbox.disabled = true;
      let seconds = 5;
      const interval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
          strictMsg.innerText = `COOLING DOWN: ${seconds}S REMAINING...`;
        } else {
          clearInterval(interval);
          finalizeStrictChange(false);
        }
      }, 1000);
      strictMsg.innerText = `COOLING DOWN: ${seconds}S REMAINING...`;
      strictMsg.style.color = 'var(--red)';
    } else {
      finalizeStrictChange(true);
    }

    async function finalizeStrictChange(val) {
      await setStrictModeAction(val);
      await addActionLog(`Strict Mode turned ${val ? 'ON' : 'OFF'}`, 'info');
      strictMsg.innerText = val
        ? 'High-friction unblocking required.'
        : 'Prevent settings tampering during focus sessions.';
      strictMsg.style.color = 'var(--muted)';
      checkbox.disabled = false;
    }
  });

  // PIN
  container
    .querySelector('#btn_save_pin')
    ?.addEventListener('click', async () => {
      const input = container.querySelector(
        '#guardian_pin_input',
      ) as HTMLInputElement;
      const pin = input.value.trim();
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        toast.error('PIN must be 4 digits.');
        return;
      }
      await setGuardianPinAction(pin);
      await addActionLog('Guardian PIN updated', 'info');
      toast.success('Security layer active.');
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
      const challenge = prompt('Enter current PIN to remove security layer:');
      if (challenge) {
        const ok = await verifyAndRemoveGuardianPinAction(challenge);
        if (ok) {
          await addActionLog('Guardian PIN decommissioned', 'warning');
          toast.info('Security layer offline.');
        } else {
          toast.error('Access Denied');
        }
      }
    });

  // Diagnostics & Sync
  const refreshStats = async () => {
    const statsDiv = container.querySelector('#sync_stats');
    if (!statsDiv) {
      return;
    }
    // Refresh data via ViewModel
    const { syncState: newSyncState } = await loadSettingsData();

    statsDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: monospace; font-size: 10px;">
        <div style="color: var(--muted);">STATE:</div>
        <div style="color: var(--text); text-align: right; font-weight: 700;">${newSyncState.status.toUpperCase()}</div>
        <div style="color: var(--muted);">LAST:</div>
        <div style="color: var(--text); text-align: right; font-weight: 700;">${
          newSyncState.lastSyncAt
            ? new Date(newSyncState.lastSyncAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A'
        }</div>
        <div style="color: var(--muted);">OPS:</div>
        <div style="color: var(--accent); text-align: right; font-weight: 700;">${
          newSyncState.pendingOps || 0
        } QUEUED</div>
      </div>
    `;
  };

  container
    .querySelector('#btn_refresh_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btn_refresh_sync',
      ) as HTMLButtonElement;
      btn.innerText = '...';
      await refreshStats();
      btn.innerText = 'POLL';
    });

  container
    .querySelector('#btn_force_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btn_force_sync',
      ) as HTMLButtonElement;
      btn.innerText = 'PUSHING';
      chrome.runtime.sendMessage({ action: 'manualSync' });
      setTimeout(async () => {
        await refreshStats();
        btn.innerText = 'PUSH';
      }, 1500);
    });

  // Rule Tester
  container
    .querySelector('#btn_test_domain')
    ?.addEventListener('click', async () => {
      const domain = (
        container.querySelector('#test_domain') as HTMLInputElement
      ).value
        .trim()
        .toLowerCase();
      const resultDiv = container.querySelector('#test_result') as HTMLElement;
      if (!domain) {
        return;
      }

      resultDiv.style.display = 'block';
      resultDiv.style.background = 'rgba(255,255,255,0.02)';
      resultDiv.innerText = 'ANALYZING...';

      const { localMatch, dnrMatch } = await testDomainCoverageAction(
        domain,
        dnrRules,
      );

      if (localMatch || dnrMatch) {
        resultDiv.style.color = 'var(--green)';
        resultDiv.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        resultDiv.innerHTML = localMatch
          ? '✓ ACTIVE RULE MATCH'
          : '✓ ENGINE AUTO-BLOCK';
      } else {
        resultDiv.style.color = 'var(--yellow)';
        resultDiv.style.borderColor = 'rgba(245, 158, 11, 0.2)';
        resultDiv.innerHTML = '✗ NO LOCAL MATCH';
      }
    });

  // Export/Import
  container
    .querySelector('#btn_export_rules')
    ?.addEventListener('click', async () => {
      const rulesStr = await exportRulesAction();
      const blob = new Blob([rulesStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusgate_backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await addActionLog('Domain rules exported', 'info');
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
          await addActionLog('Domain rules restored', 'success');
          toast.success('Rules synchronized.');
          renderSettingsPage(container);
        } catch (err: any) {
          toast.error('Restore Failed: ' + err.message);
        }
      };
      input.click();
    });

  // Logs
  container
    .querySelector('#btn_clear_logs')
    ?.addEventListener('click', async () => {
      await clearEngineLogsAction();
      await addActionLog('Audit log history purged', 'info');
      toast.info('Telemetry cleared.');
    });

  container
    .querySelector('#btn_view_logs')
    ?.addEventListener('click', async () => {
      const { extensionAdapter: storage, STORAGE_KEYS } = await import(
        '../../background/platformAdapter'
      );
      const logsStr = (await storage.getString(STORAGE_KEYS.LOGS)) || '[]';
      const logs = JSON.parse(logsStr as string).reverse();

      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">ENGINE AUDIT TRAIL</div>
          <button id="btn_close_logs" style="background:none; border:none; color:var(--muted); font-size: 20px; cursor:pointer;">✕</button>
        </div>
        <div class="modal-content">
          <div style="display: flex; gap: 8px; margin-bottom: 24px;">
            <button class="btn-tab active" data-filter="all">ALL ENTRIES</button>
            <button class="btn-tab" data-filter="error">ERRORS</button>
            <button class="btn-tab" data-filter="success">SYNC SUCCESS</button>
          </div>
          <div id="logs_list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-premium" id="btn_export_logs_file" style="background:transparent; border: 1px solid var(--glass-border); box-shadow:none;">EXPORT LOGS</button>
          <button class="btn-premium" id="btn_close_logs_footer">CLOSE</button>
        </div>
      </div>
    `;

      document.body.appendChild(modalOverlay);

      const renderLogsList = (filter = 'all') => {
        const list = modalOverlay.querySelector('#logs_list');
        const filtered = logs.filter(
          (l: any) =>
            filter === 'all' ||
            l.level === filter ||
            l.message.toLowerCase().includes(filter),
        );

        list.innerHTML =
          filtered
            .map(
              (l: any) => `
        <div style="padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; font-family: monospace; font-size: 11px; display: flex; gap: 16px;">
          <span style="color: var(--muted); opacity: 0.5;">${new Date(
            l.timestamp,
          ).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}</span>
          <span style="color: ${
            l.level === 'error'
              ? 'var(--red)'
              : l.level === 'success'
              ? 'var(--green)'
              : 'var(--text)'
          }; font-weight: 700;">[${l.level.toUpperCase()}]</span>
          <span style="color: var(--text);">${l.message}</span>
        </div>
      `,
            )
            .join('') ||
          '<div style="text-align:center; padding: 40px; color:var(--muted); font-size:12px;">No matching log entries found.</div>';
      };

      renderLogsList();

      modalOverlay.querySelectorAll('.btn-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          modalOverlay
            .querySelectorAll('.btn-tab')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          renderLogsList((btn as HTMLElement).getAttribute('data-filter'));
        });
      });

      const closeMod = () => document.body.removeChild(modalOverlay);
      (modalOverlay.querySelector('#btn_close_logs') as HTMLElement).onclick =
        closeMod;
      (
        modalOverlay.querySelector('#btn_close_logs_footer') as HTMLElement
      ).onclick = closeMod;
      (
        modalOverlay.querySelector('#btn_export_logs_file') as HTMLElement
      ).onclick = () => {
        const blob = new Blob([logsStr as string], {
          type: 'application/json',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `focusgate_audit_${Date.now()}.json`;
        a.click();
      };
    });

  // Initial load
  refreshStats();
}
