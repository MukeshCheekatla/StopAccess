/**
 * content/index.tsx — Content Script Orchestrator
 * Imports from passManager and overlay; owns only checkAndBlock + bootstrap + NextDNS helper.
 */
import { ruleMatchesDomain } from '@stopaccess/core';
import { AppRule } from '@stopaccess/types';
import { EXTENSION_COLOR_VAR_DECLARATIONS } from '@/ui/theme/designTokens';
import {
  checkInAppFeatures,
  checkInAppUrlBlock,
} from '@/background/inAppBlocking';
import {
  getActiveTempPass,
  getExtensionCount,
  getMaxPasses,
  TEMP_PASSES_KEY,
} from './passManager';
import {
  overlayActive,
  prewarnActive,
  injectPrewarn,
  removeOverlay,
  setPassCountdownInterval,
  OVERLAY_ID,
} from './overlay';

// Bail out immediately if this is a zombie script (context already invalidated)
if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
  throw new Error('[StopAccess] Context invalidated - Early bailout.');
}

const BLOCKED_DOMAINS_KEY = 'blocked_domains';
const RULES_KEY = 'rules';
const CONTENT_DEBUG_KEY = 'fg_block_debug';
const REDIRECT_URL_KEY = 'fg_redirect_url';
const FOCUS_END_KEY = 'focus_mode_end_time';
const STRICT_MODE_KEY = 'strict_mode_enabled';

function currentDomain() {
  return window.location.hostname.replace(/^www\./, '');
}

function findMatchingRule(rules: AppRule[], domain: string) {
  return rules.find((rule) => ruleMatchesDomain(rule, domain));
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

    checkInAppFeatures(domain);
    const urlBlock = checkInAppUrlBlock(domain, window.location.pathname);
    const isInAppBlocked = urlBlock.blocked;

    // Check for active temp pass FIRST
    const activePass = await getActiveTempPass(domain);
    if (activePass) {
      removeOverlay();
      const remainingMs = activePass.expiresAt - Date.now();
      if (remainingMs > 0) {
        const t = setTimeout(() => checkAndBlock(), remainingMs + 500);
        setPassCountdownInterval(t);
      }
      return;
    }

    const res = await chrome.storage.local.get([
      BLOCKED_DOMAINS_KEY,
      RULES_KEY,
      'usage',
      REDIRECT_URL_KEY,
      STRICT_MODE_KEY,
      FOCUS_END_KEY,
    ]);
    const focusEnd = Number(res[FOCUS_END_KEY] || 0);
    const isFocusActive = focusEnd > Date.now();
    const blockedDomains = Array.isArray(res[BLOCKED_DOMAINS_KEY])
      ? res[BLOCKED_DOMAINS_KEY]
      : [];
    const strictEnabled = res.strict_mode_enabled === true;

    let rules: AppRule[] = [];
    try {
      rules =
        typeof res[RULES_KEY] === 'string'
          ? JSON.parse(res[RULES_KEY] || '[]')
          : res[RULES_KEY] || [];
    } catch (error) {
      console.warn('[StopAccess] Failed to parse rules', error);
    }

    // Check non-category rules — ruleMatchesDomain excludes categories automatically.
    const isBlockedByRule = rules.some((rule) => {
      if (rule.desiredBlockingState === false) {
        return false;
      }
      const isManuallyBlocked = rule.mode === 'block';
      const isLimitReached =
        rule.mode === 'limit' &&
        (rule.blockedToday === true ||
          (rule.dailyLimitMinutes > 0 &&
            (rule.usedMinutesToday || 0) >= rule.dailyLimitMinutes));
      if (!isManuallyBlocked && !isLimitReached) {
        return false;
      }
      return ruleMatchesDomain(rule, domain);
    });

    const isBlockedByLegacy = blockedDomains.some((bd: string) => {
      const norm = String(bd || '')
        .toLowerCase()
        .replace(/^www\./, '');
      return norm && (domain === norm || domain.endsWith('.' + norm));
    });

    const isBlocked = isInAppBlocked || isBlockedByRule || isBlockedByLegacy;

    const matchingRule = findMatchingRule(rules, domain);
    const extensionCount = await getExtensionCount(domain);
    const maxDailyPasses = getMaxPasses(matchingRule);
    const canExtend =
      !strictEnabled &&
      !isFocusActive &&
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
      const redirectUrl = res[REDIRECT_URL_KEY] as string | undefined;
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
        } catch (e) {}
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

      // Update existing overlay stats without rebuilding the DOM
      if (overlayActive) {
        const overlayEl = document.getElementById(OVERLAY_ID);
        const shadow = overlayEl?.shadowRoot;
        if (shadow) {
          const liveTime = shadow.getElementById('__fg_live_time');
          if (liveTime) {
            liveTime.textContent = formatTime(effectiveMs);
          }
          const sessionEl = shadow.getElementById('__fg_session_count');
          if (sessionEl) {
            sessionEl.textContent = String(sessions);
          }
          const remainingEl = shadow.getElementById('__fg_remaining_time');
          if (remainingEl) {
            remainingEl.textContent =
              String(
                Math.max(
                  0,
                  (matchingRule?.dailyLimitMinutes || 0) - effectiveUsed,
                ),
              ) + 'm';
          }
          const passesEl = shadow.getElementById('__fg_passes_left');
          if (passesEl) {
            passesEl.textContent = String(
              Math.max(0, maxDailyPasses - extensionCount),
            );
          }
        }
      }

      if (!overlayActive && !prewarnActive) {
        injectPrewarn(domain, {
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

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '00')}m ${String(s).padStart(
      2,
      '00',
    )}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// ── Persistence Engine ────────────────────────────

const persistenceObserver = new MutationObserver(() => {
  if (!chrome.runtime?.id) {
    persistenceObserver.disconnect();
    return;
  }
  if (!overlayActive) {
    return;
  }
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

window.addEventListener('popstate', checkAndBlock);
window.addEventListener('hashchange', checkAndBlock);

let __fg_last_href = window.location.href;
setInterval(() => {
  if (
    document.visibilityState === 'visible' &&
    window.location.href !== __fg_last_href
  ) {
    __fg_last_href = window.location.href;
    checkAndBlock();
  }
}, 800);

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
    changes[REDIRECT_URL_KEY] ||
    changes.inAppRules ||
    changes[FOCUS_END_KEY]
  ) {
    checkAndBlock();
  }
});

