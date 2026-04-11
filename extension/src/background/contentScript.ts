/**
 * StopAccess Content Script - Overlay Enforcer
 * Blocks sites via full-screen overlay. Supports temporary passes.
 */

import { getDomainForRule } from '@stopaccess/core';
import { AppRule } from '@stopaccess/types';

const BLOCKED_DOMAINS_KEY = 'blocked_domains';
const RULES_KEY = 'rules';
const TEMP_PASSES_KEY = 'fg_temp_passes';
const EXT_COUNTS_KEY = 'fg_extension_counts';
const CONTENT_DEBUG_KEY = 'fg_content_debug';
const OVERLAY_ID = '__fg_block_overlay__';
const DEFAULT_MAX_DAILY_PASSES = 3;
const PASS_DURATION_MINUTES = 5;
const OVERLAY_DELAY_MS = 2300;
const PREBLOCK_ID = '__fg_block_prewarn__';

let overlayActive = false;
let overlayEl = null;
let preblockEl = null;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';
let liveTimerInterval = null;
let passCountdownInterval = null;
let pendingOverlayTimer = null;

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

function getMaxPasses(rule: AppRule | undefined): number {
  return Math.max(0, Number(rule?.maxDailyPasses ?? DEFAULT_MAX_DAILY_PASSES));
}

