import { getRules, updateRule, isRuleActive } from '@focusgate/state/rules';
import { extensionAdapter as storage } from '../../background/platformAdapter';
import {
  escapeHtml,
  resolveServiceIcon,
  findServiceIdByDomain,
} from '@focusgate/core';
import { toast } from '../../lib/toast';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';

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
    const currentDomain = await getCurrentTabDomain();
    const lockedDomains = await getLockedDomains();
    const usageRes = await chrome.storage.local.get(['usage']);
    const usage = usageRes.usage || {};
    let searchTerm = '';

    // Get top 3 sites by usage that aren't already blocked
    const recentActivity = Object.entries(usage)
      .map(([domain, d]) => ({ domain, time: d.time || 0 }))
      .filter((d) => {
        const isAlreadyBlocked = rules.some((r) => {
          const ruleActive = r.blockedToday || r.mode === 'block';
          if (!ruleActive) {
            return false;
          }
          const ruleDomain = r.customDomain || r.packageName;
          if (
            ruleDomain === d.domain ||
            (ruleDomain && d.domain.endsWith(`.${ruleDomain}`))
          ) {
            return true;
          }
          if (r.type === 'service') {
            const serviceIdForDomain = findServiceIdByDomain(d.domain);
            if (serviceIdForDomain === r.packageName) {
              return true;
            }
          }
          return false;
        });
        return d.time > 60000 && !isAlreadyBlocked;
      })
      .sort((a, b) => b.time - a.time)
      .slice(0, 3);

    const render = () => {
      const isAlreadyBlocked =
        currentDomain &&
        rules.some((r) => {
          const ruleActive = r.blockedToday || r.mode === 'block';
          if (!ruleActive) {
            return false;
          }
          const ruleDomain = r.customDomain || r.packageName;
          if (
            ruleDomain === currentDomain ||
            (ruleDomain && currentDomain.endsWith(`.${ruleDomain}`))
          ) {
            return true;
          }
          if (r.type === 'service') {
            const serviceIdForDomain = findServiceIdByDomain(currentDomain);
            if (serviceIdForDomain === r.packageName) {
              return true;
            }
          }
          return false;
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

      if (!container.querySelector('#popupShell')) {
        container.innerHTML = `
        <div id="popupShell">
          <div class="glass-card" style="margin-bottom: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">Block List</div>
              <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.02em;">Manage rules quickly</div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
              <div style="text-align: center; min-width: 56px;">
                <div class="stat-val" id="rulesCount" style="font-size: 16px;">0</div>
                <div class="stat-lbl" style="font-size: 9px; text-transform: uppercase;">Rules</div>
              </div>
              <div style="text-align: center; min-width: 56px;">
                <div class="stat-val" style="font-size: 16px; color: var(--accent);" id="recentCount">${recentActivity.length}</div>
                <div class="stat-lbl" style="font-size: 9px; text-transform: uppercase;">Recent</div>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 14px; display: flex; gap: 8px;">
            <div style="position: relative; flex: 1;">
              <input type="text" id="appSearch" placeholder="Filter active rules..." 
                style="width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none;" 
                value="${searchTerm}">
            </div>
            <button id="btnQuickAddManual" style="width: 38px; height: 38px; border-radius: 12px; background: var(--accent); border: none; color: #fff; font-size: 20px; font-weight: 400; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">+</button>
          </div>

          <div id="currentSiteBox"></div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 2px;">
            <div>
              <div style="font-size: 13px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">Enforcement Rules</div>
              <div style="font-size: 10px; color: var(--muted); margin-top: 3px;">Directly manage active domain and app blocks.</div>
            </div>
          </div>

          <div id="rulesList" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;"></div>

          <div id="recentActivityBox"></div>
        </div>
        `;
      }

      const currentSiteBox = container.querySelector('#currentSiteBox');
      if (currentSiteBox) {
        currentSiteBox.innerHTML =
          currentDomain && !isAlreadyBlocked
            ? `
          <div class="glass-card" style="margin-bottom: 16px; padding: 12px 14px; background: linear-gradient(135deg, rgba(82, 82, 91, 0.08), transparent); border-color: rgba(82, 82, 91, 0.22); display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center;">
                <img src="https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64" style="width: 20px; height: 20px; border-radius: 4px;">
              </div>
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #fff;">${currentDomain}</div>
                <div style="font-size: 9px; color: var(--muted); font-weight: 700; text-transform: uppercase; margin-top: 2px;">Current Site</div>
              </div>
            </div>
            <button class="btn-premium" id="btnBlockCurrent" style="padding: 6px 10px; font-size: 10px; border-radius: 8px;">Block</button>
          </div>
          `
            : '';
      }

      const rulesCount = container.querySelector('#rulesCount');
      if (rulesCount) {
        rulesCount.textContent = rules.length.toString();
      }
      const recentCount = container.querySelector('#recentCount');
      if (recentCount) {
        recentCount.textContent = recentActivity.length.toString();
      }

      const rulesList = container.querySelector('#rulesList');
      if (rulesList) {
        const rulesHtml = rules
          .filter((r) => {
            const mSearch = (r.customDomain || r.packageName || '')
              .toLowerCase()
              .includes(searchTerm);
            const isServiceOrDomain =
              r.type === 'service' || r.type === 'domain';
            return mSearch && isServiceOrDomain;
          })
          .map(
            (rule) => `
          <div class="glass-card" style="padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.01);">
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
            <div style="display:flex; align-items:center; gap:6px; flex-shrink: 0;">
              <button class="toggle-switch-btn ${
                isRuleActive(rule) ? 'active' : ''
              }" ${
              lockedDomains.includes(rule.packageName) ? 'disabled' : ''
            } data-id="${escapeHtml(
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
                ${
                  lockedDomains.includes(rule.packageName)
                    ? '🔒'
                    : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
                }
              </button>
            </div>
          </div>
        `,
          )
          .join('');

        if (rulesList.innerHTML !== rulesHtml) {
          rulesList.innerHTML = rulesHtml;
        }
      }

      const recentActivityBox = container.querySelector('#recentActivityBox');
      if (recentActivityBox) {
        recentActivityBox.innerHTML =
        recentActivity.length > 0
            ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 2px;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">Recent Activity</div>
            <div style="font-size: 10px; color: var(--muted); margin-top: 3px;">Fast block suggestions based on recent browsing.</div>
          </div>
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
              <button class="btn-quick-block-usage" data-domain="${a.domain}" style="background: rgba(82, 82, 91, 0.12); border: 1px solid rgba(82, 82, 91, 0.24); color: var(--text); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">Block</button>
            </div>
          `,
            )
            .join('')}
        </div>
        `
            : '';
      }

      const searchInput = container.querySelector('#appSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchTerm.length, searchTerm.length);
        searchInput.addEventListener('input', (e) => {
          searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
          render();
        });

        searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            const btn = container.querySelector(
              '#btnQuickAddManual',
            ) as HTMLButtonElement;
            if (btn && !btn.disabled) {
              e.preventDefault();
              btn.click();
            }
          }
        });
      }

      container.querySelectorAll('.delete-rule-popup').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = (btn as HTMLElement).dataset.id;
          const result = await appsController.removeRule(id, rules);
          if (result.ok) {
            renderAppsPopup(container);
          }
        });
      });

      container.querySelectorAll('.toggle-switch-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const btnEl = btn as HTMLElement;
          if (btnEl.hasAttribute('disabled')) {
            return;
          }

          const id = btnEl.dataset.id;
          const kind = btnEl.dataset.kind;
          const name = btnEl.dataset.name;
          const wasActive = btnEl.classList.contains('active');
          const targetState = !wasActive;

          // Optimistic UI Update
          btnEl.classList.toggle('active', targetState);
          btnEl.style.opacity = '0.5';

          const result = await appsController.toggleRule(
            kind,
            id,
            name,
            targetState,
            rules,
          );

          if (result.ok) {
            btnEl.style.opacity = '1';
            // Smoothly update the underlying state and re-render the dynamic bits
            render();
          } else {
            // Revert on failure
            btnEl.classList.toggle('active', wasActive);
            btnEl.style.opacity = '1';
          }
        });
      });

      container
        .querySelector('#btnBlockCurrent')
        ?.addEventListener('click', async () => {
          const btn = container.querySelector(
            '#btnBlockCurrent',
          ) as HTMLButtonElement;
          btn.disabled = true;
          btn.innerText = 'WAIT...';

          const result = await appsController.addDomainRule(currentDomain);
          if (result.ok) {
            renderAppsPopup(container);
          } else {
            btn.disabled = false;
            btn.innerText = 'BLOCK SITE';
          }
        });

      container
        .querySelector('#btnQuickAddManual')
        ?.addEventListener('click', async () => {
          const input =
            searchTerm || prompt('Enter domain to block (e.g. reddit.com):');
          if (!input || !input.includes('.')) {
            return;
          }

          const result = await appsController.addDomainRule(input);
          if (result.ok) {
            renderAppsPopup(container);
          }
        });

      container.querySelectorAll('.btn-quick-block-usage').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const domain = (btn as HTMLElement).dataset.domain;
          (btn as HTMLButtonElement).disabled = true;
          btn.innerText = 'WAIT...';

          const result = await appsController.addDomainRule(domain);
          if (result.ok) {
            renderAppsPopup(container);
          } else {
            (btn as HTMLButtonElement).disabled = false;
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
