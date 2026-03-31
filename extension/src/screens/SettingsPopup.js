import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';

export async function renderSettingsPopup(container) {
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';
  const healthOk = !!(profileId && apiKey);

  container.innerHTML = `
    <div class="glass-card widget-card" style="margin-bottom: 20px; border-color: ${
      healthOk ? 'rgba(0,208,148,0.2)' : 'rgba(255,71,87,0.2)'
    };">
      <div class="widget-title" style="color: ${
        healthOk ? 'var(--green)' : 'var(--red)'
      }; font-size: 11px;">
        ${healthOk ? 'PROTECTION SECURED' : 'UNLINKED PROFILE'}
      </div>
      <div style="font-size: 11px; margin-top: 8px; font-weight:600; color:var(--text);">
        LEVEL: <span style="color:var(--accent);">${syncMode.toUpperCase()}</span>
      </div>
      <button class="btn-premium" id="btn_goto_settings" style="width: 100%; margin-top: 14px; font-size: 11px; padding: 8px;">CONFIGURE FULL PAGE</button>
    </div>

    <div class="glass-card widget-card" style="margin-bottom: 20px;">
      <div class="widget-title" style="font-size: 10px;">ENFORCEMENT MASTER</div>
      <div class="btn-group" style="margin-top: 10px;">
        <button class="nav-item ${
          syncMode === 'browser' ? 'active' : ''
        }" data-val="browser" style="flex:1; font-size:10px; border:1px solid var(--glass-border);">L1</button>
        <button class="nav-item ${
          syncMode === 'hybrid' ? 'active' : ''
        }" data-val="hybrid" style="flex:1; font-size:10px; border:1px solid var(--glass-border);">L2</button>
        <button class="nav-item ${
          syncMode === 'profile' ? 'active' : ''
        }" data-val="profile" style="flex:1; font-size:10px; border:1px solid var(--glass-border);">L3</button>
      </div>
    </div>
    
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn-premium" id="btn_manual_sync" style="background:rgba(255,255,255,0.05); color:var(--text); box-shadow:none; font-size: 11px;">PUSH TO ALL NODES</button>
      <button class="btn-premium" id="btn_flush_logs" style="background:rgba(255,255,255,0.05); color:var(--red); box-shadow:none; font-size: 11px; border-color:rgba(255,71,87,0.1);">FLUSH LOCAL CACHE</button>
    </div>
  `;

  container
    .querySelector('#btn_goto_settings')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('dist/dashboard.html') + '?tab=settings',
      });
    });

  container.querySelectorAll('.btn-group button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-val');
      await storage.set('fg_sync_mode', mode);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderSettingsPopup(container);
    });
  });

  container.querySelector('#btn_manual_sync')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'manualSync' });
    const btn = container.querySelector('#btn_manual_sync');
    btn.innerText = 'SYNCING...';
    setTimeout(() => (btn.innerText = 'PUSH TO ALL NODES'), 1500);
  });

  container
    .querySelector('#btn_flush_logs')
    ?.addEventListener('click', async () => {
      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      const btn = container.querySelector('#btn_flush_logs');
      btn.innerText = 'FLUSHED';
      setTimeout(() => (btn.innerText = 'FLUSH LOCAL CACHE'), 1000);
    });
}
