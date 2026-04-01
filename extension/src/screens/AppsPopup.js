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
import { escapeHtml, resolveServiceIcon } from '@focusgate/core';
import { toast } from '../lib/toast.js';

async function getCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.startsWith('http')) {
    try {
      return new URL(tab.url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }
  return null;
}

export async function renderAppsPopup(container) {
  if (!container) {
    return;
  }

  try {
    const rules = await getRules(storage);
    const isConfigured = await nextDNSApi.isConfigured();
    const currentDomain = await getCurrentTabDomain();
    const usageRes = await chrome.storage.local.get(['usage']);
    const usage = usageRes.usage || {};
    let searchTerm = '';

    // Get top 3 sites by usage that aren't already blocked
    const recentActivity = Object.entries(usage)
      .map(([domain, d]) => ({ domain, time: d.time || 0 }))
      .filter((d) => {
        const isAlreadyBlocked = rules.some((r) => {
          const ruleDomain = r.customDomain || r.packageName;
          return (
            ruleDomain === d.domain ||
            (ruleDomain && d.domain.endsWith(`.${ruleDomain}`))
          );
        });
        return d.time > 60000 && !isAlreadyBlocked;
      })
      .sort((a, b) => b.time - a.time)
      .slice(0, 3);

    const render = () => {
      const isAlreadyBlocked =
        currentDomain &&
        rules.some((r) => {
          const ruleDomain = r.customDomain || r.packageName;
          return (
            ruleDomain === currentDomain ||
            (ruleDomain && currentDomain.endsWith(`.${ruleDomain}`))
          );
        });

      const renderLimitSelector = (rule) => {
        const limitValue = rule.dailyLimitMinutes || 0;
        const options = [
          { value: 0, label: 'Instant Block' },
          { value: 5, label: '5m' },
          { value: 10, label: '10m' },
          { value: 15, label: '15m' },
          { value: 30, label: '30m' },
          { value: 45, label: '45m' },
          { value: 60, label: '1h' },
          { value: 90, label: '1.5h' },
          { value: 120, label: '2h' },
        ];

        return `
          <select class="edit-limit-select-popup" data-pkg="${escapeHtml(
            rule.packageName,
          )}" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text); font-size: 10px; padding: 2px 4px; outline: none; font-weight: 700;">
            ${options
              .map(
                (opt) => `
              <option value="${opt.value}" ${
                  limitValue === opt.value ? 'selected' : ''
                }>${opt.label}</option>
            `,
              )
              .join('')}
          </select>
        `;
      };

      container.innerHTML = `
      <div style="margin-bottom: 16px; display: flex; gap: 8px;">
        <div style="position: relative; flex: 1;">
          <input type="text" id="appSearch" placeholder="Filter active rules..." 
            style="width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none;" 
            value="${searchTerm}">
        </div>
        <button id="btnQuickAddManual" style="width: 38px; height: 38px; border-radius: 12px; background: var(--accent); border: none; color: #fff; font-size: 20px; font-weight: 400; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">+</button>
      </div>

      ${
        currentDomain && !isAlreadyBlocked
          ? `
      <div class="glass-card" style="margin-bottom: 20px; padding: 12px 14px; background: linear-gradient(135deg, rgba(82, 82, 91, 0.05), transparent); border-color: rgba(82, 82, 91, 0.2); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center;">
            <img src="https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64" style="width: 20px; height: 20px; border-radius: 4px;">
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #fff;">${currentDomain}</div>
            <div style="font-size: 9px; color: var(--muted); font-weight: 700; text-transform: uppercase;">CURRENT SITE</div>
          </div>
        </div>
        <button class="btn-premium" id="btnBlockCurrent" style="padding: 6px 12px; font-size: 10px; border-radius: 8px;">BLOCK SITE</button>
      </div>
      `
          : ''
      }

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">ENFORCEMENT RULES</div>
        <div style="font-size: 12px; font-weight: 900; color: var(--accent); background: rgba(37, 99, 235, 0.1); padding: 2px 6px; border-radius: 4px;">${
          rules.length
        }</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
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
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                    <div style="font-size: 9px; color: var(--muted); font-weight: 600; text-transform: uppercase;">Allowance:</div>
                    ${renderLimitSelector(rule)}
                  </div>
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

      ${
        recentActivity.length > 0
          ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">RECENT ACTIVITY</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${recentActivity
          .map(
            (a) => `
          <div class="glass-card" style="padding: 10px 14px; background: rgba(255,255,255,0.01); display: flex; align-items: center; justify-content: space-between; opacity: 0.8;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
              <img src="https://www.google.com/s2/favicons?domain=${a.domain}" style="width: 16px; height:16px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${a.domain}</div>
            </div>
            <button class="btn-quick-block-usage" data-domain="${a.domain}" style="background: rgba(108, 71, 255, 0.1); border: 1px solid rgba(108, 71, 255, 0.2); color: var(--accent); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">BLOCK</button>
          </div>
        `,
          )
          .join('')}
      </div>
      `
          : ''
      }
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
            const newMode = !targetState
              ? 'allow'
              : (rule.dailyLimitMinutes || 0) > 0
              ? 'limit'
              : 'block';
            rule.mode = newMode;
            rule.dailyLimitMinutes = rule.dailyLimitMinutes ?? 0;
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

      // Quick Add Current
      container
        .querySelector('#btnBlockCurrent')
        ?.addEventListener('click', async () => {
          const btn = container.querySelector('#btnBlockCurrent');
          btn.disabled = true;
          btn.innerText = 'WAIT...';

          try {
            const res = await nextDNSApi.resolveTargetInput(currentDomain);
            if (isConfigured) {
              await nextDNSApi.addResolvedTarget(res);
              await nextDNSApi.refreshNextDNSMetadata();
            }

            const rule = {
              packageName: res.normalizedId,
              appName: res.displayName,
              type: res.kind === 'service' ? 'service' : 'domain',
              customDomain:
                res.kind === 'domain' ? res.normalizedId : undefined,
              scope: res.kind === 'service' ? 'profile' : 'browser',
              mode: 'block',
              dailyLimitMinutes: 0,
              blockedToday: true,
              desiredBlockingState: true,
              usedMinutesToday: 0,
              addedByUser: true,
              updatedAt: Date.now(),
            };

            await updateRule(storage, rule);
            chrome.runtime.sendMessage({ action: 'manualSync' });
            toast.success(`Shielded: ${currentDomain}`);
            renderAppsPopup(container);
          } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
            btn.innerText = 'BLOCK SITE';
          }
        });

      // Manual Add from Search
      container
        .querySelector('#btnQuickAddManual')
        ?.addEventListener('click', async () => {
          const input =
            searchTerm || prompt('Enter domain to block (e.g. reddit.com):');
          if (!input || !input.includes('.')) {
            return;
          }

          try {
            const res = await nextDNSApi.resolveTargetInput(input);
            if (isConfigured) {
              await nextDNSApi.addResolvedTarget(res);
              await nextDNSApi.refreshNextDNSMetadata();
            }

            const rule = {
              packageName: res.normalizedId,
              appName: res.displayName,
              type: res.kind === 'service' ? 'service' : 'domain',
              customDomain:
                res.kind === 'domain' ? res.normalizedId : undefined,
              scope: res.kind === 'service' ? 'profile' : 'browser',
              mode: 'block',
              dailyLimitMinutes: 0,
              blockedToday: true,
              desiredBlockingState: true,
              usedMinutesToday: 0,
              addedByUser: true,
              updatedAt: Date.now(),
            };

            await updateRule(storage, rule);
            chrome.runtime.sendMessage({ action: 'manualSync' });
            toast.success(`Rule added for ${input}`);
            renderAppsPopup(container);
          } catch (err) {
            toast.error(`Add Fail: ${err.message}`);
          }
        });

      // Quick Block Activity
      container.querySelectorAll('.btn-quick-block-usage').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const domain = btn.dataset.domain;
          btn.disabled = true;
          btn.innerText = 'WAIT...';

          try {
            const rule = {
              packageName: domain,
              appName: domain,
              type: 'domain',
              customDomain: domain,
              scope: 'browser',
              mode: 'block',
              dailyLimitMinutes: 0,
              blockedToday: true,
              desiredBlockingState: true,
              usedMinutesToday: 0,
              addedByUser: true,
              updatedAt: Date.now(),
            };

            await updateRule(storage, rule);
            chrome.runtime.sendMessage({ action: 'manualSync' });
            toast.success(`Shielded: ${domain}`);
            renderAppsPopup(container);
          } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
            btn.innerText = 'BLOCK';
          }
        });
      });
      // Limit Change
      container
        .querySelectorAll('.edit-limit-select-popup')
        .forEach((select) => {
          select.addEventListener('change', async () => {
            const pkg = select.dataset.pkg;
            const val = parseInt(select.value, 10) || 0;
            const rule = rules.find((r) => r.packageName === pkg);
            if (rule) {
              const newMode = val > 0 ? 'limit' : 'block';
              rule.dailyLimitMinutes = val;
              rule.mode = newMode;
              rule.updatedAt = Date.now();
              await updateRule(storage, rule);
              chrome.runtime.sendMessage({ action: 'manualSync' });
              toast.success(
                `Limit set to ${select.options[select.selectedIndex].text}`,
              );
              renderAppsPopup(container);
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
  const iconInfo = resolveServiceIcon({
    id: rule.type === 'service' ? identifier : undefined,
    name: rule.appName,
  });
  const targetDomain = iconInfo.domain || identifier;
  const safeIconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    targetDomain,
  )}&sz=128`;
  const label = escapeHtml(identifier.slice(0, 2).toUpperCase() || '?');

  return `
    <div style="width:28px; height:28px; border-radius:8px; overflow:hidden; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.05); flex-shrink:0; position: relative;">
      <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0;">${label}</div>
      <img src="${safeIconUrl}" 
           class="rule-icon-img"
           onerror="this.style.display='none'; this.parentElement.querySelector('.logo-fallback').style.opacity='1';"
           alt="" style="width:18px; height:18px; object-fit:contain; z-index: 2;">
    </div>
  `;
}
