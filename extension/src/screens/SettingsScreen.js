import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';

export async function renderSettingsScreen(container) {
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';

  container.innerHTML = `
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
      <div style="display: flex; gap: 10px;">
        <button class="btn" id="btn_save_config" style="flex: 1;">Login To NextDNS</button>
      </div>
      <div class="stat-lbl" style="margin-top: 12px;">Paste the Profile ID and API key from your NextDNS account page, then the app toggles become live true/false controls.</div>
    </div>

    <div class="app-card" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
      <div class="meta">
        <div class="stat-val" style="font-size: 16px;">Strict Mode</div>
        <div class="stat-lbl">High-friction unblocking required</div>
      </div>
      <input type="checkbox" id="chk_strict" ${
        strict ? 'checked' : ''
      } style="width: 20px; height: 20px; accent-color: var(--accent);">
    </div>

    <div class="app-card">
      <div class="section-title">Maintenance</div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn btn-outline" id="btn_clear_logs" style="text-align: left; padding: 12px 16px;">Clear Engine Logs</button>
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
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderSettingsScreen(container);
    });
  });

  container
    .querySelector('#btn_save_config')
    .addEventListener('click', async () => {
      const pid = container.querySelector('#cfg_profile').value.trim();
      const key = container.querySelector('#cfg_apiKey').value.trim();
      await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
      await storage.set(STORAGE_KEYS.API_KEY, key);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      alert('Settings synchronized.');
    });

  container
    .querySelector('#chk_strict')
    .addEventListener('change', async (e) => {
      await storage.set('strict_mode_enabled', e.target.checked);
      chrome.runtime.sendMessage({ action: 'manualSync' });
    });

  container
    .querySelector('#btn_clear_logs')
    .addEventListener('click', async () => {
      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      alert('Logs cleared.');
    });
}
