import { getRules, updateRule } from '@focusgate/state/rules';
import { extensionAdapter as storage } from '../background/platformAdapter.js';
import { getAppIconUrl as getSmartIcon } from '@focusgate/core';

export async function renderAppsPopup(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Configuring Perimeter...</div>';

  try {
    const rules = await getRules(storage);
    let searchTerm = '';

    const render = () => {
      container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <input type="text" id="appSearch" placeholder="Filter active rules..." 
          style="width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none;" 
          value="${searchTerm}">
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">ENFORCEMENT RULES</div>
        <div style="font-size: 9px; font-weight: 900; color: var(--accent); background: rgba(37, 99, 235, 0.1); padding: 2px 6px; border-radius: 4px;">${
          rules.length
        }</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${rules
          .filter((r) =>
            (r.customDomain || r.packageName || '')
              .toLowerCase()
              .includes(searchTerm),
          )
          .map(
            (rule) => `
          <div class="glass-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.01);">
            <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
              <div style="width:24px; height:24px; border-radius:6px; overflow:hidden; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); flex-shrink:0; position: relative;">
                <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: var(--muted); z-index: 1;"></div>
                <img src="${
                  getSmartIcon(rule.customDomain || rule.packageName) ||
                  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                    rule.customDomain || rule.packageName,
                  )}&sz=64`
                }" 
                     alt="" style="width:16px; height:16px; object-fit:contain; transition:opacity 0.2s ease; z-index: 2;" 
                     onload="this.style.opacity='1';" 
                     onerror="
                        if (!this.dataset.retried && this.src.indexOf('google.com') === -1) {
                          this.dataset.retried = '1';
                          this.src = 'https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                            rule.customDomain || rule.packageName,
                          )}&sz=64';
                        } else {
                          this.style.display = 'none';
                          const fallbackElement = this.parentElement.querySelector('.logo-fallback');
                          if (fallbackElement) {
                             fallbackElement.innerText = '${(
                               rule.customDomain ||
                               rule.packageName ||
                               '?'
                             )
                               .slice(0, 2)
                               .toUpperCase()}';
                          }
                        }
                     ">
              </div>
              <div style="min-width:0; flex:1;">
                 <div style="font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
                   rule.appName || rule.packageName,
                 )}</div>
                 <div style="font-size: 9px; color: var(--muted); font-weight: 600; text-transform: uppercase;">${
                   rule.scope || 'LOCAL'
                 }</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <button class="toggle-switch-btn ${
                rule.mode === 'block' ? 'active' : ''
              }" data-id="${rule.id}">
                ${rule.mode === 'block' ? 'BLOCKED' : 'ALLOW'}
              </button>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
      `;

      const searchInput = container.querySelector('#appSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchTerm.length, searchTerm.length);
        searchInput.addEventListener('input', (e) => {
          searchTerm = e.target.value.toLowerCase();
          render();
        });
      }

      container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const rule = rules.find((r) => r.id === id);
          if (rule) {
            rule.mode = rule.mode === 'block' ? 'allow' : 'block';
            await updateRule(storage, rule);
            render();
          }
        });
      });
    };

    render();
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
