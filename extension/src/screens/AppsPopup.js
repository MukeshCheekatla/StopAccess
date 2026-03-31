import { getRules, updateRule } from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import {
  getAppIconUrl as getSmartIcon,
  resolveServiceIcon,
} from '@focusgate/core';

export async function renderAppsPopup(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Configuring Perimeter...</div>';

  try {
    const rules = await getRules(storage);
    const isConfigured = await nextDNSApi.isConfigured();
    let searchTerm = '';

    const render = () => {
      container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <input type="text" id="appSearch" placeholder="Filter active rules..." 
          style="width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none;" 
          value="${searchTerm}">
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">ENFORCEMENT RULES</div>
        <div style="font-size: 12px; font-weight: 900; color: var(--accent); background: rgba(37, 99, 235, 0.1); padding: 2px 6px; border-radius: 4px;">${
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
              ${renderRuleIcon(rule)}
              <div style="min-width:0; flex:1;">
                 <div style="font-size: 13px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
                   rule.appName || rule.packageName,
                 )}</div>
                 <div style="font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase;">${
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
          if (btn.classList.contains('syncing')) {
            return;
          }

          const id = btn.dataset.id;
          const rule = rules.find((r) => r.id === id);
          if (!rule) {
            return;
          }

          const isActive = rule.mode === 'block';
          const targetState = !isActive;

          // Feedback
          btn.classList.add('syncing');
          btn.innerText = '···';

          try {
            // 1. Remote Sync
            if (isConfigured) {
              let res;
              if (rule.type === 'service') {
                res = await nextDNSApi.setServiceState(
                  rule.packageName,
                  targetState,
                );
              } else if (rule.type === 'category') {
                res = await nextDNSApi.setCategoryState(
                  rule.packageName,
                  targetState,
                );
              } else {
                res = await nextDNSApi.setDenylistDomainState(
                  rule.packageName || rule.customDomain,
                  targetState,
                );
              }

              if (res && !res.ok) {
                throw new Error(res.error?.message || 'Sync Rejected');
              }
            }

            // 2. Local State
            rule.mode = targetState ? 'block' : 'allow';
            rule.blockedToday = targetState;
            rule.desiredBlockingState = targetState;
            await updateRule(storage, rule);

            // 3. Engine Signal
            chrome.runtime.sendMessage({ action: 'manualSync' });

            // 4. UI Update
            btn.classList.remove('syncing');
            btn.classList.toggle('active', targetState);
            btn.innerText = targetState ? 'BLOCKED' : 'ALLOW';
          } catch (err) {
            console.error('[FocusGate] Popup Toggle Fail:', err);
            btn.classList.remove('syncing');
            btn.innerText = isActive ? 'BLOCKED' : 'ALLOW';
            alert(`SYNC ERROR: ${err.message}`);
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

function renderRuleIcon(rule) {
  const identifier = rule.customDomain || rule.packageName || '';
  const serviceIcon = resolveServiceIcon({
    id: rule.type === 'service' ? identifier : undefined,
    name: rule.appName,
  });
  const primaryIcon =
    getSmartIcon(identifier) ||
    serviceIcon.url ||
    serviceIcon.fallbackUrl ||
    '';
  const fallbackDomain =
    serviceIcon.domain || (String(identifier).includes('.') ? identifier : '');
  const secondaryIcon =
    serviceIcon.fallbackUrl ||
    (fallbackDomain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          fallbackDomain,
        )}&sz=64`
      : '');
  const label = escapeHtml(identifier.slice(0, 2).toUpperCase() || '?');

  return `
    <div style="width:24px; height:24px; border-radius:6px; overflow:hidden; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); flex-shrink:0; position: relative;">
      <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${
        serviceIcon.accent || 'var(--muted)'
      }; z-index: 1; opacity: ${primaryIcon ? '0' : '1'};">${label}</div>
      ${
        primaryIcon
          ? `<img src="${primaryIcon}" 
               alt="" style="width:16px; height:16px; object-fit:contain; transition:opacity 0.2s ease; z-index: 2; opacity: 0;" 
               onload="this.style.opacity='1'; const fallback = this.parentElement.querySelector('.logo-fallback'); if (fallback) fallback.style.opacity='0';" 
               onerror="
                  if (!this.dataset.retried && '${secondaryIcon}') {
                    this.dataset.retried = '1';
                    this.src = '${secondaryIcon}';
                  } else {
                    this.style.display = 'none';
                    const fallback = this.parentElement.querySelector('.logo-fallback');
                    if (fallback) fallback.style.opacity = '1';
                  }
               ">`
          : ''
      }
    </div>
  `;
}
