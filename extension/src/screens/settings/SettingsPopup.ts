import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../background/platformAdapter';
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
        ACTIVE PROTOCOL <span style="color: var(--accent);">${(
          syncMode as string
        ).toUpperCase()}</span>
      </div>
      <button class="btn-premium" id="btn_goto_settings" style="width: 100%; margin-top: 14px; font-size: 10px; padding: 10px; justify-content: center; background: rgba(255,255,255,0.03); box-shadow: none; border-color: var(--glass-border);">OPEN CONTROL CENTER</button>
    </div>

    <div class="settings-section">
      <div class="field-label" style="margin-bottom: 12px;">ENFORCEMENT TIER</div>
      <div class="enforcement-grid" style="grid-template-columns: repeat(2, 1fr); gap: 6px; margin: 0;">
        <div class="enforcement-card ${
          syncMode === 'browser' ? 'active' : ''
        }" data-mode="browser" style="padding: 10px 4px; border-radius: 8px;">
          <div class="enforcement-level" style="font-size: 11px;">L1</div>
          <div class="enforcement-tag" style="font-size: 8px;">LOCAL</div>
        </div>
        <div class="enforcement-card ${
          syncMode === 'profile' ? 'active' : ''
        }" data-mode="profile" style="padding: 10px 4px; border-radius: 8px;">
          <div class="enforcement-level" style="font-size: 11px;">L2</div>
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
        // UI PIN Prompt for Popup
        const modalId = 'pinModal_' + Date.now();
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
          <div id="${modalId}" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:240px; z-index:10000; padding:24px; text-align:center; background:rgba(20,20,20,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color:white;">
            <div style="font-size:12px; font-weight:900; margin-bottom:12px;">ENTER GUARDIAN PIN</div>
            <input type="password" class="prompt-pin-input" maxlength="4" style="width:100%; height:36px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:white; text-align:center; letter-spacing:6px; font-size:16px; margin-bottom:16px;">
            <div style="display:flex; gap:8px;">
              <button class="btn-cancel" style="flex:1; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--muted); padding:8px; border-radius:8px; cursor:pointer; font-size:10px;">CANCEL</button>
              <button class="btn-confirm" style="flex:1; background:var(--accent); border:none; color:white; padding:8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px;">VERIFY</button>
            </div>
          </div>
          <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:9999; backdrop-filter:blur(4px);"></div>
        `;
        document.body.appendChild(modalContainer);

        const cleanup = () => document.body.removeChild(modalContainer);
        (
          modalContainer.querySelector('.prompt-pin-input') as HTMLInputElement
        ).focus();

        modalContainer
          .querySelector('.btn-cancel')
          ?.addEventListener('click', cleanup);
        modalContainer
          .querySelector('.btn-confirm')
          ?.addEventListener('click', async () => {
            const entered = (
              modalContainer.querySelector(
                '.prompt-pin-input',
              ) as HTMLInputElement
            ).value;
            if (entered === currentPin) {
              cleanup();
              await storage.set('fg_sync_mode', mode);
              chrome.runtime.sendMessage({ action: 'manualSync' });
              renderSettingsPopup(container);
            } else {
              const input = modalContainer.querySelector(
                '.prompt-pin-input',
              ) as HTMLInputElement;
              input.value = '';
              input.style.borderColor = 'var(--red)';
              setTimeout(() => {
                input.style.borderColor = 'rgba(255,255,255,0.1)';
              }, 1000);
            }
          });
        return;
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
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
          <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:240px; z-index:10000; padding:24px; text-align:center; background:rgba(20,20,20,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color:white;">
            <div style="font-size:12px; font-weight:900; margin-bottom:12px;">AUTHORIZE PURGE</div>
            <input type="password" class="prompt-pin-input" maxlength="4" style="width:100%; height:36px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:white; text-align:center; letter-spacing:6px; font-size:16px; margin-bottom:16px;">
            <div style="display:flex; gap:8px;">
              <button class="btn-cancel" style="flex:1; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--muted); padding:8px; border-radius:8px; cursor:pointer; font-size:10px;">CANCEL</button>
              <button class="btn-confirm" style="flex:1; background:var(--red); border:none; color:white; padding:8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px;">PURGE</button>
            </div>
          </div>
          <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:9999; backdrop-filter:blur(4px);"></div>
        `;
        document.body.appendChild(modalContainer);

        const cleanup = () => document.body.removeChild(modalContainer);
        (
          modalContainer.querySelector('.prompt-pin-input') as HTMLInputElement
        ).focus();

        modalContainer
          .querySelector('.btn-cancel')
          ?.addEventListener('click', cleanup);
        modalContainer
          .querySelector('.btn-confirm')
          ?.addEventListener('click', async () => {
            const entered = (
              modalContainer.querySelector(
                '.prompt-pin-input',
              ) as HTMLInputElement
            ).value;
            if (entered === currentPin) {
              cleanup();
              await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
              const btn = container.querySelector('#btn_flush_logs');
              btn.innerText = 'PURGED';
              btn.disabled = true;
              setTimeout(() => {
                btn.innerText = 'PURGE CACHE';
                btn.disabled = false;
              }, 1000);
            } else {
              const input = modalContainer.querySelector(
                '.prompt-pin-input',
              ) as HTMLInputElement;
              input.value = '';
              input.style.borderColor = 'var(--red)';
              setTimeout(() => {
                input.style.borderColor = 'rgba(255,255,255,0.1)';
              }, 1000);
            }
          });
        return;
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
