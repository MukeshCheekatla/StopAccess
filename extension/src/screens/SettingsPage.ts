import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import { UI_EXAMPLES } from '@focusgate/core';
import { addActionLog } from '../lib/logger';
import { toast } from '../lib/toast';
import { checkGuard } from '../background/sessionGuard';

export async function renderSettingsPage(container) {
  if (!container) {
    return;
  }

  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';
  const sessionGuardResult = await checkGuard('change_settings');
  const isLocked = !sessionGuardResult.allowed;

  const dnrRules = await new Promise((resolve) => {
    if (chrome?.declarativeNetRequest?.getDynamicRules) {
      chrome.declarativeNetRequest.getDynamicRules(resolve);
    } else {
      resolve([]);
    }
  });

  const healthOk = !!(profileId && apiKey);

  container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--accent); letter-spacing: 3px; margin-bottom: 12px;">SYSTEM CONFIGURATION</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">FocusGate v1.0.0</div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 4px; opacity: 0.6;">Production Terminal</div>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom: 40px; padding: 40px; border-color: ${
        healthOk ? 'rgba(0, 208, 148, 0.15)' : 'rgba(255, 71, 87, 0.15)'
      }; background: ${
    healthOk
      ? 'linear-gradient(135deg, rgba(0,208,148,0.02), transparent)'
      : 'linear-gradient(135deg, rgba(255,71,87,0.02), transparent)'
  };">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
           <div>
              <div class="widget-title" style="color: ${
                healthOk ? 'var(--green)' : 'var(--red)'
              }; font-size: 14px; letter-spacing: 2px;">${
    healthOk ? 'SHIELD STATUS: OPTIMAL' : 'SHIELD STATUS: UNLINKED'
  }</div>
              <div style="font-size: 14px; color: var(--muted); margin-top: 6px; font-weight: 500;">Diagnostic telemetry from active enforcement nodes.</div>
           </div>
           <div class="status-pill ${
             healthOk ? 'active' : 'error'
           }" style="padding: 8px 16px; font-size: 11px;">
              ${healthOk ? 'SYSTEM READY' : 'CONFIGURATION REQUIRED'}
           </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span class="field-label">DNS Connection</span>
            <span style="font-size: 18px; font-weight: 900; color: ${
              healthOk ? 'var(--text)' : 'var(--red)'
            };">${healthOk ? 'READY' : 'OFFLINE'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span class="field-label">Settings Lock</span>
            <span style="font-size: 18px; font-weight: 900; color: ${
              strict ? 'var(--accent)' : 'var(--muted)'
            };">${strict ? 'ON' : 'OFF'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span class="field-label">Active Rules</span>
            <span style="font-size: 18px; font-weight: 900; color: var(--text);">${
              (dnrRules as any[]).length
            }</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-label" style="margin-bottom: 24px;">1. PROTECTION LEVEL</div>
        <div class="enforcement-grid">
          <div class="enforcement-card ${
            syncMode === 'hybrid' || syncMode === 'browser' ? 'active' : ''
          } ${isLocked ? 'locked' : ''}" data-mode="hybrid">
            <div class="enforcement-level">STANDARD</div>
            <div class="enforcement-tag">Baseline Protection</div>
            <div class="enforcement-desc">Blocks domains via the extension (L1). Fast, local-only intercept.</div>
          </div>
          <div class="enforcement-card ${
            syncMode === 'profile' ? 'active' : ''
          } ${isLocked ? 'locked' : ''}" data-mode="profile">
            <div class="enforcement-level">STRONG</div>
            <div class="enforcement-tag">Reinforced</div>
            <div class="enforcement-desc">Combines extension (L1) with NextDNS (L2) for network-level hardening.</div>
          </div>
        </div>
      </div>

      <div class="settings-section-divider"></div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <div>
          <div class="section-label" style="margin-bottom: 24px;">2. DNS CREDENTIALS</div>
          <div class="glass-card" style="padding: 32px;">
            <div class="field-group">
              <div>
                <label class="field-label">Profile ID</label>
                <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input-premium" style="width: 100%;">
              </div>
              <div>
                <label class="field-label">Secret API Key</label>
                <input type="password" id="cfg_apiKey" value="${apiKey}" placeholder="••••••••••••••••" class="input-premium" style="width: 100%;">
              </div>
            </div>
            <div id="connection_feedback" style="display: none; padding: 16px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-bottom: 20px; border-left: 4px solid transparent;"></div>
            <button class="btn-premium" id="btn_save_config" style="width: 100%; justify-content: center; height: 52px; font-size: 13px;">SAVE & TEST</button>
          </div>
        </div>

        <div>
          <div class="section-label" style="margin-bottom: 24px;">3. SECURITY & ENFORCEMENT</div>
          <div class="glass-card" style="padding: 32px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="widget-title" style="font-size: 15px; margin-bottom: 4px;">Strict Mode</div>
                <div style="font-size: 12px; color: var(--muted); font-weight: 500;" id="strict_status_msg">Prevent settings tampering during flow.</div>
              </div>
              <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 24px;">
                <input type="checkbox" id="chk_strict" ${
                  strict ? 'checked' : ''
                } style="opacity: 0; width: 0; height: 0;">
                <span class="slider round" style="position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; border: 1px solid var(--glass-border);"></span>
              </label>
            </div>
          </div>
          
          <div class="glass-card" style="padding: 32px;">
            <div class="widget-title" style="font-size: 15px; margin-bottom: 12px;">Guardian PIN</div>
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 20px; font-weight: 500;">Secure critical actions with a 4-digit lockout.</div>
            <div style="display: flex; gap: 12px;">
               <input type="password" id="guardian_pin_input" placeholder="----" maxlength="4" class="input-premium" style="flex: 1; text-align: center; letter-spacing: 12px; font-weight: 900; font-size: 18px;">
               <button class="btn-premium" id="btn_save_pin" style="padding: 0 24px;">SET</button>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
               <button id="btn_clear_pin" style="background:none; border:none; color:var(--red); font-size:10px; font-weight:800; cursor:pointer; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Remove Active PIN</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section-divider"></div>

      <div class="section-label" style="margin-bottom: 24px;">4. DIAGNOSTICS & DATA CONTROL</div>
      <div class="action-grid">
        <div class="glass-card" style="padding: 24px;">
          <div class="widget-title" style="font-size: 13px; margin-bottom: 16px;">HUB DIAGNOSIS</div>
          <div id="sync_stats" style="margin-bottom: 20px; font-size: 12px; min-height: 48px;">
             <div class="loader" style="justify-content: flex-start;">POLLING HUB...</div>
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn-premium" id="btn_force_sync" style="flex:1; font-size: 11px; background: var(--accent); justify-content: center;">PUSH STATE</button>
            <button class="btn-premium" id="btn_refresh_sync" style="flex:1; font-size: 11px; background: rgba(255,255,255,0.02); box-shadow: none; border-color: var(--glass-border); justify-content: center;">POLL STATUS</button>
          </div>
        </div>

          <div class="glass-card" style="padding: 24px;">
          <div class="widget-title" style="font-size: 13px; margin-bottom: 16px;">RULE COMPLIANCE</div>
          <div style="display: flex; gap: 12px;">
             <input type="text" id="test_domain" placeholder="${
               UI_EXAMPLES.GENERIC_DOMAIN
             }" class="input-premium" style="flex: 1; font-size: 12px;">
             <button class="btn-premium" id="btn_test_domain" style="padding: 0 16px;">TEST</button>
          </div>
          <div id="test_result" style="display: none; padding: 12px; border-radius: 12px; font-size: 10px; font-weight: 800; margin-top: 16px; text-transform: uppercase; text-align: center;"></div>
          <div style="font-size: 10px; color: var(--muted); margin-top: 12px; font-weight: 600;">Verify domain coverage across L1/L2 nodes.</div>
        </div>

        <div class="glass-card" style="padding: 24px;">
          <div class="widget-title" style="font-size: 13px; margin-bottom: 16px;">PERSISTENCE LAYER</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; gap: 10px;">
              <button class="btn-premium" id="btn_export_rules" style="flex:1; background: rgba(255,255,255,0.02); box-shadow:none; border-color: var(--glass-border); justify-content: center; font-size: 11px;">EXPORT</button>
              <button class="btn-premium" id="btn_import_rules" style="flex:1; background: rgba(255,255,255,0.02); box-shadow:none; border-color: var(--glass-border); justify-content: center; font-size: 11px;">IMPORT</button>
            </div>
            <button class="btn-premium" id="btn_view_logs" style="width: 100%; background: transparent; border: 1px solid var(--accent); color: var(--accent); box-shadow: none; justify-content: center; font-size: 11px;">VIEW AUDIT TRAIL</button>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 80px; text-align: center; padding: 40px; border-top: 1px solid var(--glass-border);">
         <div style="font-size: 11px; color: var(--muted); font-weight: 700; opacity: 0.4; letter-spacing: 2px;">FOCUSGATE v1.0.0</div>
         <button id="btn_clear_logs" style="background:none; border:none; color:var(--red); font-size: 9px; font-weight: 800; cursor:pointer; margin-top: 12px; text-transform: uppercase;">Clear All Logs</button>
      </div>
    `;

  // --- Logic & Event Handlers ---

  // Enforcement Mode Selection
  container.querySelectorAll('.enforcement-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const mode = card.getAttribute('data-mode');

      const currentPin = await storage.getString('guardian_pin');
      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      if (currentPin) {
        const challenge = prompt(
          'Enter Guardian PIN to change enforcement level:',
        );
        if (challenge !== currentPin) {
          toast.error('UNAUTHORIZED: Shield remains active.');
          return;
        }
      }

      await storage.set('fg_sync_mode', mode);
      await addActionLog(
        `Changed enforcement mode to ${mode.toUpperCase()}`,
        'info',
      );
      chrome.runtime.sendMessage({ action: 'manualSync' });

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
      feedback.style.background = 'rgba(255,255,255,0.03)';
      feedback.style.color = 'var(--muted)';
      feedback.style.borderColor = 'var(--glass-border)';
      feedback.innerText = 'Initiating cloud handshake...';

      try {
        await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
        await storage.set(STORAGE_KEYS.API_KEY, key);

        const { nextDNSApi } = await import('../background/platformAdapter');
        const ok = await nextDNSApi.testConnection();

        if (ok) {
          feedback.style.background = 'rgba(0, 196, 140, 0.1)';
          feedback.style.borderColor = 'rgba(0, 196, 140, 0.2)';
          feedback.style.color = 'var(--green)';
          feedback.innerHTML =
            '<strong>Connection Optimal</strong><br>Authentication verified. Profile nodes synchronized.';
          btn.innerText = 'CONNECTED';
          await addActionLog('Successfully linked NextDNS account', 'success');
        } else {
          throw new Error('Verification signal lost. Check credentials.');
        }

        chrome.runtime.sendMessage({ action: 'manualSync' });
      } catch (err) {
        await addActionLog(`Link failure: ${err.message}`, 'error');
        feedback.style.background = 'rgba(255, 71, 87, 0.1)';
        feedback.style.borderColor = 'rgba(255, 71, 87, 0.2)';
        feedback.style.color = 'var(--red)';
        feedback.innerHTML = `<strong>Handshake Failed</strong><br>${err.message}`;
        btn.innerText = 'RETRY CONNECTION';
        btn.disabled = false;
      }
    });

  // Strict Mode Switch
  const strictCheckbox = container.querySelector('#chk_strict');
  const strictMsg = container.querySelector('#strict_status_msg');

  strictCheckbox?.addEventListener('change', async (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const checkbox = e.target as HTMLInputElement;

    const guard = await checkGuard('change_settings');
    if (!guard.allowed) {
      toast.error((guard as any).reason);
      checkbox.checked = !isChecked; // Restore prev
      return;
    }

    if (!isChecked) {
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
          (
            strictMsg as HTMLElement
          ).innerText = `COOLING DOWN: ${seconds}S REMAINING...`;
        } else {
          clearInterval(interval);
          finalizeStrictChange(false);
        }
      }, 1000);
      (
        strictMsg as HTMLElement
      ).innerText = `COOLING DOWN: ${seconds}S REMAINING...`;
      (strictMsg as HTMLElement).style.color = 'var(--red)';
    } else {
      finalizeStrictChange(true);
    }

    async function finalizeStrictChange(val) {
      await storage.set('strict_mode_enabled', val);
      await addActionLog(`Strict Mode turned ${val ? 'ON' : 'OFF'}`, 'info');
      (strictMsg as HTMLElement).innerText = val
        ? 'High-friction unblocking required.'
        : 'Prevent settings tampering during flow.';
      (strictMsg as HTMLElement).style.color = 'var(--muted)';
      checkbox.disabled = false;
      chrome.runtime.sendMessage({ action: 'manualSync' });
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
      await storage.set('guardian_pin', pin);
      await addActionLog('Guardian PIN updated', 'info');
      toast.success('Security layer active.');
      input.value = '';
    });

  container
    .querySelector('#btn_clear_pin')
    ?.addEventListener('click', async () => {
      const currentPin = await storage.getString('guardian_pin');
      if (!currentPin) {
        return;
      }
      const challenge = prompt('Enter current PIN to remove security layer:');
      if (challenge === currentPin) {
        await storage.delete('guardian_pin');
        await addActionLog('Guardian PIN decommissioned', 'warning');
        toast.info('Security layer offline.');
      } else if (challenge !== null) {
        toast.error('Access Denied');
      }
    });

  // Diagnostics & Sync
  const refreshStats = async () => {
    const statsDiv = container.querySelector('#sync_stats');
    if (!statsDiv) {
      return;
    }
    const syncState = await storage.getSyncState();

    statsDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div style="color: var(--muted); font-weight: 800; font-size: 10px;">NODE STATUS</div>
        <div style="color: var(--text); font-weight: 800; font-size: 10px; text-align: right;">${syncState.status.toUpperCase()}</div>
        <div style="color: var(--muted); font-weight: 800; font-size: 10px;">LAST SYNC</div>
        <div style="color: var(--text); font-weight: 800; font-size: 10px; text-align: right;">${
          syncState.lastSyncAt
            ? new Date(syncState.lastSyncAt).toLocaleTimeString()
            : 'NONE'
        }</div>
        <div style="color: var(--muted); font-weight: 800; font-size: 10px;">OPERATIONS</div>
        <div style="color: var(--accent); font-weight: 800; font-size: 10px; text-align: right;">${
          syncState.pendingOps || 0
        } PENDING</div>
      </div>
    `;
  };

  container
    .querySelector('#btn_refresh_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector('#btn_refresh_sync');
      btn.innerText = 'POLLING...';
      await refreshStats();
      btn.innerText = 'POLL STATUS';
    });

  container
    .querySelector('#btn_force_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector('#btn_force_sync');
      btn.innerText = 'PUSHING...';
      chrome.runtime.sendMessage({ action: 'manualSync' });
      setTimeout(async () => {
        await refreshStats();
        btn.innerText = 'PUSH STATE';
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
      resultDiv.style.background = 'rgba(255,255,255,0.03)';
      resultDiv.innerText = 'ANALYZING ENGINE...';

      const { getRules } = await import('@focusgate/state/rules');
      const rules = await getRules(storage);
      const localMatch = rules.find(
        (r) => (r.customDomain || r.packageName || '').toLowerCase() === domain,
      );
      const dnrTyped = dnrRules as chrome.declarativeNetRequest.Rule[];
      const dnrMatch = dnrTyped.find(
        (r) => r.condition.urlFilter && r.condition.urlFilter.includes(domain),
      );

      if (localMatch || dnrMatch) {
        resultDiv.style.color = 'var(--green)';
        resultDiv.innerHTML = `INTERCEPTED: ${
          localMatch ? 'ACTIVE RULE' : 'ENGINE AUTO-BLOCK'
        }`;
      } else {
        resultDiv.style.color = 'var(--yellow)';
        resultDiv.innerHTML = 'NOT FOUND LOCALLY';
      }
    });

  // Export/Import
  container
    .querySelector('#btn_export_rules')
    ?.addEventListener('click', async () => {
      const rulesStr = (await storage.getString(STORAGE_KEYS.RULES)) || '[]';
      const blob = new Blob([rulesStr as string], { type: 'application/json' });
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
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            throw new Error('Invalid schema');
          }
          await storage.set(STORAGE_KEYS.RULES, JSON.stringify(parsed));
          await addActionLog('Domain rules restored', 'success');
          toast.success('Rules synchronized.');
          chrome.runtime.sendMessage({ action: 'manualSync' });
          renderSettingsPage(container);
        } catch (err) {
          toast.error('Restore Failed: ' + err.message);
        }
      };
      input.click();
    });

  // Logs
  container
    .querySelector('#btn_clear_logs')
    ?.addEventListener('click', async () => {
      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      await addActionLog('Audit log history purged', 'info');
      toast.info('Telemetry cleared.');
    });

  container
    .querySelector('#btn_view_logs')
    ?.addEventListener('click', async () => {
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
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <button class="btn-tab active" data-filter="all">ALL ENTRIES</button>
            <button class="btn-tab" data-filter="error">ERRORS</button>
            <button class="btn-tab" data-filter="success">SYNC SUCCESS</button>
          </div>
          <div id="logs_list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-premium" id="btn_export_logs_file" style="background:transparent; border-color:var(--glass-border); box-shadow:none;">EXPORT LOGS</button>
          <button class="btn-premium" id="btn_close_logs_footer">CLOSE</button>
        </div>
      </div>
    `;

      document.body.appendChild(modalOverlay);

      const renderLogsList = (filter = 'all') => {
        const list = modalOverlay.querySelector('#logs_list');
        const filtered = logs.filter(
          (l) =>
            filter === 'all' ||
            l.level === filter ||
            l.message.toLowerCase().includes(filter),
        );

        list.innerHTML =
          filtered
            .map(
              (l) => `
        <div style="padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; font-family: monospace; font-size: 11px; display: flex; gap: 16px;">
          <span style="color: var(--muted); opacity: 0.5;">${new Date(
            l.timestamp,
          ).toLocaleTimeString()}</span>
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
          '<div class="empty-state">No matching log entries found.</div>';
      };

      renderLogsList();

      modalOverlay.querySelectorAll('.btn-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          modalOverlay
            .querySelectorAll('.btn-tab')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          renderLogsList(btn.getAttribute('data-filter'));
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
