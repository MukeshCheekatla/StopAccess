import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';
import { UI_EXAMPLES } from '@focusgate/core';
import { addActionLog } from '../lib/logger.js';

export async function renderSettingsPage(container) {
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');

  const dnrRules = await new Promise((resolve) => {
    if (chrome?.declarativeNetRequest?.getDynamicRules) {
      chrome.declarativeNetRequest.getDynamicRules(resolve);
    } else {
      resolve([]);
    }
  });

  const healthOk = !!(profileId && apiKey);

  container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px;">
        <div style="font-size: 11px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 8px;">CONFIGURATION SETTINGS</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: -1.2px; line-height: 1;">SETTINGS</div>
        <div style="font-size: 14px; color: var(--muted); margin-top: 12px; font-weight: 500;">Manage your domain blocking rules and NextDNS synchronization.</div>
      </div>

      <div class="glass-card" style="margin-bottom: 32px; border-color: ${
        healthOk ? 'rgba(113, 113, 122, 0.2)' : 'rgba(82, 82, 91, 0.2)'
      }; padding: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
           <div>
              <div class="widget-title" style="color: ${
                healthOk ? 'var(--green)' : 'var(--red)'
              }; font-size: 13px; letter-spacing: 1.5px;">${
    healthOk ? 'PROTECTION VITALITY: OPTIMAL' : 'PROTECTION VITALITY: ALERT'
  }</div>
              <div style="font-size: 14px; color: var(--muted); margin-top: 4px; font-weight: 500;">Real-time shield diagnostic summary.</div>
           </div>
           <div style="padding: 6px 14px; border-radius: 20px; background: ${
             healthOk ? 'rgba(113, 113, 122, 0.1)' : 'rgba(82, 82, 91, 0.1)'
           }; color: ${
    healthOk ? 'var(--green)' : 'var(--red)'
  }; font-size: 10px; font-weight: 900; border: 1px solid ${
    healthOk ? 'rgba(113, 113, 122, 0.2)' : 'rgba(82, 82, 91, 0.2)'
  };">
              ${healthOk ? 'READY' : 'OFFLINE'}
           </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 10px; color: var(--muted); font-weight: 800; text-transform: uppercase;">Cloud Sync</span>
            <span style="font-size: 16px; font-weight: 800; color: ${
              healthOk ? 'var(--green)' : 'var(--red)'
            };">${healthOk ? 'CONNECTED' : 'UNLINKED'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 10px; color: var(--muted); font-weight: 800; text-transform: uppercase;">Strict Mode</span>
            <span style="font-size: 16px; font-weight: 800; color: ${
              strict ? 'var(--accent)' : 'var(--muted)'
            };">${strict ? 'ENFORCED' : 'OFF'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 10px; color: var(--muted); font-weight: 800; text-transform: uppercase;">Active Rules</span>
            <span style="font-size: 16px; font-weight: 800; color: var(--text);">${
              dnrRules.length
            } ENGINE</span>
          </div>
        </div>
      </div>

      <div class="glass-card" style="padding: 32px; margin-bottom: 32px;">
            <div class="widget-title" style="margin-bottom: 24px;">Cloud Hub (NextDNS)</div>
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div class="field">
                <input type="text" id="cfg_profile" value="${profileId}" placeholder="Profile ID (abc123)" class="input-premium" style="width: 100%; border-radius: 14px;">
              </div>
              <div class="field">
                <input type="password" id="cfg_apiKey" value="${apiKey}" placeholder="Secret API Key" class="input-premium" style="width: 100%; border-radius: 14px;">
              </div>
              <div id="connection_feedback" style="display: none; padding: 14px; border-radius: 14px; font-size: 11px; font-weight: 700; border: 1px solid var(--glass-border);"></div>
              <button class="btn-premium" id="btn_save_config" style="justify-content: center; height: 48px;">SYNCHRONIZE CLOUD</button>
            </div>
      </div>

      <div class="glass-card" style="padding: 32px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 24px;">
           <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(148, 163, 184, 0.05); border: 1px solid rgba(148, 163, 184, 0.15); display: flex; align-items: center; justify-content: center; font-size: 20px; color: var(--accent);">⬢</div>
           <div>
              <div class="widget-title" style="margin-bottom: 4px; font-size: 14px; letter-spacing: 0;">Strict Mode Enforcement</div>
              <div style="font-size: 12px; color: var(--muted); font-weight: 600;" id="strict_status_msg">Prevent quick-disabling of focus rules during active sessions.</div>
           </div>
        </div>
        <div style="position: relative;">
           <input type="checkbox" id="chk_strict" ${
             strict ? 'checked' : ''
           } style="width: 24px; height: 24px; accent-color: var(--accent); cursor:pointer;">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
         <div class="glass-card" style="padding: 24px;">
            <div class="widget-title" style="margin-bottom: 16px;">PIN PROTECTION</div>
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 20px; font-weight: 600;">Secure settings with a 4-digit master PIN.</div>
            <div style="display: flex; gap: 10px;">
               <input type="password" id="guardian_pin_input" placeholder="----" maxlength="4" class="input-premium" style="flex: 1; text-align: center; letter-spacing: 6px; font-weight: 900; border-radius: 14px;">
               <button class="btn-premium" id="btn_save_pin" style="padding: 0 20px;">SET PIN</button>
            </div>
            <button id="btn_clear_pin" style="background:none; border:none; color:var(--red); font-size:10px; font-weight:800; cursor:pointer; text-align:left; margin-top:16px;">REMOVE PIN</button>
         </div>

         <div class="glass-card" style="padding: 24px;">
            <div class="widget-title" style="margin-bottom: 16px;">DATA MANAGEMENT</div>
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 20px; font-weight: 600;">Export or import your rule configuration.</div>
            <div style="display: flex; gap: 12px;">
              <button class="btn-premium" id="btn_export_rules" style="flex:1; background: rgba(255,255,255,0.02); color:var(--text); box-shadow:none; border-color: var(--glass-border); justify-content: center;">EXPORT</button>
              <button class="btn-premium" id="btn_import_rules" style="flex:1; background: rgba(255,255,255,0.02); color:var(--text); box-shadow:none; border-color: var(--glass-border); justify-content: center;">IMPORT</button>
            </div>
         </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 60px;">
         <div class="glass-card" style="padding: 24px;">
            <div class="widget-title" style="margin-bottom: 16px;">RULE TESTER</div>
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 16px; font-weight: 600;">Check if a domain is covered by active rules.</div>
            <div style="display: flex; gap: 10px;">
               <input type="text" id="test_domain" placeholder="${
                 UI_EXAMPLES.GENERIC_DOMAIN
               }" class="input-premium" style="flex: 1; font-size: 13px; border-radius: 12px;">
               <button class="btn-premium" id="btn_test_domain" style="padding: 0 16px;">TEST</button>
            </div>
            <div id="test_result" style="display: none; padding: 14px; border-radius: 12px; font-size: 10px; font-weight: 800; margin-top: 16px; text-transform: uppercase;"></div>
         </div>

         <div class="glass-card" style="padding: 24px;">
            <div class="widget-title" style="margin-bottom: 16px;">CLOUD SYNC</div>
            <div id="sync_stats" style="margin-bottom: 20px;">
               <div class="loader">RETRIEVING STATUS...</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn-premium" id="btn_force_sync" style="flex:1; font-size: 11px; background: var(--accent); justify-content: center;">PUSH</button>
              <button class="btn-premium" id="btn_refresh_sync" style="flex:1; font-size: 11px; background: rgba(255,255,255,0.02); box-shadow: none; border-color: var(--glass-border); justify-content: center;">REFRESH</button>
            </div>
         </div>
      </div>

      <div style="padding: 40px; border-top: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
         <div>
            <div style="font-size: 13px; font-weight: 800; color: var(--muted);">AUDIT LOGS</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px;">Access extension activity logs for debugging.</div>
         </div>
         <div style="display: flex; gap: 12px;">
            <button class="btn-premium" id="btn_view_logs" style="background: transparent; border: 1px solid var(--glass-border); box-shadow: none;">VIEW CORE LOGS</button>
            <button class="btn-premium" id="btn_clear_logs" style="background: transparent; border: 1px solid rgba(82, 82, 91, 0.2); color: var(--red); box-shadow: none;">FLUSH CACHE</button>
         </div>
      </div>
    `;

  // Handlers

  container
    .querySelector('#btn_save_config')
    ?.addEventListener('click', async () => {
      const pid = container.querySelector('#cfg_profile').value.trim();
      const key = container.querySelector('#cfg_apiKey').value.trim();
      const feedback = container.querySelector('#connection_feedback');
      const btn = container.querySelector('#btn_save_config');

      if (!pid || !key) {
        alert('Enter both Profile ID and API Key.');
        return;
      }

      const currentPin = await storage.getString('guardian_pin');
      if (currentPin) {
        const challenge = prompt(
          'Enter Guardian PIN to authorize credential change:',
        );
        if (challenge !== currentPin) {
          alert('UNAUTHORIZED: Configuration locked.');
          return;
        }
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

        const { nextDNSApi } = await import('../background/platformAdapter.js');
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
    ?.addEventListener('change', async (e) => {
      const isChecked = e.target.checked;
      const msg = container.querySelector('#strict_status_msg');
      const checkbox = e.target;

      if (!isChecked) {
        const currentPin = await storage.getString('guardian_pin');
        if (currentPin) {
          const challenge = prompt(
            'Enter Guardian PIN to disable Strict Mode:',
          );
          if (challenge !== currentPin) {
            alert('UNAUTHORIZED: Shield remains active.');
            checkbox.checked = true;
            return;
          }
        }
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
    ?.addEventListener('click', async () => {
      const domain = container
        .querySelector('#test_domain')
        .value.trim()
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

      const localMatch = rules.find(
        (r) => (r.customDomain || r.packageName || '').toLowerCase() === domain,
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
          <span style="font-weight: 700;">Hub Status</span>
          <span style="color: var(--text); font-weight: 800; font-size: 10px;">${syncState.status.toUpperCase()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 700;">Last Entry</span>
          <span style="color: var(--text); font-size: 10px;">${
            syncState.lastSyncAt
              ? new Date(syncState.lastSyncAt).toLocaleTimeString()
              : 'Never'
          }</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 700;">Queue</span>
          <span style="color: var(--accent); font-weight: 800;">${
            syncState.pendingOps || 0
          }</span>
        </div>
      </div>
    `;
  };

  container
    .querySelector('#btn_refresh_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector('#btn_refresh_sync');
      btn.innerText = 'Checking...';
      await refreshStats();
      btn.innerText = 'Check Hub Status';
    });

  container
    .querySelector('#btn_force_sync')
    ?.addEventListener('click', async () => {
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
    ?.addEventListener('click', async () => {
      const rulesStr = (await storage.getString(STORAGE_KEYS.RULES)) || '[]';
      const blob = new Blob([rulesStr], { type: 'application/json' });
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

  container
    .querySelector('#btn_import_rules')
    ?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
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
          alert('Rules imported successfully!');
          chrome.runtime.sendMessage({ action: 'manualSync' });
          renderSettingsPage(container);
        } catch (err) {
          alert('Failed to import rules: ' + err.message);
        }
      };
      input.click();
    });

  container
    .querySelector('#btn_save_pin')
    ?.addEventListener('click', async () => {
      const pin = container.querySelector('#guardian_pin_input').value.trim();
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        alert('PIN must be 4 digits.');
        return;
      }
      await storage.set('guardian_pin', pin);
      await addActionLog('Guardian PIN updated');
      alert('PIN set successfully.');
      container.querySelector('#guardian_pin_input').value = '';
    });

  container
    .querySelector('#btn_clear_pin')
    ?.addEventListener('click', async () => {
      const currentPin = await storage.getString('guardian_pin');
      if (!currentPin) {
        alert('No PIN set.');
        return;
      }
      const entered = prompt('Enter current PIN to remove:');
      if (entered === currentPin) {
        await storage.delete('guardian_pin');
        await addActionLog('Guardian PIN removed');
        alert('PIN removed.');
      } else if (entered !== null) {
        alert('Incorrect PIN.');
      }
    });

  container
    .querySelector('#btn_clear_logs')
    ?.addEventListener('click', async () => {
      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      await addActionLog('Cleared engine logs');
      alert('Logs cleared.');
    });

  container
    .querySelector('#btn_view_logs')
    ?.addEventListener('click', async () => {
      const logsStr = (await storage.getString(STORAGE_KEYS.LOGS)) || '[]';
      const logs = JSON.parse(logsStr);

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
      modalOverlay.querySelector('#btn_close_logs').onclick = closeModal;
      modalOverlay.querySelector('#btn_close_logs_footer').onclick = closeModal;

      modalOverlay.querySelector('#btn_export_logs').onclick = () => {
        const blob = new Blob([logsStr], { type: 'application/json' });
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
