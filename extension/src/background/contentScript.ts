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
    maxExtensions = MAX_DAILY_EXTENSIONS,
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

  const ringColor = pct >= 100 ? '#ef4444' : '#6366f1'; // Red or Accent

  const statusText = isLimitMode
    ? 'Daily limit reached'
    : 'Blocked by your focus rules';
  const remaining = isLimitMode ? Math.max(0, limitMinutes - usedMinutes) : 0;

  const clockSvg =
    '<svg class="fg-w-4 fg-h-4 fg-opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

  const timeStr = formatTime(usedMs || usedMinutes * 60000);

  return `
    <div class="fg-min-h-screen fg-w-screen fg-flex fg-items-center fg-justify-center fg-bg-zinc-950 fg-text-white fg-font-sans">
      <div class="fg-w-full fg-max-w-[420px] fg-flex fg-flex-col fg-items-center fg-p-6">
        <div class="fg-text-[10px] fg-font-extrabold fg-tracking-[0.25em] fg-text-zinc-600 fg-mb-8">FOCUSGATE</div>

        <div class="fg-relative fg-w-[180px] fg-h-[180px] fg-mb-8">
          <svg class="fg-w-full fg-h-full fg--rotate-90" viewBox="0 0 180 180">
            <circle class="fg-fill-none fg-stroke-zinc-800" cx="90" cy="90" r="${R}" stroke-width="8" />
            <circle class="fg-fill-none" cx="90" cy="90" r="${R}" 
              stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
              style="stroke-dasharray: ${C}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <div class="fg-absolute fg-inset-0 fg-flex fg-flex-col fg-items-center fg-justify-center fg-gap-1">
            <div class="fg-text-3xl fg-font-bold fg-tracking-tighter fg-tabular-nums" id="__fg_live_time">${timeStr}</div>
            <div class="fg-text-[10px] fg-font-semibold fg-text-zinc-500 fg-uppercase fg-tracking-widest">
              ${isLimitMode ? 'used today' : 'screen time'}
            </div>
          </div>
        </div>

        <div class="fg-text-2xl fg-font-bold fg-tracking-tight fg-mb-1 fg-text-white/90">${safeDomain}</div>
        <div class="fg-text-sm fg-text-zinc-500 fg-mb-8 fg-text-center">${statusText}</div>

        <div class="fg-grid fg-grid-cols-3 fg-gap-px fg-w-full fg-bg-zinc-800 fg-rounded-2xl fg-overflow-hidden fg-mb-8 fg-border fg-border-zinc-800">
          <div class="fg-bg-zinc-950 fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-lg fg-font-bold fg-text-zinc-200">${sessions}</div>
            <div class="fg-text-[9px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Sessions</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-lg fg-font-bold fg-text-zinc-200">${
              isLimitMode ? remaining + 'm' : '—'
            }</div>
            <div class="fg-text-[9px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Remaining</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-lg fg-font-bold fg-text-zinc-200">${extensionCount}/${maxExtensions}</div>
            <div class="fg-text-[9px] fg-font-bold fg-text-zinc-600 fg-uppercase fg-tracking-wider">Passes</div>
          </div>
        </div>

        ${
          canExtend
            ? `
          <div class="fg-w-full fg-p-5 fg-bg-zinc-900/50 fg-border fg-border-zinc-800 fg-rounded-[20px] fg-mb-4">
            <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
              <div class="fg-text-sm fg-font-bold fg-text-zinc-300">Take a short break</div>
              <div class="fg-text-[10px] fg-font-bold fg-text-zinc-500 fg-bg-zinc-800/50 fg-px-2 fg-py-0.5 fg-rounded-full">
                ${maxExtensions - extensionCount} left
              </div>
            </div>
            <div class="fg-grid fg-grid-cols-2 fg-gap-3">
              <button class="fg-extend-btn fg-flex fg-items-center fg-justify-center fg-gap-2 fg-p-3 fg-bg-zinc-800/50 fg-border fg-border-zinc-700/50 fg-rounded-xl fg-text-sm fg-font-bold fg-text-zinc-300 fg-transition-all hover:fg-bg-zinc-700/50 active:fg-scale-[0.98] disabled:fg-opacity-30 disabled:fg-cursor-not-allowed" data-minutes="5">
                ${clockSvg} 5 min
              </button>
              <button class="fg-extend-btn fg-flex fg-items-center fg-justify-center fg-gap-2 fg-p-3 fg-bg-zinc-800/50 fg-border fg-border-zinc-700/50 fg-rounded-xl fg-text-sm fg-font-bold fg-text-zinc-300 fg-transition-all hover:fg-bg-zinc-700/50 active:fg-scale-[0.98] disabled:fg-opacity-30 disabled:fg-cursor-not-allowed" data-minutes="10">
                ${clockSvg} 10 min
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

        <button class="fg-back fg-w-full fg-p-3.5 fg-border fg-border-zinc-800 fg-rounded-xl fg-bg-transparent fg-text-zinc-500 fg-text-sm fg-font-semibold fg-transition-all hover:fg-bg-zinc-900 active:fg-scale-[0.98]">
          &larr; Go back
        </button>
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

      const ok = await grantTempPass(domain, minutes);
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
