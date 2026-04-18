import { getDomainForRule } from '@stopaccess/core';
import { AppRule } from '@stopaccess/types';
import { EXTENSION_COLOR_VAR_DECLARATIONS } from '../lib/designTokens';

// Bail out immediately if this is a zombie script (context already invalidated)
if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
  throw new Error('[StopAccess] Context invalidated - Early bailout.');
}

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

  // Check the domain itself and its parents (e.g., m.facebook.com -> facebook.com)
  const parts = domain.split('.');
  let pass = null;

  for (let i = 0; i <= parts.length - 2; i++) {
    const d = parts.slice(i).join('.');
    if (passes[d]) {
      pass = passes[d];
      break;
    }
  }

  if (!pass) {
    return null;
  }

  if (Date.now() > pass.expiresAt) {
    // Expired — clean up (only if it was an exact match to avoid side effects)
    if (passes[domain]) {
      delete passes[domain];
      await chrome.storage.local.set({ [TEMP_PASSES_KEY]: passes });
    }
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
    isFocusActive = false,
  } = options;

  const isLimitMode = ruleMode === 'limit' && limitMinutes > 0;
  const pct = isLimitMode
    ? Math.min(100, (usedMinutes / limitMinutes) * 100)
    : 100;

  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  const ringColor = pct >= 100 ? 'var(--fg-red)' : 'var(--fg-accent)';

  const statusText = isFocusActive
    ? 'FOCUS SESSION ACTIVE'
    : isLimitMode
    ? 'DAILY ACCESS LIMIT EXCEEDED'
    : 'ACCESS DENIED BY STOPACCESS';
  const remaining = isLimitMode ? Math.max(0, limitMinutes - usedMinutes) : 0;

  const clockSvg =
    '<svg class="fg-w-4 fg-h-4 fg-opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

  const timeStr = formatTime(usedMs || usedMinutes * 60000);

  return `
    <div class="fg-h-[100vh] fg-w-[100vw] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-host-bg)] fg-text-[var(--fg-on-accent)] fg-font-sans fg-overflow-y-auto fg-px-4 fg-py-6 sm:fg-p-8">
      <div class="fg-w-full fg-max-w-[440px] fg-flex fg-flex-col fg-items-center fg-p-4 sm:fg-p-6">
        <div class="fg-text-[12px] sm:fg-text-[13px] fg-font-black fg-tracking-[0.24em] fg-text-[var(--fg-on-accent)] fg-mb-5 sm:fg-mb-8">STOPACCESS</div>

        <div class="fg-relative fg-w-[150px] fg-h-[150px] sm:fg-w-[180px] sm:fg-h-[180px] fg-mb-6 sm:fg-mb-8">
          <svg class="fg-w-full fg-h-full fg--rotate-90" viewBox="0 0 180 180">
            <circle class="fg-fill-none fg-stroke-zinc-800" cx="90" cy="90" r="${R}" stroke-width="8" />
            <circle class="fg-fill-none" cx="90" cy="90" r="${R}" 
              stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
              style="stroke-dasharray: ${C}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <div class="fg-absolute fg-inset-0 fg-flex fg-flex-col fg-items-center fg-justify-center fg-gap-1">
            <div class="fg-text-2xl sm:fg-text-3xl fg-font-bold fg-tracking-tight fg-tabular-nums" id="__fg_live_time">${timeStr}</div>
            <div class="fg-text-[10px] fg-font-semibold fg-text-zinc-500  fg-tracking-widest">
              ${isLimitMode ? 'used today' : 'screen time'}
            </div>
          </div>
        </div>

        <div class="fg-w-full fg-break-words fg-text-center fg-text-[22px] sm:fg-text-2xl fg-font-bold fg-tracking-tight fg-mb-1 fg-text-[var(--fg-on-accent)] fg-opacity-90">${safeDomain}</div>
        <div class="fg-text-[13px] sm:fg-text-sm fg-text-zinc-500 fg-mb-6 sm:fg-mb-8 fg-text-center fg-leading-relaxed">${statusText}</div>

        <div class="fg-grid fg-grid-cols-3 fg-gap-px fg-w-full fg-bg-zinc-800 fg-rounded-2xl fg-overflow-hidden fg-mb-6 sm:fg-mb-8 fg-border fg-border-zinc-800">
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${sessions}</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600  fg-tracking-wider">Sessions</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${
              isLimitMode ? remaining + 'm' : '—'
            }</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600  fg-tracking-wider">Remaining</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-zinc-200">${extensionCount}/${maxExtensions}</div>
            <div class="fg-text-[10px] fg-font-bold fg-text-zinc-600  fg-tracking-wider">Passes</div>
          </div>
        </div>

        ${
          canExtend
            ? `
          <div class="fg-w-full fg-p-4 sm:fg-p-5 fg-bg-zinc-900/50 fg-border fg-border-zinc-800 fg-rounded-[20px] fg-mb-4">
            <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
              <div class="fg-text-[13px] sm:fg-text-sm fg-font-black fg-text-zinc-300">Request Temporary Access</div>
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

        <button class="fg-back fg-w-full fg-p-4 fg-border fg-border-zinc-800 fg-rounded-xl fg-bg-transparent fg-text-zinc-400 fg-text-sm fg-font-black fg-transition-all hover:fg-bg-[var(--fg-white-wash)] active:fg-scale-[0.98]">
          &larr; Comply And Return
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
    <div class="fg-fixed fg-inset-0 fg-z-[2147483646] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay-tint)] fg-backdrop-blur-[1px]">
      <div class="fg-flex fg-h-36 fg-w-36 fg-items-center fg-justify-center fg-rounded-full fg-border fg-border-[var(--fg-red)]/40 fg-bg-[var(--fg-red)]/15 fg-shadow-[0_0_80px_var(--fg-red-glow)]">
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
      ${EXTENSION_COLOR_VAR_DECLARATIONS}
      all: initial !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      display: block !important;
      background-color: var(--fg-host-bg) !important;
    }
  `;
  shadow.appendChild(baseStyle);

  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
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
  let currentMs = startMs;
  let lastTick = Date.now();

  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
  }
  liveTimerInterval = setInterval(() => {
    const el = shadow.getElementById('__fg_live_time');
    if (!el) {
      clearInterval(liveTimerInterval);
      return;
    }
    const now = Date.now();
    if (document.visibilityState === 'visible') {
      currentMs += now - lastTick;
      el.textContent = formatTime(currentMs);
    }
    lastTick = now;
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
  try {
    if (!chrome.runtime?.id) {
      return;
    }
    const domain = currentDomain();
    if (!domain) {
      return;
    }
    if (
      domain.includes('nextdns.io') ||
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
      'fg_redirect_url',
      'strict_mode_enabled',
      'fg_focus_end',
    ]);
    const focusEnd = Number(res.fg_focus_end || 0);
    const isFocusActive = focusEnd > Date.now();
    const blockedDomains = Array.isArray(res[BLOCKED_DOMAINS_KEY])
      ? res[BLOCKED_DOMAINS_KEY]
      : [];

    const strictEnabled = res.strict_mode_enabled === true;

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
      !strictEnabled &&
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
      const redirectUrl = res.fg_redirect_url as string | undefined;
      if (redirectUrl) {
        let finalUrl = redirectUrl;
        if (!finalUrl.startsWith('http')) {
          finalUrl = 'https://' + finalUrl;
        }
        try {
          const redirectTargetDomain = new URL(finalUrl).hostname.replace(
            /^www\./,
            '',
          );
          if (domain !== redirectTargetDomain) {
            window.location.href = finalUrl;
            return;
          }
        } catch (e) {
          // invalid URL maybe, ignore and continue to block
        }
      }

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
            isFocusActive,
          });
        }, OVERLAY_DELAY_MS);
      }
    } else {
      removeOverlay();
    }
  } catch (error: any) {
    if (error.message?.includes('Extension context invalidated')) {
      persistenceObserver.disconnect();
      return;
    }
    console.error('[StopAccess] checkAndBlock error:', error);
  }
}

// ── Persistence Engine ──────────────────────────

// Watch for DOM changes to ensure overlay isn't removed
const persistenceObserver = new MutationObserver((_mutations) => {
  if (!chrome.runtime?.id) {
    persistenceObserver.disconnect();
    return;
  }
  if (!overlayActive) {
    return;
  }
  // If overlay element is gone from the DOM, re-inject
  if (!document.getElementById(OVERLAY_ID)) {
    checkAndBlock();
  }
});

function startPersistence() {
  if (!chrome.runtime?.id) {
    return;
  }
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
  if (!chrome.runtime?.id) {
    return;
  }
  if (
    changes[BLOCKED_DOMAINS_KEY] ||
    changes[RULES_KEY] ||
    changes[TEMP_PASSES_KEY] ||
    changes.fg_redirect_url
  ) {
    checkAndBlock();
  }
});

// ════════════════════════════════════════════════════════════
// NextDNS Setup Helper
// Only shown when the user navigated here from StopAccess
// onboarding or settings (intent flag set in storage).
// ════════════════════════════════════════════════════════════

if (window.location.hostname.includes('nextdns.io')) {
  let idSent = false;

  function profileIdFromUrl(): string | null {
    const m = window.location.pathname.match(/^\/([a-z0-9]{4,12})(\/|$)/i);
    if (!m) {
      return null;
    }
    // These are known non-profile segments in the URL
    if (
      ['account', 'login', 'signup', 'new', 'setup', 'install'].includes(
        m[1].toLowerCase(),
      )
    ) {
      return null;
    }
    return m[1];
  }

  async function extractAndNotify() {
    if (idSent) {
      return;
    }

    // Check intent flag to see if we should auto-detect and close
    try {
      if (!chrome.runtime?.id) {
        return;
      }
      const intent = (await chrome.storage.local.get('fg_helper_intent'))
        .fg_helper_intent as
        | { mode: string; expiresAt?: number; nextDnsId?: string }
        | undefined;

      // Only auto-detect if the user came from the extension to "Locate ID"
      // and the intent hasn't expired.
      if (
        !intent ||
        intent.mode !== 'setup' ||
        (intent.expiresAt && Date.now() > intent.expiresAt)
      ) {
        return;
      }

      const id = profileIdFromUrl();
      if (id) {
        idSent = true;
        // Clear intent so it doesn't keep closing other NextDNS tabs accidentally
        await chrome.storage.local.remove('fg_helper_intent');

        chrome.runtime.sendMessage({
          type: 'NEXTDNS_ID_FOUND',
          id: id,
        });
      }
    } catch (e) {
      // suppress context invalidated errors
    }
  }

  async function showApiGuide() {
    try {
      if (!chrome.runtime?.id) {
        return;
      }

      const isAccountPage = window.location.pathname.startsWith('/account');
      if (!isAccountPage) {
        return;
      }

      // Check if we already have a guide
      if (document.getElementById('__fg_api_guide__')) {
        return;
      }

      // Check intent flag to see if we should show it
      const res = await chrome.storage.local.get('fg_helper_intent');
      const intent = res.fg_helper_intent as
        | { mode: string; expiresAt: number }
        | undefined;
      if (!intent || intent.mode !== 'api') {
        return;
      }

      const root = document.body || document.documentElement;
      if (!root) {
        return;
      }

      const iconUrl = chrome.runtime.getURL('assets/icon-32.png');

      const card = document.createElement('div');
      card.id = '__fg_api_guide__';
      card.setAttribute(
        'style',
        [
          EXTENSION_COLOR_VAR_DECLARATIONS,
          'position:fixed',
          'bottom:24px',
          'right:24px',
          'z-index:2147483646',
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          'background:var(--fg-guide-bg)',
          'border:1px solid var(--fg-guide-border)',
          'border-radius:18px',
          'padding:20px',
          'width:264px',
          'box-shadow:0 12px 40px var(--fg-shadow-soft)',
          'color:var(--fg-guide-text)',
          'pointer-events:none', // Make it non-interactive
        ].join(';'),
      );

      card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        <img src="${iconUrl}" style="width:20px;height:20px;border-radius:6px;border:1px solid var(--fg-guide-icon-border);" />
        <span style="font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:var(--fg-guide-label);">StopAccess Guide</span>
      </div>
      <div style="font-size:12px;color:var(--fg-guide-muted);line-height:1.6;font-weight:600;">
        Scroll down to the <strong style="color:var(--fg-guide-text)">API</strong> section. Generate a dedicated key, copy it, then return to StopAccess to paste it.
      </div>
    `;

      root.appendChild(card);
    } catch (e) {
      // suppress
    }
  }

  // Initial check
  extractAndNotify();
  showApiGuide();

  // Watch for SPA navigation (NextDNS is a Vue SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      extractAndNotify();
      const existing = document.getElementById('__fg_api_guide__');
      if (existing) {
        existing.remove();
      }
      showApiGuide();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
