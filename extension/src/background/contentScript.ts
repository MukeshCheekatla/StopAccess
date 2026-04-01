/**
 * FocusGate Content Script - Overlay Enforcer
 * Blocks sites via full-screen overlay. Supports temporary passes.
 */

import { getDomainForRule } from '@focusgate/core';
import { AppRule } from '@focusgate/types';

const BLOCKED_DOMAINS_KEY = 'blocked_domains';
const RULES_KEY = 'rules';
const TEMP_PASSES_KEY = 'fg_temp_passes';
const EXT_COUNTS_KEY = 'fg_extension_counts';
const CONTENT_DEBUG_KEY = 'fg_content_debug';
const OVERLAY_ID = '__fg_block_overlay__';
const MAX_DAILY_EXTENSIONS = 5;

let overlayActive = false;
let overlayEl = null;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let liveTimerInterval = null;
let passCountdownInterval = null;

function currentDomain() {
  return window.location.hostname.replace(/^www\./, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function matchesBlockedDomain(domain: string, blockedDomain: string) {
  const normalized = String(blockedDomain || '')
    .toLowerCase()
    .replace(/^www\./, '');
  return (
    normalized && (domain === normalized || domain.endsWith('.' + normalized))
  );
}

function findMatchingRule(rules: AppRule[], domain: string) {
  return rules.find((rule) => {
    const ruleDomain = getDomainForRule(rule);
    return ruleDomain && matchesBlockedDomain(domain, ruleDomain);
  });
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

// ── Temp Pass System ──────────────────────────────

async function getActiveTempPass(domain: string) {
  const res = await chrome.storage.local.get([TEMP_PASSES_KEY]);
  const passes = res[TEMP_PASSES_KEY] || {};
  const pass = passes[domain];
  if (!pass) {
    return null;
  }
  if (Date.now() > pass.expiresAt) {
    // Expired — clean up
    delete passes[domain];
    await chrome.storage.local.set({ [TEMP_PASSES_KEY]: passes });
    return null;
  }
  return pass;
}

async function getExtensionCount(domain: string): Promise<number> {
  const res = await chrome.storage.local.get([EXT_COUNTS_KEY]);
  const counts = res[EXT_COUNTS_KEY] || {};
  const today = todayKey();
  return (counts[today] && counts[today][domain]) || 0;
}

async function grantTempPass(
  domain: string,
  minutes: number,
): Promise<boolean> {
  // Check extension count
  const count = await getExtensionCount(domain);
  if (count >= MAX_DAILY_EXTENSIONS) {
    return false;
  }

  // Create temp pass
  const res = await chrome.storage.local.get([TEMP_PASSES_KEY, EXT_COUNTS_KEY]);
  const passes = res[TEMP_PASSES_KEY] || {};
  const counts = res[EXT_COUNTS_KEY] || {};
  const today = todayKey();

  passes[domain] = {
    expiresAt: Date.now() + minutes * 60000,
    grantedMinutes: minutes,
    grantedAt: Date.now(),
  };

  if (!counts[today]) {
    counts[today] = {};
  }
  counts[today][domain] = (counts[today][domain] || 0) + 1;

  // Clean old date entries
  for (const key of Object.keys(counts)) {
    if (key !== today) {
      delete counts[key];
    }
  }

  await chrome.storage.local.set({
    [TEMP_PASSES_KEY]: passes,
    [EXT_COUNTS_KEY]: counts,
  });

  return true;
}

// ── Styles ────────────────────────────────────────

function buildOverlayStyles() {
  return `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: block;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .fg-shell {
      min-height: 100vh;
      width: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a0b;
      padding: 24px;
    }

    .fg-panel {
      width: min(100%, 420px);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .fg-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: rgba(255,255,255,0.25);
      margin-bottom: 28px;
    }

    .fg-ring-wrap {
      position: relative;
      width: 180px;
      height: 180px;
      margin-bottom: 28px;
    }
    .fg-ring-wrap svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .fg-ring-bg {
      fill: none;
      stroke: rgba(255,255,255,0.04);
      stroke-width: 8;
    }
    .fg-ring-fill {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .fg-ring-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .fg-ring-val {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .fg-ring-unit {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .fg-domain {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
      color: rgba(255,255,255,0.9);
    }
    .fg-status {
      font-size: 13px;
      color: rgba(255,255,255,0.35);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .fg-stats {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1px;
      width: 100%;
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .fg-stat {
      background: #0a0a0b;
      padding: 14px 8px;
      text-align: center;
    }
    .fg-stat-val {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 2px;
      color: rgba(255,255,255,0.8);
    }
    .fg-stat-lbl {
      font-size: 9px;
      font-weight: 700;
      color: rgba(255,255,255,0.25);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .fg-extend {
      width: 100%;
      padding: 20px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin-bottom: 16px;
    }
    .fg-extend-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .fg-extend-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
    }
    .fg-extend-counter {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.05);
      padding: 3px 10px;
      border-radius: 20px;
    }
    .fg-extend-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .fg-extend-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 13px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .fg-extend-btn:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.9);
    }
    .fg-extend-btn:active { transform: scale(0.98); }
    .fg-extend-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
      transform: none;
    }
    .fg-extend-btn svg {
      width: 14px;
      height: 14px;
      opacity: 0.5;
    }

    .fg-maxed {
      width: 100%;
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      margin-bottom: 16px;
      text-align: center;
      font-size: 12px;
      color: rgba(255,255,255,0.35);
    }
    .fg-maxed strong {
      color: rgba(255,255,255,0.6);
    }

    .fg-back {
      width: 100%;
      padding: 14px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      background: transparent;
      color: rgba(255,255,255,0.25);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .fg-back:hover {
      background: rgba(255,255,255,0.02);
      color: rgba(255,255,255,0.4);
    }
  `;
}

// ── Markup ────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(
      2,
      '0',
    )}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function buildOverlayMarkup(domain, options: any = {}) {
  const safeDomain = escapeHtml(domain || 'this site');
  const {
    canExtend = false,
    extensionCount = 0,
    maxExtensions = MAX_DAILY_EXTENSIONS,
    ruleMode = 'block',
    usedMinutes = 0,
    limitMinutes = 0,
    sessions = 0,
    usedMs = 0,
  } = options;

  const isLimitMode = ruleMode === 'limit' && limitMinutes > 0;
  const pct = isLimitMode
    ? Math.min(100, (usedMinutes / limitMinutes) * 100)
    : 100;

  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  const ringColor =
    pct >= 100
      ? 'rgba(255,255,255,0.15)'
      : pct >= 75
      ? 'rgba(255,255,255,0.25)'
      : 'rgba(255,255,255,0.12)';

  const statusText = isLimitMode
    ? 'Daily limit reached'
    : 'Blocked by your focus rules';
  const remaining = isLimitMode ? Math.max(0, limitMinutes - usedMinutes) : 0;

  const clockSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

  const timeStr = formatTime(usedMs || usedMinutes * 60000);

  return `
    <div class="fg-shell">
      <div class="fg-panel">
        <div class="fg-badge">FOCUSGATE</div>

        <div class="fg-ring-wrap">
          <svg viewBox="0 0 180 180">
            <circle class="fg-ring-bg" cx="90" cy="90" r="${R}" />
            <circle class="fg-ring-fill" cx="90" cy="90" r="${R}"
              stroke="${ringColor}"
              stroke-dasharray="${C}"
              stroke-dashoffset="${offset}" />
          </svg>
          <div class="fg-ring-center">
            <div class="fg-ring-val" id="__fg_live_time">${timeStr}</div>
            <div class="fg-ring-unit">${
              isLimitMode ? 'used today' : 'screen time'
            }</div>
          </div>
        </div>

        <div class="fg-domain">${safeDomain}</div>
        <div class="fg-status">${statusText}</div>

        <div class="fg-stats">
          <div class="fg-stat">
            <div class="fg-stat-val">${sessions}</div>
            <div class="fg-stat-lbl">Sessions</div>
          </div>
          <div class="fg-stat">
            <div class="fg-stat-val">
              ${isLimitMode ? remaining + 'm' : '—'}
            </div>
            <div class="fg-stat-lbl">Remaining</div>
          </div>
          <div class="fg-stat">
            <div class="fg-stat-val">${extensionCount}/${maxExtensions}</div>
            <div class="fg-stat-lbl">Extensions</div>
          </div>
        </div>

        ${
          canExtend
            ? `
          <div class="fg-extend">
            <div class="fg-extend-header">
              <div class="fg-extend-title">Take a short break</div>
              <div class="fg-extend-counter">${
                maxExtensions - extensionCount
              } left today</div>
            </div>
            <div class="fg-extend-actions">
              <button class="fg-extend-btn" data-minutes="5">${clockSvg} 5 min pass</button>
              <button class="fg-extend-btn" data-minutes="10">${clockSvg} 10 min pass</button>
            </div>
          </div>
        `
            : extensionCount >= maxExtensions
            ? `
          <div class="fg-maxed">
            <strong>No passes remaining.</strong> All ${maxExtensions} daily passes used for this site.
          </div>
        `
            : ''
        }

        <button class="fg-back">\u2190 Go back</button>
      </div>
    </div>
  `;
}

// ── Overlay Inject / Remove ───────────────────────

function injectOverlay(domain, options: any = {}) {
  if (overlayActive) {
    return;
  }

  overlayActive = true;
  window.stop();

  previousHtmlOverflow = document.documentElement.style.overflow;
  previousBodyOverflow = document.body?.style.overflow || '';
  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.style.overflow = 'hidden';
  }

  overlayEl = document.createElement('div');
  overlayEl.id = OVERLAY_ID;

  const shadow = overlayEl.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = buildOverlayStyles();
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildOverlayMarkup(domain, options);
  shadow.appendChild(wrapper);

  shadow.querySelector('.fg-back')?.addEventListener('click', () => {
    window.history.back();
  });

  shadow.querySelectorAll('.fg-extend-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const minutes = Number(btn.getAttribute('data-minutes') || '0');
      if (!minutes) {
        return;
      }

      // Disable both buttons
      shadow
        .querySelectorAll('.fg-extend-btn')
        .forEach((b) => b.setAttribute('disabled', 'true'));

      const ok = await grantTempPass(domain, minutes);
      if (ok) {
        await chrome.runtime.sendMessage({ action: 'manualSync' });
        removeOverlay();
        // Page will load naturally now — checkAndBlock will see the active pass
      } else {
        shadow
          .querySelectorAll('.fg-extend-btn')
          .forEach((b) => b.removeAttribute('disabled'));
      }
    });
  });

  document.documentElement.appendChild(overlayEl);

  // Live timer
  const startMs = options.usedMs || (options.usedMinutes || 0) * 60000;
  const overlayStartedAt = Date.now();

  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
  }
  liveTimerInterval = setInterval(() => {
    const el = shadow.getElementById('__fg_live_time');
    if (!el) {
      clearInterval(liveTimerInterval);
      return;
    }
    const elapsed = Date.now() - overlayStartedAt;
    el.textContent = formatTime(startMs + elapsed);
  }, 1000);
}