// ── NextDNS Setup Helper ──────────────────────────
// Only shown when the user navigated here from StopAccess onboarding or settings.

if (window.location.hostname.includes('nextdns.io')) {
  let idSent = false;

  function profileIdFromUrl(): string | null {
    const m = window.location.pathname.match(/^\/([a-z0-9]{4,12})(\/|$)/i);
    if (!m) {
      return null;
    }
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
    try {
      if (!chrome.runtime?.id) {
        return;
      }
      const intent = (await chrome.storage.local.get('fg_helper_intent'))
        .fg_helper_intent as
        | { mode: string; expiresAt?: number; nextDnsId?: string }
        | undefined;
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
        await chrome.storage.local.remove('fg_helper_intent');
        chrome.runtime.sendMessage({ type: 'NEXTDNS_ID_FOUND', id });
      }
    } catch (e) {}
  }

  async function showApiGuide() {
    try {
      if (!chrome.runtime?.id) {
        return;
      }
      if (!window.location.pathname.startsWith('/account')) {
        return;
      }
      if (document.getElementById('__fg_api_guide__')) {
        return;
      }
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
          'pointer-events:none',
        ].join(';'),
      );

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          <img src="${iconUrl}" style="width:20px;height:20px;border-radius:6px;border:1px solid var(--fg-guide-icon-border);" />
          <span style="font-size:12px;font-weight:800;letter-spacing:0;color:var(--fg-guide-label);">StopAccess guide</span>
        </div>
        <div style="font-size:13px;color:var(--fg-guide-muted);line-height:1.6;font-weight:600;">
          Scroll down to the <strong style="color:var(--fg-guide-text)">API</strong> section. Generate a dedicated key, copy it, then return to StopAccess to paste it.
        </div>
      `;
      root.appendChild(card);
    } catch (e) {}
  }

  extractAndNotify();
  showApiGuide();

  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      extractAndNotify();
      document.getElementById('__fg_api_guide__')?.remove();
      showApiGuide();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
