/**
 * FocusGate Content Script - SPA Overlay Enforcer
 * DNR handles full-page redirects. This script only blocks in-page SPA route changes.
 */

import { getDomainForRule } from '@focusgate/core';

const BLOCKED_DOMAINS_KEY = 'blocked_domains';
const RULES_KEY = 'rules';
const CONTENT_DEBUG_KEY = 'fg_content_debug';
const OVERLAY_ID = '__fg_block_overlay__';

let overlayActive = false;
let overlayEl = null;
let previousBodyOverflow = '';
let previousHtmlOverflow = '';

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

function buildOverlayMarkup(domain) {
  const safeDomain = escapeHtml(domain || 'this site');
  return `
    <div class="fg-shell">
      <div class="fg-panel">
        <div class="fg-badge">FOCUSGATE</div>
        <div class="fg-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
            <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" stroke="currentColor" stroke-width="1.8"></path>
            <path d="M8.5 12.5l2.2 2.2 4.8-5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <h1>${safeDomain} is blocked</h1>
        <p class="fg-copy">This route was intercepted before it could fully load so your focus rule stays active.</p>
        <div class="fg-meta">
          <div class="fg-meta-row">
            <span>Target</span>
            <strong>${safeDomain}</strong>
          </div>
          <div class="fg-meta-row">
            <span>Mode</span>
            <strong>ACTIVE</strong>
          </div>
        </div>
        <button type="button" class="fg-back">Go Back</button>
      </div>
    </div>
  `;
}

function buildOverlayStyles() {
  return `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: block;
      color: #ffffff;
    }
    * {
      box-sizing: border-box;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .fg-shell {
      min-height: 100vh;
      width: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
      background:
        radial-gradient(circle at top, rgba(108, 71, 255, 0.18), transparent 35%),
        linear-gradient(180deg, #06070b 0%, #0b0c11 100%);
      padding: 24px;
    }
    .fg-panel {
      width: min(100%, 520px);
      background: rgba(17, 18, 24, 0.94);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
      padding: 32px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
    }
    .fg-badge {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.22em;
      color: #9f8cff;
      margin-bottom: 18px;
    }
    .fg-icon {
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9f8cff;
      background: rgba(108, 71, 255, 0.12);
      border: 1px solid rgba(108, 71, 255, 0.24);
      border-radius: 20px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 34px;
      line-height: 1;
      letter-spacing: -0.04em;
      font-weight: 900;
      color: #ffffff;
    }
    .fg-copy {
      margin: 0 0 24px;
      font-size: 15px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.68);
    }
    .fg-meta {
      display: grid;
      gap: 12px;
      margin-bottom: 24px;
      padding: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 18px;
    }
    .fg-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      font-size: 13px;
    }
    .fg-meta-row span {
      color: rgba(255, 255, 255, 0.54);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
      font-weight: 700;
    }
    .fg-meta-row strong {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }
    .fg-back {
      width: 100%;
      border: none;
      border-radius: 16px;
      padding: 16px 18px;
      background: #6c47ff;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
    }
  `;
}

function injectOverlay(domain) {
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
  wrapper.innerHTML = buildOverlayMarkup(domain);
  shadow.appendChild(wrapper);

  shadow.querySelector('.fg-back')?.addEventListener('click', () => {
    window.history.back();
  });

  document.documentElement.appendChild(overlayEl);
}

function removeOverlay() {
  if (!overlayActive) {
    return;
  }

  overlayActive = false;
  if (overlayEl?.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;

  document.documentElement.style.overflow = previousHtmlOverflow;
  if (document.body) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

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

  const res = await chrome.storage.local.get([BLOCKED_DOMAINS_KEY, RULES_KEY]);
  const blockedDomains = Array.isArray(res[BLOCKED_DOMAINS_KEY])
    ? res[BLOCKED_DOMAINS_KEY]
    : [];

  let derivedBlockedDomains = [];
  try {
    const rules = JSON.parse(res[RULES_KEY] || '[]');
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

  const isBlocked = effectiveBlockedDomains.some((blockedDomain) => {
    const normalized = String(blockedDomain || '')
      .toLowerCase()
      .replace(/^www\./, '');
    return (
      normalized && (domain === normalized || domain.endsWith('.' + normalized))
    );
  });

  chrome.storage.local
    .set({
      [CONTENT_DEBUG_KEY]: JSON.stringify({
        at: new Date().toISOString(),
        href: window.location.href,
        domain,
        blockedDomains,
        derivedBlockedDomains,
        isBlocked,
        overlayActive,
      }),
    })
    .catch(() => {});

  if (isBlocked) {
    injectOverlay(domain);
  } else {
    removeOverlay();
  }
}

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
  if (changes[BLOCKED_DOMAINS_KEY] || changes[RULES_KEY]) {
    checkAndBlock();
  }
});
