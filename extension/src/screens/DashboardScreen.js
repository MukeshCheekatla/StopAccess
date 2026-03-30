import { getRules } from '@focusgate/state/rules';
import { extensionAdapter as storage } from '../background/platformAdapter.js';
import { getDomainIcon } from '../lib/appCatalog.js';

function fmtTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m`;
  }
  return `${Math.floor(ms / 1000)}s`;
}

function fmtDate(iso) {
  if (!iso || iso === 'Never') {
    return 'Never';
  }
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function openSettingsPage() {
  const url = chrome.runtime.getURL('dist/dashboard.html') + '?tab=settings';
  chrome.tabs.create({ url });
}

export async function renderDashboard(container) {
  if (!container) {
    return;
  }

  container.innerHTML = '<div class="loader">Loading...</div>';

  try {
    // ── Data ──────────────────────────────────────────
    let rules = [];
    try {
      rules = await getRules(storage);
    } catch {}

    const usageRes = await chrome.storage.local.get(['usage', 'fg_logs']);
    const usage = usageRes.usage || {};
    const fgLogs = (usageRes.fg_logs || []).slice(-3).reverse();

    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );
    const domainList = Object.entries(usage)
      .map(([domain, d]) => ({
        domain,
        timeMs: d.time || 0,
        sessions: d.sessions || 0,
      }))
      .filter((d) => d.timeMs > 0)
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 5);

    const syncStatus = await storage.getString('nextdns_connection_status');
    const syncMode = (await storage.getString('fg_sync_mode')) || 'browser';
    const lastSync = await storage.getString('fg_last_sync_at');
    const isNew = rules.length === 0 && !syncStatus;

    const blockedCount = rules.filter(
      (r) => r.blockedToday || r.mode === 'block',
    ).length;
    const limitCount = rules.filter((r) => r.mode === 'limit').length;

    // ── Shield state ──────────────────────────────────
    let shieldClass = '';
    let shieldIcon = '🔴';
    let shieldTitle = 'Not Connected';
    let shieldSub = 'Open Settings to link your NextDNS account';

    if (syncStatus === 'connected') {
      shieldClass = 'active';
      shieldIcon = '🛡️';
      shieldTitle = 'Shield Active';
      shieldSub = `${syncMode.toUpperCase()} · Last sync ${fmtDate(lastSync)}`;
    } else if (syncStatus === 'error') {
      shieldClass = 'error';
      shieldIcon = '⚠️';
      shieldTitle = 'Auth Error';
      shieldSub = 'Check your API credentials in Settings';
    }

    // ── Render ────────────────────────────────────────
    container.innerHTML = `

      ${
        isNew
          ? `
        <div class="welcome-banner">
          <div class="welcome-emoji">🛡️</div>
          <div class="welcome-title">Welcome to FocusGate</div>
          <div class="welcome-sub">Add your first block rule or connect NextDNS to start protecting your focus time.</div>
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
            <button class="btn" id="wb_settings">Connect NextDNS</button>
            <button class="btn-outline" id="wb_apps">Add Block Rule</button>
          </div>
        </div>
      `
          : `
        <div class="shield-bar ${shieldClass}" style="margin-bottom:14px;">
          <div class="shield-icon">${shieldIcon}</div>
          <div>
            <div class="shield-label">${shieldTitle}</div>
            <div class="shield-sub">${shieldSub}</div>
          </div>
          ${
            syncStatus !== 'connected'
              ? `
            <button class="btn-outline" id="btn_fix_settings" style="margin-left:auto; padding:6px 12px; font-size:11px;">Fix →</button>
          `
              : ''
          }
        </div>
      `
      }

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">${fmtTime(allTotalMs) || '0m'}</div>
          <div class="stat-lbl">Screen Time Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--red);">${blockedCount}</div>
          <div class="stat-lbl">Active Blocks</div>
        </div>
      </div>

      ${
        limitCount > 0
          ? `
        <div class="stats-row" style="margin-top:-4px;">
          <div class="stat-card" style="grid-column:1/-1; flex-direction:row; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div class="stat-val" style="font-size:16px; color:var(--yellow);">${limitCount}</div>
              <div class="stat-lbl">Time Limits Active</div>
            </div>
            <div style="font-size:10px; color:var(--muted); text-align:right; line-height:1.5;">
              Apps with daily limits<br>will auto-block when reached
            </div>
          </div>
        </div>
      `
          : ''
      }

      <div class="section-label">Top Domains Today</div>
      <div class="card" style="padding: 4px 14px;">
        ${
          domainList.length === 0
            ? `
          <div style="text-align:center; padding:20px; color:var(--muted); font-size:12px;">
            No browsing data yet — browse some sites to see usage here.
          </div>
        `
            : domainList
                .map((d) => {
                  const isBlocked = rules.some(
                    (r) =>
                      (r.customDomain || r.packageName) === d.domain &&
                      (r.blockedToday || r.mode === 'block'),
                  );
                  return `
            <div class="domain-row">
              <div class="domain-info">
                <img src="${getDomainIcon(
                  d.domain,
                )}" class="domain-icon" alt="">
                <div>
                  <div class="domain-name" style="${
                    isBlocked
                      ? 'color:var(--red);text-decoration:line-through;'
                      : ''
                  }">${d.domain}</div>
                  <div class="domain-sessions">${d.sessions} session${
                    d.sessions !== 1 ? 's' : ''
                  }</div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                ${
                  isBlocked
                    ? '<span style="font-size:9px; font-weight:800; color:var(--red); background:rgba(255,71,87,0.08); border:1px solid rgba(255,71,87,0.2); padding:2px 7px; border-radius:20px;">BLOCKED</span>'
                    : ''
                }
                <div class="domain-time">${fmtTime(d.timeMs)}</div>
              </div>
            </div>
          `;
                })
                .join('')
        }
      </div>

      ${
        fgLogs.length > 0
          ? `
        <div class="section-label">Engine Log</div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${fgLogs
            .map(
              (log) => `
            <div style="display:flex; gap:10px; padding:9px 12px; border-radius:9px; background:rgba(255,255,255,0.02); border-left:2px solid ${
              log.type === 'error' ? 'var(--red)' : 'var(--accent)'
            }; font-size:11px;">
              <div style="flex:1; color:var(--text);">${log.message}</div>
              <div style="color:var(--muted); flex-shrink:0;">${new Date(
                log.timestamp,
              ).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}</div>
            </div>
          `,
            )
            .join('')}
        </div>
      `
          : ''
      }

    `;

    // ── Wire new-user buttons ─────────────────────────
    container
      .querySelector('#wb_settings')
      ?.addEventListener('click', openSettingsPage);
    container.querySelector('#wb_apps')?.addEventListener('click', () => {
      document.querySelector('[data-tab="apps"]')?.click();
    });
    container
      .querySelector('#btn_fix_settings')
      ?.addEventListener('click', openSettingsPage);

    // ── Refresh loop ──────────────────────────────────
    clearInterval(window.__dashTimer);
    window.__dashTimer = setInterval(() => {
      if (document.querySelector('.nav-item[data-tab="dash"].active')) {
        renderDashboard(container);
      }
    }, 6000);
  } catch (e) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
        <div style="font-weight:800; color:var(--red);">Dashboard unavailable</div>
        <div style="font-size:11px; color:var(--muted); margin-top:6px;">${e.message}</div>
      </div>`;
  }
}
