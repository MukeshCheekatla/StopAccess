import {
  getRules,
  updateRule,
  deleteRule,
  isRuleActive,
} from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import {
  escapeHtml,
  getAppIconUrl as getSmartIcon,
  resolveServiceIcon,
} from '@focusgate/core';
import { toast } from '../lib/toast.js';

export async function renderAppsPopup(container) {
  if (!container) {
    return;
  }

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
          .filter((r) => {
            const matchesSearch = (r.customDomain || r.packageName || '')
              .toLowerCase()
              .includes(searchTerm);
            const isServiceOrDomain =
              r.type === 'service' || r.type === 'domain';
            const isActive = isRuleActive(r);
            return matchesSearch && isServiceOrDomain && isActive;
          })
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
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="toggle-switch-btn ${
                isRuleActive(rule) ? 'active' : ''
              }" data-id="${escapeHtml(
              rule.customDomain || rule.packageName,
            )}" data-kind="${escapeHtml(rule.type)}" data-name="${escapeHtml(
              rule.appName || rule.packageName,
            )}">
                <span class="on-text">ON</span>
                <span class="off-text">OFF</span>
              </button>
              <button class="btn-icon delete-rule-popup" data-id="${escapeHtml(
                rule.packageName,
              )}" style="padding: 0; width: 24px; height: 24px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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

      container.querySelectorAll('.delete-rule-popup').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const rule = rules.find((r) => r.packageName === id);
          if (!rule) {
            return;
          }

          if (true) {
            // Standardizing on non-confirm deletion for utility speed
            try {
              if (isConfigured) {
                await nextDNSApi.setTargetState(rule.type, id, false);
                await nextDNSApi.refreshNextDNSMetadata();
              }
              await deleteRule(storage, id);
              chrome.runtime.sendMessage({ action: 'manualSync' });
              toast.info(`Rule removed: ${rule.appName || id}`);
              renderAppsPopup(container);
            } catch (err) {
              toast.error(`Sync Error: ${err.message}`);
            }
          }
        });
      });

      container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (btn.classList.contains('syncing')) {
            return;
          }

          const id = btn.dataset.id;
          const rule = rules.find(
            (r) => (r.customDomain || r.packageName) === id,
          );
          if (!rule) {
            return;
          }

          const isActive = isRuleActive(rule);
          const targetState = !isActive;

          // Feedback
          btn.classList.add('syncing');
          btn.style.opacity = '0.5';

          try {
            // 1. Remote Sync First (Invariant 3)
            if (isConfigured) {
              const remoteId =
                rule.type === 'domain'
                  ? rule.customDomain || rule.packageName
                  : rule.packageName;
              const res = await nextDNSApi.setTargetState(
                rule.type,
                remoteId,
                targetState,
              );

              if (!res.ok) {
                throw new Error(res.error || 'Sync Rejected');
              }
              await nextDNSApi.refreshNextDNSMetadata();
            }

            // 2. Local State Commit
            rule.mode = targetState ? 'block' : 'allow';
            rule.blockedToday = targetState;
            rule.desiredBlockingState = targetState;
            rule.updatedAt = Date.now();
            await updateRule(storage, rule);

            // 3. Engine Signal
            chrome.runtime.sendMessage({ action: 'manualSync' });

            // 4. UI Update
            btn.classList.remove('syncing');
            btn.classList.toggle('active', targetState);
            btn.style.opacity = '1';
            toast.success(
              `${rule.appName || id}: ${targetState ? 'ON' : 'OFF'}`,
            );
          } catch (err) {
            console.error('[FocusGate] Popup Toggle Fail:', err);
            btn.classList.remove('syncing');
            btn.style.opacity = '1';
            toast.error(`Sync Error: ${err.message}`);
          }
        });
      });

      // Bind Icon Fallbacks
      container.querySelectorAll('.rule-icon-img').forEach((img) => {
        img.addEventListener('load', () => {
          img.style.opacity = '1';
          const fallback = img.parentElement.querySelector('.logo-fallback');
          if (fallback) {
            fallback.style.opacity = '0';
          }
        });
        img.addEventListener('error', () => {
          const secondary = img.getAttribute('data-secondary');
          if (secondary && !img.dataset.retried) {
            img.dataset.retried = '1';
            img.src = secondary;
          } else {
            img.style.display = 'none';
            const fallback = img.parentElement.querySelector('.logo-fallback');
            if (fallback) {
              fallback.style.opacity = '1';
            }
          }
        });
      });
    };

    render();
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
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
    <div style="width:28px; height:28px; border-radius:8px; overflow:hidden; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); flex-shrink:0; position: relative;">
      <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: ${
        serviceIcon.accent || 'var(--muted)'
      }; z-index: 1; opacity: ${primaryIcon ? '0' : '1'};">${label}</div>
      ${
        primaryIcon
          ? `<img src="${primaryIcon}" 
               class="rule-icon-img"
               data-secondary="${secondaryIcon}"
               alt="" style="width:18px; height:18px; object-fit:contain; transition:opacity 0.2s ease; z-index: 2; opacity: 0;">`
          : ''
      }
    </div>
  `;
}