async function grantTempPass(
  domain: string,
  minutes: number,
  maxDailyPasses = DEFAULT_MAX_DAILY_PASSES,
): Promise<boolean> {
  // Check extension count
  const count = await getExtensionCount(domain);
  if (count >= maxDailyPasses) {
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

// ── Helpers ───────────────────────────────────────

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

// ── Markup ────────────────────────────────────────

function buildOverlayMarkup(domain, options: any = {}) {
  const safeDomain = escapeHtml(domain || 'this site');
  const {
    canExtend = false,
    extensionCount = 0,
    maxExtensions = DEFAULT_MAX_DAILY_PASSES,
    ruleMode = 'block',
    usedMinutes = 0,
    usedMs = 0,
    limitMinutes = 0,
    sessions = 0,
  } = options;

  const isLimitMode = ruleMode === 'limit' && limitMinutes > 0;
  const pct = isLimitMode
    ? Math.min(100, (usedMinutes / limitMinutes) * 100)
    : 100;

  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  const ringColor = pct >= 100 ? 'var(--fg-red)' : 'var(--fg-accent)';

  const statusText = isLimitMode
    ? 'DAILY ACCESS LIMIT EXCEEDED'
    : 'ACCESS DENIED BY STOPACCESS';
  const remaining = isLimitMode ? Math.max(0, limitMinutes - usedMinutes) : 0;

  const clockSvg =
    '<svg class="fg-w-4 fg-h-4 fg-opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

  const timeStr = formatTime(usedMs || usedMinutes * 60000);

  return `
    <div class="fg-min-h-[100dvh] fg-w-[100vw] fg-flex fg-items-center fg-justify-center fg-bg-[#0B0B0B] fg-text-white fg-font-sans fg-overflow-y-auto fg-px-4 fg-py-6 sm:fg-p-8">
      <div class="fg-w-full fg-max-w-[440px] fg-flex fg-flex-col fg-items-center fg-p-4 sm:fg-p-6">
        <div class="fg-text-[12px] sm:fg-text-[13px] fg-font-black fg-tracking-[0.24em] fg-text-white fg-mb-5 sm:fg-mb-8">STOPACCESS</div>

        <div class="fg-relative fg-w-[150px] fg-h-[150px] sm:fg-w-[180px] sm:fg-h-[180px] fg-mb-6 sm:fg-mb-8">
          <svg class="fg-w-full fg-h-full fg--rotate-90" viewBox="0 0 180 180">
            <circle class="fg-fill-none fg-stroke-zinc-800" cx="90" cy="90" r="${R}" stroke-width="8" />
            <circle class="fg-fill-none" cx="90" cy="90" r="${R}" 
              stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
              style="stroke-dasharray: ${C}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <div class="fg-absolute fg-inset-0 fg-flex fg-flex-col fg-items-center fg-justify-center fg-gap-1">
            <div class="fg-text-2xl sm:fg-text-3xl fg-font-bold fg-tracking-tight fg-tabular-nums" id="__fg_live_time">${timeStr}</div>
            <div class="fg-text-[10px] fg-font-semibold fg-text-zinc-500 fg-uppercase fg-tracking-widest">
              ${isLimitMode ? 'used today' : 'screen time'}
            </div>
          </div>
        </div>

        <div class="fg-w-full fg-break-words fg-text-center fg-text-[22px] sm:fg-text-2xl fg-font-bold fg-tracking-tight fg-mb-1 fg-text-white/90">${safeDomain}</div>
        <div class="fg-text-[13px] sm:fg-text-sm fg-text-zinc-500 fg-mb-6 sm:fg-mb-8 fg-text-center fg-leading-relaxed">${statusText}</div>

        <div class="fg-grid fg-grid-cols-3 fg-gap-px fg-w-full fg-bg-zinc-800 fg-rounded-2xl fg-overflow-hidden fg-mb-6 sm:fg-mb-8 fg-border fg-border-zinc-800">
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${sessions}</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Sessions</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${
              isLimitMode ? remaining + 'm' : '—'
            }</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Remaining</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${extensionCount}/${maxExtensions}</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Passes</div>
          </div>
        </div>

        ${
          canExtend
            ? `
          <div class="fg-w-full fg-p-4 sm:fg-p-5 fg-bg-zinc-900/50 fg-border fg-border-zinc-800 fg-rounded-[20px] fg-mb-4">
            <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
              <div class="fg-text-[13px] sm:fg-text-sm fg-font-black fg-text-zinc-300">REQUEST TEMPORARY ACCESS</div>
              <div class="fg-text-[10px] fg-font-bold fg-text-zinc-500 fg-bg-zinc-800/50 fg-px-2 fg-py-0.5 fg-rounded-full">
                ${maxExtensions - extensionCount} left
              </div>
            </div>
            <div class="fg-grid fg-grid-cols-2 fg-gap-3">
              <button class="fg-extend-btn fg-col-span-2 fg-flex fg-items-center fg-justify-center fg-gap-2 fg-p-3.5 fg-bg-zinc-800/50 fg-border fg-border-zinc-700/50 fg-rounded-xl fg-text-sm fg-font-bold fg-text-zinc-300 fg-transition-all hover:fg-bg-zinc-700/50 active:fg-scale-[0.98] disabled:fg-opacity-30 disabled:fg-cursor-not-allowed" data-minutes="${PASS_DURATION_MINUTES}">
                ${clockSvg} ${PASS_DURATION_MINUTES} min pass
              </button>
            </div>
          </div>
        `
            : extensionCount >= maxExtensions
            ? `
          <div class="fg-w-full fg-p-4 fg-bg-zinc-900/30 fg-border fg-border-zinc-800 fg-rounded-xl fg-mb-4 fg-text-center fg-text-xs fg-text-zinc-600">
            <strong class="fg-text-zinc-400">Daily limit reached.</strong> All passes used for today.
          </div>
        `
            : ''
        }

        <button class="fg-back fg-w-full fg-p-4 fg-border fg-border-zinc-800 fg-rounded-xl fg-bg-transparent fg-text-zinc-400 fg-text-sm fg-font-black fg-transition-all hover:fg-bg-white/5 active:fg-scale-[0.98]">
          &larr; COMPLY AND RETURN
        </button>
      </div>
    </div>
  `;
}

function showPreBlockSignal() {
  if (preblockEl || overlayActive) {
    return;
  }

  preblockEl = document.createElement('div');
  preblockEl.id = PREBLOCK_ID;
  const shadow = preblockEl.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('tailwind.css');
  shadow.appendChild(styleLink);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="fg-fixed fg-inset-0 fg-z-[2147483646] fg-flex fg-items-center fg-justify-center fg-bg-black/10 fg-backdrop-blur-[1px]">
      <div class="fg-flex fg-h-36 fg-w-36 fg-items-center fg-justify-center fg-rounded-full fg-border fg-border-[var(--fg-red)]/40 fg-bg-[var(--fg-red)]/15 fg-shadow-[0_0_80px_rgba(239,68,68,0.35)]">
        <div class="fg-h-16 fg-w-16 fg-rounded-full fg-bg-[var(--fg-red)] fg-animate-pulse"></div>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);
  document.documentElement.appendChild(preblockEl);
}

function removePreBlockSignal() {
  if (pendingOverlayTimer) {
    clearTimeout(pendingOverlayTimer);
    pendingOverlayTimer = null;
  }
  if (preblockEl?.parentNode) {
    preblockEl.parentNode.removeChild(preblockEl);
  }
  preblockEl = null;
}

// ── Overlay Inject / Remove ───────────────────────

function injectOverlay(domain, options: any = {}) {
  if (overlayActive) {
    return;
  }

  overlayActive = true;
  removePreBlockSignal();
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

  // Inject Tailwind
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('tailwind.css');
  shadow.appendChild(styleLink);

  // Still need some base styles for the host and scrollbar reset
  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: block;
    }
  `;
  shadow.appendChild(baseStyle);

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

      shadow
        .querySelectorAll('.fg-extend-btn')
        .forEach((b) => b.setAttribute('disabled', 'true'));

      const ok = await grantTempPass(
        domain,
        minutes,
        Number(options.maxExtensions || DEFAULT_MAX_DAILY_PASSES),
      );
      if (ok) {
        await chrome.runtime.sendMessage({ action: 'manualSync' });
        removeOverlay();
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
    removePreBlockSignal();
    return;
  }

  overlayActive = false;
  removePreBlockSignal();
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
      '[StopAccess] Failed to derive blocked domains from rules',
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
  const maxDailyPasses = getMaxPasses(matchingRule);
  const canExtend =
    matchingRule &&
    (matchingRule.mode === 'limit' || matchingRule.mode === 'block') &&
    extensionCount < maxDailyPasses;

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

    if (!overlayActive && !pendingOverlayTimer) {
      showPreBlockSignal();
      pendingOverlayTimer = setTimeout(() => {
        pendingOverlayTimer = null;
        injectOverlay(domain, {
          canExtend,
          extensionCount,
          maxExtensions: maxDailyPasses,
          ruleMode: matchingRule?.mode || 'block',
          usedMinutes: effectiveUsed,
          usedMs: effectiveMs,
          limitMinutes: matchingRule?.dailyLimitMinutes || 0,
          sessions,
        });
      }, OVERLAY_DELAY_MS);
    }
  } else {
    removeOverlay();
  }
}

// ── Persistence Engine ──────────────────────────

// Watch for DOM changes to ensure overlay isn't removed
const persistenceObserver = new MutationObserver((_mutations) => {
  if (!overlayActive) {
    return;
  }
  // If overlay element is gone from the DOM, re-inject
  if (!document.getElementById(OVERLAY_ID)) {
    checkAndBlock();
  }
});

function startPersistence() {
  persistenceObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// ── Bootstrap ─────────────────────────────────────

checkAndBlock();
startPersistence();

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

// Re-check on visibility change (prevents bypasses when switching tabs)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkAndBlock();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (
    changes[BLOCKED_DOMAINS_KEY] ||
    changes[RULES_KEY] ||
    changes[TEMP_PASSES_KEY]
  ) {
    checkAndBlock();
  }
});

// ════════════════════════════════════════════════════════════
// NextDNS Setup Helper
// Only shown when the user navigated here from StopAccess
// onboarding or settings (intent flag set in storage).
// ════════════════════════════════════════════════════════════

if (window.location.hostname === 'my.nextdns.io') {
  const FG_HELPER_ID = '__fg_nextdns_helper__';

  type Intent = { mode: 'setup' | 'api'; expiresAt: number };

  function profileIdFromUrl(): string | null {
    const m = window.location.pathname.match(/^\/([a-z0-9]{4,12})(\/|$)/i);
    if (!m) {
      return null;
    }
    if (['account', 'login', 'signup', 'new'].includes(m[1])) {
      return null;
    }
    return m[1];
  }

  function readApiKeyFromPage(): string | null {
    // Look for text inputs containing a long alphanumeric value (API key pattern)
    for (const el of Array.from(
      document.querySelectorAll('input[type="text"],input:not([type])'),
    )) {
      const v = (el as HTMLInputElement).value.trim();
      if (v.length >= 20 && /^[a-zA-Z0-9]+$/.test(v)) {
        return v;
      }
    }
    // Check code/pre blocks
    for (const el of Array.from(document.querySelectorAll('code, pre'))) {
      const v = (el as HTMLElement).textContent?.trim() || '';
      if (v.length >= 20 && /^[a-zA-Z0-9]+$/.test(v)) {
        return v;
      }
    }
    return null;
  }

  function clearIntent() {
    chrome.storage.local.remove('fg_helper_intent');
  }

  function removeHelper() {
    document.getElementById(FG_HELPER_ID)?.remove();
  }

  async function maybeMount() {
    // Check intent flag
    const res = await chrome.storage.local.get('fg_helper_intent');
    const intent = res.fg_helper_intent as Intent | undefined;

    if (!intent || Date.now() > intent.expiresAt) {
      removeHelper();
      return;
    }

    const isSetupPage = !!profileIdFromUrl();
    const isAccountPage = window.location.pathname.startsWith('/account');

    // Guard: only show the right card on the right page
    if (intent.mode === 'setup' && !isSetupPage) {
      return;
    }
    if (intent.mode === 'api' && !isAccountPage) {
      return;
    }

    // Already mounted
    if (document.getElementById(FG_HELPER_ID)) {
      return;
    }

    const root = document.body || document.documentElement;
    if (!root) {
      return;
    }

    const iconUrl = chrome.runtime.getURL('assets/icon-32.png');
    const profileId = profileIdFromUrl();

    const card = document.createElement('div');
    card.id = FG_HELPER_ID;
    card.setAttribute(
      'style',
      [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'z-index:2147483646',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'background:#ffffff',
        'border:1px solid rgba(0,0,0,0.08)',
        'border-radius:18px',
        'padding:18px 20px',
        'width:264px',
        'box-shadow:0 12px 40px rgba(0,0,0,0.12)',
        'color:#111827',
      ].join(';'),
    );

    const hdr = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      <img src="${iconUrl}" style="width:20px;height:20px;border-radius:6px;border:1px solid rgba(0,0,0,0.05);" />
      <span style="font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(0,0,0,0.4);">StopAccess</span>
      <button id="fgh_close" style="margin-left:auto;background:none;border:none;color:rgba(0,0,0,0.3);cursor:pointer;font-size:18px;line-height:1;padding:0 2px;">&times;</button>
    </div>`;

    if (intent.mode === 'setup' && profileId) {
      card.innerHTML =
        hdr +
        `
        <div style="font-size:10px;color:rgba(0,0,0,0.4);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.14em;font-weight:800;">Profile ID</div>
        <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:12px 14px;font-size:20px;font-weight:900;font-family:monospace;letter-spacing:0.04em;margin-bottom:14px;color:#111827;">${profileId}</div>
        <button id="fgh_copy" style="width:100%;background:#111827;color:#fff;border:none;border-radius:12px;padding:12px;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;font-family:inherit;transition:opacity 0.2s;">Copy Profile ID</button>
        <div id="fgh_ok" style="display:none;text-align:center;margin-top:9px;font-size:11px;color:#10b981;font-weight:700;">Copied — switch back to StopAccess</div>`;
    } else if (intent.mode === 'api') {
      card.innerHTML =
        hdr +
        `
        <div style="font-size:12px;color:rgba(0,0,0,0.6);margin-bottom:12px;line-height:1.6;font-weight:500;">
          Generate a dedicated StopAccess API key, then copy only the visible token.
        </div>
        <button id="fgh_copy" style="width:100%;background:#111827;color:#fff;border:none;border-radius:12px;padding:12px;font-size:12px;font-weight:800;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;font-family:inherit;transition:opacity 0.2s;">Copy visible token</button>
        <div id="fgh_ok" style="display:none;text-align:center;margin-top:9px;font-size:11px;color:#10b981;font-weight:700;">Copied — switch back to StopAccess</div>
        <div id="fgh_err" style="display:none;text-align:center;margin-top:9px;font-size:11px;color:rgba(0,0,0,0.4);font-weight:600;">Key not visible yet — scroll down to API section.</div>`;
    } else {
      return; // nothing to show
    }

    root.appendChild(card);

    card.querySelector('#fgh_close')?.addEventListener('click', () => {
      clearIntent();
      removeHelper();
    });

    card.querySelector('#fgh_copy')?.addEventListener('click', async () => {
      const value = intent.mode === 'setup' ? profileId! : readApiKeyFromPage();

      const btn = card.querySelector('#fgh_copy') as HTMLButtonElement;
      const ok = card.querySelector('#fgh_ok') as HTMLElement;
      const err = card.querySelector('#fgh_err') as HTMLElement | null;

      if (!value) {
        if (err) {
          err.style.display = 'block';
        }
        return;
      }

      await navigator.clipboard.writeText(value).catch(() => {});
      // Clear intent so card won't re-show
      clearIntent();
      btn.textContent = 'Copied!';
      btn.style.background = '#10b981';
      btn.style.color = '#fff';
      ok.style.display = 'block';
      if (err) {
        err.style.display = 'none';
      }
    });
  }

  // Initial mount — wait for page to render
  function boot() {
    setTimeout(maybeMount, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-check on SPA navigation (NextDNS is a Vue SPA)
  let _hlastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== _hlastUrl) {
      _hlastUrl = window.location.href;
      removeHelper();
      boot();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Also re-check if storage changes (e.g. user opens a second NextDNS tab)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.fg_helper_intent) {
      removeHelper();
      boot();
    }
  });
}