function removeOverlay() {
  if (!overlayActive) {
    return;
  }

  overlayActive = false;
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  if (passCountdownInterval) {
    clearInterval(passCountdownInterval);
    passCountdownInterval = null;
  }
  if (overlayEl?.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;

  document.documentElement.style.overflow = previousHtmlOverflow;
  if (document.body) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

// ── Core Check ────────────────────────────────────

async function checkAndBlock() {
  const domain = currentDomain();
  if (!domain) {
    return;
  }
  if (
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'chrome:'
  ) {
    return;
  }

  // Check for active temp pass FIRST
  const activePass = await getActiveTempPass(domain);
  if (activePass) {
    // Pass is active — don't block, remove overlay if showing
    removeOverlay();

    // Start a countdown to re-check when pass expires
    if (passCountdownInterval) {
      clearInterval(passCountdownInterval);
    }
    const remainingMs = activePass.expiresAt - Date.now();
    if (remainingMs > 0) {
      passCountdownInterval = setTimeout(() => {
        checkAndBlock(); // Re-check — pass will be expired
      }, remainingMs + 500); // +500ms buffer
    }
    return;
  }

  const res = await chrome.storage.local.get([
    BLOCKED_DOMAINS_KEY,
    RULES_KEY,
    'usage',
  ]);
  const blockedDomains = Array.isArray(res[BLOCKED_DOMAINS_KEY])
    ? res[BLOCKED_DOMAINS_KEY]
    : [];

  let rules: AppRule[] = [];
  let derivedBlockedDomains = [];
  try {
    rules = JSON.parse((res[RULES_KEY] as string) || '[]');
    derivedBlockedDomains = rules
      .filter((rule) => {
        const isManuallyBlocked = rule.mode === 'block';
        const isLimitReached =
          rule.blockedToday === true ||
          (rule.dailyLimitMinutes > 0 &&
            (rule.usedMinutesToday || 0) >= rule.dailyLimitMinutes);
        return isManuallyBlocked || isLimitReached;
      })
      .map((rule) => getDomainForRule(rule))
      .filter(Boolean);
  } catch (error) {
    console.warn(
      '[FocusGate] Failed to derive blocked domains from rules',
      error,
    );
  }

  const effectiveBlockedDomains = Array.from(
    new Set([...blockedDomains, ...derivedBlockedDomains]),
  );
  const isBlocked = effectiveBlockedDomains.some((bd) =>
    matchesBlockedDomain(domain, bd),
  );

  const matchingRule = findMatchingRule(rules, domain);
  const extensionCount = await getExtensionCount(domain);
  const canExtend =
    matchingRule &&
    (matchingRule.mode === 'limit' || matchingRule.mode === 'block') &&
    extensionCount < MAX_DAILY_EXTENSIONS;

  chrome.storage.local
    .set({
      [CONTENT_DEBUG_KEY]: JSON.stringify({
        at: new Date().toISOString(),
        href: window.location.href,
        domain,
        isBlocked,
        overlayActive,
        hasActivePass: false,
        extensionCount,
      }),
    })
    .catch(() => {});

  if (isBlocked) {
    const usageStore = res.usage || {};
    const domainUsage = usageStore[domain];
    const usageMs = domainUsage ? domainUsage.time : 0;
    const usageMinutes = Math.round(usageMs / 60000);
    const ruleUsedMinutes = Math.round(matchingRule?.usedMinutesToday || 0);
    const effectiveUsed = Math.max(ruleUsedMinutes, usageMinutes);
    const effectiveMs = Math.max(
      (matchingRule?.usedMinutesToday || 0) * 60000,
      usageMs,
    );
    const sessions = domainUsage?.sessions || 0;

    injectOverlay(domain, {
      canExtend,
      extensionCount,
      maxExtensions: MAX_DAILY_EXTENSIONS,
      ruleMode: matchingRule?.mode || 'block',
      usedMinutes: effectiveUsed,
      usedMs: effectiveMs,
      limitMinutes: matchingRule?.dailyLimitMinutes || 0,
      sessions,
    });
  } else {
    removeOverlay();
  }
}

// ── Bootstrap ─────────────────────────────────────

checkAndBlock();

const _pushState = history.pushState.bind(history);
const _replaceState = history.replaceState.bind(history);

history.pushState = function (...args) {
  _pushState(...args);
  checkAndBlock();
};

history.replaceState = function (...args) {
  _replaceState(...args);
  checkAndBlock();
};

window.addEventListener('popstate', checkAndBlock);
window.addEventListener('hashchange', checkAndBlock);

chrome.storage.onChanged.addListener((changes) => {
  if (
    changes[BLOCKED_DOMAINS_KEY] ||
    changes[RULES_KEY] ||
    changes[TEMP_PASSES_KEY]
  ) {
    checkAndBlock();
  }
});
