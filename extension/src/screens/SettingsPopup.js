import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../background/platformAdapter.js';
import { buildDashboardTabPath } from '@focusgate/core';

export async function renderSettingsPopup(container) {
  if (!container) {
    return;
  }

  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';
  const healthOk = !!(profileId && apiKey);

  container.innerHTML = `
    <div class="glass-card" style="margin-bottom: 20px; padding: 16px; border-color: ${
      healthOk ? 'var(--green)' : 'var(--red)'
    }; background: ${
    healthOk ? 'rgba(0,208,148,0.02)' : 'rgba(255,71,87,0.02)'
  };">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div class="widget-title" style="color: ${
          healthOk ? 'var(--green)' : 'var(--red)'
        }; font-size: 10px; letter-spacing: 1px;">
          ${healthOk ? 'SHIELD ONLINE' : 'NODE DISCONNECTED'}
        </div>
        <div class="status-pill ${
          healthOk ? 'active' : 'error'
        }" style="padding: 4px 8px; font-size: 9px; min-width: auto; height: auto;">
          ${healthOk ? 'SYNCHRONIZED' : 'OFFLINE'}
        </div>
      </div>
      <div style="font-size: 11px; font-weight: 700; color: var(--muted); display: flex; justify-content: space-between;">
        ACTIVE PROTOCOL <span style="color: var(--accent);">${syncMode.toUpperCase()}</span>
      </div>
      <button class="btn-premium" id="btn_goto_settings" style="width: 100%; margin-top: 14px; font-size: 10px; padding: 10px; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: none; border-color: var(--glass-border);">OPEN CONTROL CENTER</button>
    </div>

    <div class="settings-section">
      <div class="field-label" style="margin-bottom: 12px;">ENFORCEMENT TIER</div>
      <div class="enforcement-grid" style="grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 0;">
        <div class="enforcement-card ${
          syncMode === 'browser' ? 'active' : ''
        }" data-mode="browser" style="padding: 10px 4px; border-radius: 8px;">
          <div class="enforcement-level" style="font-size: 11px;">L1</div>
          <div class="enforcement-tag" style="font-size: 8px;">LOCAL</div>
        </div>
        <div class="enforcement-card ${
          syncMode === 'hybrid' ? 'active' : ''
        }" data-mode="hybrid" style="padding: 10px 4px; border-radius: 8px;">
          <div class="enforcement-level" style="font-size: 11px;">L2</div>
          <div class="enforcement-tag" style="font-size: 8px;">HYBRID</div>
        </div>
        <div class="enforcement-card ${
          syncMode === 'profile' ? 'active' : ''
        }" data-mode="profile" style="padding: 10px 4px; border-radius: 8px;">
          <div class="enforcement-level" style="font-size: 11px;">L3</div>
          <div class="enforcement-tag" style="font-size: 8px;">CLOUD</div>
        </div>
      </div>
    </div>
    
    <div class="settings-section-divider" style="margin: 20px 0;"></div>
    
    <div style="display:flex; flex-direction:column; gap:10px;">
      <button class="btn-premium" id="btn_manual_sync" style="background:var(--accent); color:#fff; font-size: 11px; height: 40px; justify-content: center;">SYNCHRONIZE ALL NODES</button>
      <div class="action-grid" style="grid-template-columns: 1fr 1fr; margin-top: 4px;">
        <button class="btn-premium" id="btn_view_logs" style="background:rgba(255,255,255,0.02); color:var(--text); box-shadow:none; font-size: 9px; border-color:var(--glass-border); justify-content: center; padding: 8px;">AUDIT TRAIL</button>
        <button class="btn-premium" id="btn_flush_logs" style="background:rgba(255,255,255,0.02); color:var(--red); box-shadow:none; font-size: 9px; border-color:rgba(255,71,87,0.1); justify-content: center; padding: 8px;">PURGE CACHE</button>
      </div>
    </div>
  `;

  // Handlers
  container
    .querySelector('#btn_goto_settings')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
      });
    });

  container.querySelectorAll('.enforcement-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const mode = card.getAttribute('data-mode');

      const currentPin = await storage.getString('guardian_pin');
      if (currentPin) {
        const challenge = prompt(
          'Enter Guardian PIN to change enforcement level:',
        );
        if (challenge !== currentPin) {
          alert('UNAUTHORIZED: Shield remains active.');
          return;
        }
      }

      await storage.set('fg_sync_mode', mode);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderSettingsPopup(container);
    });
  });

  container.querySelector('#btn_manual_sync')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'manualSync' });
    const btn = container.querySelector('#btn_manual_sync');
    btn.innerText = 'SYNCHRONIZING...';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerText = 'NODES UPDATED';
      setTimeout(() => {
        btn.innerText = 'SYNCHRONIZE ALL NODES';
        btn.disabled = false;
      }, 1000);
    }, 1500);
  });

  container.querySelector('#btn_view_logs')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
    });
  });

  container
    .querySelector('#btn_flush_logs')
    ?.addEventListener('click', async () => {
      const currentPin = await storage.getString('guardian_pin');
      if (currentPin) {
        const challenge = prompt('Enter Guardian PIN to purge session logs:');
        if (challenge !== currentPin) {
          alert('UNAUTHORIZED');
          return;
        }
      }

      await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
      const btn = container.querySelector('#btn_flush_logs');
      btn.innerText = 'PURGED';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerText = 'PURGE CACHE';
        btn.disabled = false;
      }, 1000);
    });
}
