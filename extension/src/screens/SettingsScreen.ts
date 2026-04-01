import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import { UI_EXAMPLES } from '@focusgate/core';
import { addActionLog } from '../lib/logger';
import { toast } from '../lib/toast';

export async function renderSettingsScreen(container) {
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';

  const dnrRules = (await new Promise((resolve) => {
    if (chrome?.declarativeNetRequest?.getDynamicRules) {
      chrome.declarativeNetRequest.getDynamicRules(resolve);
    } else {
      resolve([]);
    }
  })) as any[];

  const healthOk = !!(profileId && apiKey);

  container.innerHTML = `
    <div class="app-card" style="margin-bottom: 24px; border-color: ${
      healthOk ? 'rgba(0,196,140,0.25)' : 'rgba(255,184,0,0.25)'
    }; background: ${
    healthOk ? 'rgba(0,196,140,0.04)' : 'rgba(255,184,0,0.04)'
  }">
      <div class="section-title" style="margin-top: 0; color: ${
        healthOk ? 'var(--green)' : 'var(--yellow)'
      }">Protection Health</div>
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted);">NextDNS Credentials</span>
          <span style="font-weight: 800; color: ${
            healthOk ? 'var(--green)' : 'var(--red)'
          };">${healthOk ? '✓ Configured' : '✗ Missing'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted);">Enforcement Mode</span>
          <span style="font-weight: 800; color: var(--accent);">${(
            syncMode as string
          ).toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted);">Browser DNR Rules</span>
          <span style="font-weight: 800; color: ${
            dnrRules.length > 0 ? 'var(--green)' : 'var(--muted)'
          };">${dnrRules.length} active</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted);">Strict Mode</span>
          <span style="font-weight: 800; color: ${
            strict ? 'var(--accent)' : 'var(--muted)'
          };">${strict ? 'ON' : 'OFF'}</span>
        </div>
      </div>
    </div>

    <div class="app-card" style="margin-bottom: 24px;">

      <div class="section-title">Focus Enforcement Level</div>
      <div class="btn-group" id="enforcement_modes">
        <button class="btn-tab ${
          syncMode === 'browser' ? 'active' : ''
        }" data-val="browser">Level 1: Local</button>
        <button class="btn-tab ${
          syncMode === 'hybrid' ? 'active' : ''
        }" data-val="hybrid">Level 2: Hybrid</button>
        <button class="btn-tab ${
          syncMode === 'profile' ? 'active' : ''
        }" data-val="profile">Level 3: Full</button>
      </div>
      <div class="stat-lbl" style="line-height: 1.4; margin-top: 12px; height: 32px;">
        ${
          syncMode === 'browser'
            ? 'Browser-only: FASTEST setup, local rules only.'
            : syncMode === 'hybrid'
            ? 'Hybrid: DNS + Browser blocking. Stronger persistence.'
            : 'Full: Network-wide services & categories via NextDNS.'
        }
      </div>
    </div>

    <div class="app-card" style="margin-bottom: 24px;">
      <div class="section-title">Connectivity (NextDNS)</div>
      <div class="field" style="margin-bottom: 16px;">
        <label class="stat-lbl">Profile ID</label>
        <input type="text" id="cfg_profile" value="${profileId}" placeholder="abc123" class="input" style="margin-top: 8px;">
      </div>
      <div class="field" style="margin-bottom: 16px;">
        <label class="stat-lbl">API Key</label>
        <input type="password" id="cfg_apiKey" value="${apiKey}" class="input" style="margin-top: 8px;">
      </div>
      <div id="connection_feedback" style="margin-bottom: 16px; display: none; padding: 12px; border-radius: 8px; font-size: 11px; line-height: 1.4;">
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn" id="btn_save_config" style="flex: 1;">Connect NextDNS</button>
      </div>
      <div class="stat-lbl" style="margin-top: 12px;">Paste the Profile ID and API key from your NextDNS account page to enable Level 2 & 3 enforcement.</div>
    </div>

    <div class="app-card" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
      <div class="meta">
        <div class="stat-val" style="font-size: 16px;">Strict Mode</div>
        <div class="stat-lbl" id="strict_status_msg">High-friction unblocking required</div>
      </div>
      <input type="checkbox" id="chk_strict" ${
        strict ? 'checked' : ''
      } style="width: 20px; height: 20px; accent-color: var(--accent);">
    </div>

    <div class="app-card" style="margin-bottom: 24px;">
      <div class="section-title">Test-Block Tool</div>
      <div style="display: flex; gap: 10px; margin-bottom: 12px;">
        <input type="text" id="test_domain" placeholder="${
          UI_EXAMPLES.GENERIC_DOMAIN
        }" class="input" style="flex: 1;">
        <button class="btn btn-outline" id="btn_test_domain" style="padding: 8px 16px;">Test</button>
      </div>
      <div id="test_result" style="display: none; padding: 12px; border-radius: 8px; font-size: 11px;"></div>
      <div class="stat-lbl" style="margin-top: 8px;">Check if a domain is currently covered by your local or cloud rules.</div>
    </div>

    <div class="app-card" style="margin-bottom: 24px;">
      <div class="section-title">Diagnostics & Sync</div>
      <div id="sync_stats" style="font-size: 11px; color: var(--muted); border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: rgba(0,0,0,0.1); margin-bottom: 12px;">
        <div class="loader">Gathering statistics...</div>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-outline" id="btn_refresh_sync" style="flex: 1; padding: 8px; font-size: 11px; text-transform: uppercase; font-weight: 800;">Check Hub Status</button>
        <button class="btn btn-outline" id="btn_force_sync" style="flex: 1; padding: 8px; font-size: 11px; text-transform: uppercase; font-weight: 800;">Push State Now</button>
      </div>
    </div>

    <div class="app-card" style="margin-bottom: 24px;">
      <div class="section-title">Backup & Restore</div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-outline" id="btn_export_rules" style="flex: 1; padding: 8px; font-size: 11px; text-transform: uppercase; font-weight: 800;">Export Rules</button>
        <button class="btn btn-outline" id="btn_import_rules" style="flex: 1; padding: 8px; font-size: 11px; text-transform: uppercase; font-weight: 800;">Import Rules</button>
      </div>
      <div class="stat-lbl" style="margin-top: 12px;">Export your custom rules to a JSON file, or import an existing backup.</div>
    </div>

    <div class="app-card">
      <div class="section-title">Guardian PIN</div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">Add a 4-digit PIN to lock rule deletions and unblocking actions.</div>
        <div style="display: flex; gap: 10px;">
          <input type="password" id="guardian_pin_input" placeholder="Enter 4 digits" maxlength="4" class="input" style="flex: 1; letter-spacing: 4px; text-align: center;">
          <button class="btn" id="btn_save_pin">Set PIN</button>
        </div>
        <button class="btn btn-outline" id="btn_clear_pin" style="color: var(--red); border-color: rgba(255, 71, 87, 0.2); font-size: 10px;">Remove PIN (Requires current PIN)</button>
      </div>
    </div>

    <div class="app-card">
      <div class="section-title">Maintenance & Engine</div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn btn-outline" id="btn_view_logs" style="text-align: left; padding: 12px 16px;">🔍 View Debug Logs</button>
        <button class="btn btn-outline" id="btn_clear_logs" style="text-align: left; padding: 12px 16px;">🗑️ Clear Engine Logs</button>
      </div>
    </div>

    <div style="padding: 20px; text-align: center; font-size: 11px; color: var(--muted); opacity: 0.5;">
      FOCUSGATE PRO v1.0.0 &bull; PRODUCTION MIRROR
    </div>
  `;

  // Handlers
  container.querySelectorAll('#enforcement_modes .btn-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-val');
      await storage.set('fg_sync_mode', mode);
      await addActionLog(
        `Changed enforcement mode to ${mode.toUpperCase()}`,
        'info',
      );
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderSettingsScreen(container);
    });
  });

  container
    .querySelector('#btn_save_config')
    .addEventListener('click', async () => {
      const pid = (
        container.querySelector('#cfg_profile') as HTMLInputElement
      ).value.trim();
      const key = (
        container.querySelector('#cfg_apiKey') as HTMLInputElement
      ).value.trim();
      const feedback = container.querySelector('#connection_feedback');
      const btn = container.querySelector('#btn_save_config');

      if (!pid || !key) {
        toast.error('Enter both Profile ID and API Key.');
        return;
      }

      btn.innerText = 'Verifying...';
      btn.disabled = true;
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(255,255,255,0.05)';
      feedback.style.color = 'var(--muted)';
      feedback.innerText = 'Connecting to NextDNS API...';

      try {
        await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
        await storage.set(STORAGE_KEYS.API_KEY, key);

        // Real validation call
        const { nextDNSApi } = await import('../background/platformAdapter');
        const ok = await nextDNSApi.testConnection();

        if (ok) {
          feedback.style.background = 'rgba(0, 196, 140, 0.1)';
          feedback.style.border = '1px solid rgba(0, 196, 140, 0.2)';
          feedback.style.color = 'var(--green)';
          feedback.innerHTML =
            '<strong>Connection Success!</strong><br>Account linked. Rules are now live.';
          btn.innerText = 'Connected';
          await addActionLog('Successfully linked NextDNS account', 'success');
        } else {
          throw new Error('Invalid Profile ID or API Key');
        }

        chrome.runtime.sendMessage({ action: 'manualSync' });
      } catch (err) {
        await addActionLog(`Failed to link NextDNS: ${err.message}`, 'error');
        feedback.style.background = 'rgba(255, 71, 87, 0.1)';
        feedback.style.border = '1px solid rgba(255, 71, 87, 0.2)';
        feedback.style.color = 'var(--red)';
        feedback.innerHTML = `<strong>Link Failed</strong><br>${err.message}`;
        btn.innerText = 'Retry Connection';
        btn.disabled = false;
      }
    });

  container
    .querySelector('#chk_strict')
    .addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const isChecked = target.checked;
      const msg = container.querySelector('#strict_status_msg') as HTMLElement;
      const checkbox = target;

      if (!isChecked) {
        // Cooldown/Friction for disabling
        checkbox.disabled = true;
        let seconds = 5;
        const interval = setInterval(() => {
          seconds--;
          if (seconds > 0) {
            msg.innerText = `Cooldown active: ${seconds}s remaining...`;
          } else {
            clearInterval(interval);
            finalizeStrictChange(false);
          }
        }, 1000);
        msg.innerText = `Cooldown active: ${seconds}s remaining...`;
        msg.style.color = 'var(--red)';
      } else {
        finalizeStrictChange(true);
      }

      async function finalizeStrictChange(val) {
        await storage.set('strict_mode_enabled', val);
        await addActionLog(`Strict Mode turned ${val ? 'ON' : 'OFF'}`, 'info');
        msg.innerText = val
          ? 'High-friction unblocking required'
          : 'Standard enforcement';
        msg.style.color = 'var(--muted)';
        checkbox.disabled = false;
        chrome.runtime.sendMessage({ action: 'manualSync' });
      }
    });

  container
    .querySelector('#btn_test_domain')
    .addEventListener('click', async () => {
      const domain = (
        container.querySelector('#test_domain') as HTMLInputElement
      ).value
        .trim()
        .toLowerCase();
      const resultDiv = container.querySelector('#test_result');

      if (!domain) {
        return;
      }

      resultDiv.style.display = 'block';
      resultDiv.style.background = 'rgba(255,255,255,0.05)';
      resultDiv.innerText = 'Checking rule coverage...';

      const { getRules } = await import('@focusgate/state/rules');
      const rules = await getRules(storage);
      const appRules = rules as any[];

      const localMatch = appRules.find(
        (r) => (r.domain || r.packageName || '').toLowerCase() === domain,
      );
      const dnrMatch = dnrRules.find(
        (r) => r.condition.urlFilter && r.condition.urlFilter.includes(domain),
      );

      if (localMatch || dnrMatch) {
        resultDiv.style.background = 'rgba(0, 196, 140, 0.1)';
        resultDiv.style.color = 'var(--green)';
        resultDiv.innerHTML = `<strong>Domain Intercepted</strong><br>${
          localMatch ? 'Direct Rule' : 'Engine Pattern'
        } covers this domain.`;
      } else {
        resultDiv.style.background = 'rgba(255, 184, 0, 0.1)';
        resultDiv.style.color = 'var(--yellow)';
        resultDiv.innerHTML =
          '<strong>Not Found Locally</strong><br>Check if Level 3 (Cloud) categories cover this implicitly.';
      }
    });

  const refreshStats = async () => {
    const statsDiv = container.querySelector('#sync_stats');
    if (!statsDiv) {
      return;
    }
    const syncState = await storage.getSyncState();
    statsDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Hub Status</span>
          <span style="color: var(--text); font-weight: 800;">${syncState.status.toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Last Success</span>
          <span style="color: var(--text);">${
            syncState.lastSyncAt
              ? new Date(syncState.lastSyncAt).toLocaleTimeString()
              : 'Never'
          }</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Pending Ops</span>
          <span style="color: var(--accent); font-weight: 800;">${
            syncState.pendingOps || 0
          }</span>
        </div>
      </div>
    `;
  };

  container
    .querySelector('#btn_refresh_sync')
    .addEventListener('click', async () => {
      const btn = container.querySelector('#btn_refresh_sync');
      btn.innerText = 'Checking...';
      await refreshStats();
      btn.innerText = 'Check Hub Status';
    });

  container
    .querySelector('#btn_force_sync')
    .addEventListener('click', async () => {
      const btn = container.querySelector('#btn_force_sync');
      btn.innerText = 'Pushing...';
      chrome.runtime.sendMessage({ action: 'manualSync' });
      setTimeout(async () => {
        await refreshStats();
        btn.innerText = 'Push State Now';
      }, 1500);
    });

  refreshStats();

  container
    .querySelector('#btn_export_rules')
    .addEventListener('click', async () => {
      const rulesStr = (await storage.getString(STORAGE_KEYS.RULES)) || '[]';
      const blob = new Blob([rulesStr as string], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusgate_rules_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await addActionLog('Exported rules backup', 'info');
    });

  container.querySelector('#btn_import_rules').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as any).files[0] as File;
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid format: Rules must be an array.');
        }
        await storage.set(STORAGE_KEYS.RULES, JSON.stringify(parsed));
        await addActionLog('Imported rules backup', 'success');
        toast.success('Rules imported successfully!');
        chrome.runtime.sendMessage({ action: 'manualSync' });
      } catch (err) {
        toast.error('Failed to import rules: ' + err.message);
      }
    };
    input.click();
  });

  container
    .querySelector('#btn_save_pin')
    .addEventListener('click', async () => {
      const pinInput = container.querySelector(
        '#guardian_pin_input',
      ) as HTMLInputElement;
      const pin = pinInput.value.trim();
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        toast.error('PIN must be 4 digits.');
        return;
      }
      await storage.set('guardian_pin', pin);
      await addActionLog('Guardian PIN updated');
      toast.success('PIN set successfully.');
      pinInput.value = '';
    });

  container
    .querySelector('#btn_clear_pin')
    .addEventListener('click', async () => {
      const currentPin = await storage.getString('guardian_pin');
      if (!currentPin) {
        toast.error('No PIN set.');
        return;
      }

      // UI PIN Prompt
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:280px; z-index:10000; padding:32px; text-align:center; background:rgba(20,20,20,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color:white;">
          <div style="font-size:14px; font-weight:900; margin-bottom:12px;">ENTER CURRENT PIN</div>
          <input type="password" id="prompt_pin_input" maxlength="4" style="width:100%; height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:white; text-align:center; letter-spacing:8px; font-size:18px; margin-bottom:20px;">
          <div style="display:flex; gap:10px;">
            <button class="btn-cancel" style="flex:1; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--muted); padding:10px; border-radius:10px; cursor:pointer;">CANCEL</button>
            <button class="btn-confirm" style="flex:1; background:var(--accent); border:none; color:white; padding:10px; border-radius:10px; cursor:pointer; font-weight:800;">VERIFY</button>
          </div>
        </div>
        <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; backdrop-filter:blur(4px);"></div>
      `;
      document.body.appendChild(modalContainer);

      const cleanup = () => document.body.removeChild(modalContainer);
      (
        modalContainer.querySelector('#prompt_pin_input') as HTMLInputElement
      ).focus();

      modalContainer
        .querySelector('.btn-cancel')
        ?.addEventListener('click', cleanup);
      modalContainer
        .querySelector('.btn-confirm')
        ?.addEventListener('click', async () => {
          const entered = (
            modalContainer.querySelector(
              '#prompt_pin_input',
            ) as HTMLInputElement
          ).value;
          if (entered === currentPin) {
            cleanup();
            await storage.delete('guardian_pin');
            await addActionLog('Guardian PIN removed');
            toast.success('PIN removed.');
          } else {
            toast.error('Incorrect PIN.');
          }
        });
    });

  container
    .querySelector('#btn_clear_logs')
    .addEventListener('click', async () => {
      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      await addActionLog('Cleared engine logs');
      toast.success('Logs cleared.');
    });

  container
    .querySelector('#btn_view_logs')
    .addEventListener('click', async () => {
      const logsStr = (await storage.getString(STORAGE_KEYS.LOGS)) || '[]';
      const logs = JSON.parse(logsStr as string);

      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.innerHTML = `
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <div class="modal-title">Engine Audit Trail</div>
          <button class="btn-outline" id="btn_close_logs" style="border:none; padding:4px;">✕</button>
        </div>
        <div class="modal-content" style="background: #050508;">
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <button class="btn-tab active log-filter" data-type="all">All</button>
            <button class="btn-tab log-filter" data-type="sync">Sync</button>
            <button class="btn-tab log-filter" data-type="rule">Rules</button>
            <button class="btn-tab log-filter" data-type="error">Errors</button>
          </div>
          <div id="logs_list" style="display: flex; flex-direction: column; gap: 4px;">
            ${
              logs.length === 0
                ? '<div class="empty-state">No logs available</div>'
                : ''
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn_export_logs">Export Log File</button>
          <button class="btn" id="btn_close_logs_footer">Close</button>
        </div>
      </div>
    `;

      document.body.appendChild(modalOverlay);

      const renderLogs = (type = 'all') => {
        const list = modalOverlay.querySelector('#logs_list');
        const filtered = logs.filter(
          (l) =>
            type === 'all' ||
            l.level.toLowerCase().includes(type) ||
            l.message.toLowerCase().includes(type),
        );

        list.innerHTML = filtered
          .map(
            (l) => `
        <div style="font-size: 10px; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.02); display: flex; gap: 10px; border-left: 2px solid ${
          l.level === 'error' ? 'var(--red)' : 'var(--accent)'
        };">
          <span style="color: var(--muted); font-family: monospace;">[${new Date(
            l.timestamp,
          ).toLocaleTimeString()}]</span>
          <span style="color: ${
            l.level === 'error' ? 'var(--red)' : 'var(--text)'
          };">${l.message}</span>
        </div>
      `,
          )
          .join('');
      };

      renderLogs();

      modalOverlay.querySelectorAll('.log-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
          modalOverlay
            .querySelectorAll('.log-filter')
            .forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          renderLogs(btn.getAttribute('data-type'));
        });
      });

      const closeModal = () => document.body.removeChild(modalOverlay);
      (modalOverlay.querySelector('#btn_close_logs') as HTMLElement).onclick =
        closeModal;
      (
        modalOverlay.querySelector('#btn_close_logs_footer') as HTMLElement
      ).onclick = closeModal;

      (modalOverlay.querySelector('#btn_export_logs') as HTMLElement).onclick =
        () => {
          const blob = new Blob([logsStr as string], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `focusgate_audit_${new Date()
            .toISOString()
            .slice(0, 10)}.json`;
          a.click();
        };
    });
}
