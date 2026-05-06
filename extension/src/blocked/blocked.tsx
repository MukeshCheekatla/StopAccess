import React from 'react';
import { createRoot } from 'react-dom/client';
import { getDomainForRule, resolveFaviconUrl } from '@stopaccess/core';
import { AppRule } from '@stopaccess/types';
import {
  EXTENSION_COLOR_VAR_DECLARATIONS,
  COLORS,
} from '../ui/theme/designTokens';
import { ByteCompanion } from '../ui/components/companion';
import { UI_ICONS } from '../ui/ui';

// Constants
const TEMP_PASSES_KEY = 'fg_temp_passes';
const RULES_KEY = 'rules';
const EXT_COUNTS_KEY = 'fg_extension_counts';
const WILT_UNTIL_KEY = 'wilt_until';
const DEFAULT_MAX_DAILY_PASSES = 3;
const PASS_DURATION_MINUTES = 5;

// State
let currentDomain = '';
let matchingRule: AppRule | undefined;
let usedMinutes = 0;
let sessions = 0;
let limitMinutes = 0;
let extensionCount = 0;
let maxExtensions = DEFAULT_MAX_DAILY_PASSES;
let isFocusActive = false;

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get('url');
  if (!targetUrl) {
    window.location.href = chrome.runtime.getURL('dashboard.html');
    return;
  }

  try {
    currentDomain = new URL(targetUrl).hostname.replace(/^www\./, '');
  } catch {
    currentDomain = targetUrl.replace(/^www\./, '');
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    :root {
      ${EXTENSION_COLOR_VAR_DECLARATIONS}
    }
    body {
      background-color: var(--fg-host-bg);
      color: white;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      margin: 0;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);

  await refreshData();
  render();
}

async function refreshData() {
  const today = new Date().toLocaleDateString('en-CA');
  const res = await chrome.storage.local.get([
    RULES_KEY,
    TEMP_PASSES_KEY,
    EXT_COUNTS_KEY,
    'usage',
    'focus_mode_end_time',
  ]);

  const rules: AppRule[] =
    typeof res[RULES_KEY] === 'string'
      ? JSON.parse(res[RULES_KEY] || '[]')
      : res[RULES_KEY] || [];
  matchingRule = rules.find((r) => {
    const d = getDomainForRule(r);
    return d && (currentDomain === d || currentDomain.endsWith('.' + d));
  });

  const counts = res[EXT_COUNTS_KEY] || {};
  extensionCount = (counts[today] && counts[today][currentDomain]) || 0;
  maxExtensions = Math.max(
    0,
    Number(matchingRule?.maxDailyPasses ?? DEFAULT_MAX_DAILY_PASSES),
  );
  isFocusActive = Date.now() < (Number(res.focus_mode_end_time) || 0);

  // Usage Statistics
  const usage = res.usage || {};
  const siteUsage = usage[currentDomain] || {};

  usedMinutes = (siteUsage.time || 0) / 60000;
  sessions = siteUsage.sessions || 0;
  limitMinutes = matchingRule?.dailyLimitMinutes || 0;
}

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

function render() {
  const root = document.getElementById('root');
  if (!root) {
    return;
  }

  const safeDomain = currentDomain;
  const logoUrl = chrome.runtime.getURL('assets/icon-128.png');
  const iconUrl = resolveFaviconUrl(currentDomain);

  const isLimitMode =
    (matchingRule?.mode === 'limit' || matchingRule?.mode === 'block') &&
    limitMinutes > 0;
  const statusText = isFocusActive
    ? 'Focus session active'
    : isLimitMode
    ? 'Daily access limit exceeded'
    : 'Access denied by StopAccess';

  const remainingPasses = Math.max(0, maxExtensions - extensionCount);
  const canExtend = remainingPasses > 0 && !isFocusActive;

  // Circular Ring Calc
  const pct = isLimitMode
    ? Math.min(100, (usedMinutes / limitMinutes) * 100)
    : 100;
  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;
  const ringColor = pct >= 100 ? COLORS.red : COLORS.blue;
  const usedMs = usedMinutes * 60000;

  root.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; width: 100vw; background-color: var(--fg-host-bg); color: white; font-family: sans-serif; overflow: hidden; position: relative;">
      <!-- BOT MOUNT POINT -->
      <div id="__fg_bot_mount" style="position: absolute; left: 40px; bottom: 40px; width: 280px; z-index: 20;"></div>
      
      <!-- DNS Card (Left Side) -->
      <div style="position: absolute; left: 40px; top: 50%; transform: translateY(-50%); width: 280px; background: color-mix(in srgb, ${
        COLORS.zinc800
      }, transparent 50%); border: 1px solid color-mix(in srgb, ${
    COLORS.blue
  }, transparent 70%); border-radius: 20px; padding: 24px; box-sizing: border-box; backdrop-filter: blur(20px);">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="width: 32px; height: 32px; background: color-mix(in srgb, ${
            COLORS.blue
          }, transparent 90%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            ${UI_ICONS.SHIELD.replace(
              'stroke="currentColor"',
              `stroke="${COLORS.blue}"`,
            )
              .replace('width="14"', 'width="18"')
              .replace('height="14"', 'height="18"')}
          </div>
          <div style="font-size: 14px; font-weight: bold; color: ${
            COLORS.blue
          };">DNS Protection</div>
        </div>
        <div style="font-size: 13px; color: ${
          COLORS.slate400
        }; line-height: 1.6;">
          This site is secured at the DNS layer. Redirection ensures you see this screen instead of a connection error.
          <br/><br/>
          <div style="font-size: 11px; color: ${COLORS.zinc500};">
            Note: Even after unblocking, it may take 20-60s for your browser's DNS cache to clear.
          </div>
        </div>
      </div>

      <!-- Main Content (Centered) -->
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 440px; position: relative; z-index: 10;">
        
        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 32px;">
          <img src="${logoUrl}" style="width: 48px; height: 48px; margin-bottom: 8px;" alt="StopAccess" />
          <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.4;">StopAccess</div>
        </div>

        <div style="position: relative; width: 160px; height: 160px; margin-bottom: 32px;">
          <svg style="width: 100%; height: 100%; transform: rotate(-90deg);" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="${R}" fill="none" stroke="${
    COLORS.zinc800
  }" stroke-width="8" />
            <circle cx="90" cy="90" r="${R}" fill="none" stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
              style="stroke-dasharray: ${C}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;">
            <div id="__fg_live_time" style="font-size: 24px; font-weight: bold; font-variant-numeric: tabular-nums;">${formatTime(
              usedMs,
            )}</div>
            <div style="font-size: 12px; font-weight: 600; color: ${
              COLORS.zinc500
            };">Used Today</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
          <img src="${iconUrl}" style="width: 28px; height: 28px; border-radius: 6px; background: ${
    COLORS.zinc900
  }; border: 1px solid ${COLORS.zinc800};" alt="" />
          <div style="font-size: 24px; font-weight: bold; opacity: 0.9;">${
            matchingRule?.appName || safeDomain
          }</div>
        </div>
        
        <div style="font-size: 14px; color: ${
          COLORS.zinc500
        }; margin-bottom: 32px; text-align: center;">${statusText}</div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; width: 100%; background: ${
          COLORS.zinc800
        }; border-radius: 16px; overflow: hidden; border: 1px solid ${
    COLORS.zinc800
  }; margin-bottom: 24px;">
           <div style="background: ${
             COLORS.zinc950
           }; padding: 16px; text-align: center;">
             <div style="font-size: 18px; font-weight: bold;">${sessions}</div>
             <div style="font-size: 12px; font-weight: bold; color: ${
               COLORS.zinc500
             };">Sessions</div>
           </div>
           <div style="background: ${
             COLORS.zinc950
           }; padding: 16px; text-align: center;">
             <div style="font-size: 18px; font-weight: bold;">${
               limitMinutes > 0
                 ? limitMinutes + 'm'
                 : matchingRule?.mode === 'block'
                 ? '0m'
                 : '∞'
             }</div>
             <div style="font-size: 12px; font-weight: bold; color: ${
               COLORS.zinc500
             };">Limit</div>
           </div>
           <div style="background: ${
             COLORS.zinc950
           }; padding: 16px; text-align: center;">
             <div style="font-size: 18px; font-weight: bold;">${remainingPasses}</div>
             <div style="font-size: 12px; font-weight: bold; color: ${
               COLORS.zinc500
             };">Passes</div>
           </div>
        </div>

        ${
          canExtend
            ? `
          <button id="btn-unblock" style="width: 100%; padding: 14px; background: ${
            COLORS.zinc800
          }; border: 1px solid ${
                COLORS.zinc700
              }; border-radius: 12px; color: white; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
            ${UI_ICONS.CLOCK.replace('width="14"', 'width="16"').replace(
              'height="14"',
              'height="16"',
            )}
            Use ${PASS_DURATION_MINUTES}m pass
          </button>
        `
            : `
          <div style="width: 100%; padding: 14px; background: color-mix(in srgb, ${COLORS.zinc800}, transparent 70%); border: 1px solid ${COLORS.zinc800}; border-radius: 12px; color: ${COLORS.zinc600}; font-size: 13px; text-align: center;">
            No passes available for today.
          </div>
        `
        }

        <div id="sync-status" style="margin-top: 16px; height: 20px;"></div>

        <button id="btn-back" style="width: 100%; margin-top: 12px; padding: 14px; background: transparent; border: 1px solid ${
          COLORS.zinc800
        }; border-radius: 12px; color: ${
    COLORS.zinc400
  }; font-size: 13px; font-weight: 900; cursor: pointer; transition: all 0.2s;">
          &larr; Back to Safety
        </button>

      </div>
    </div>
  `;

  document
    .getElementById('btn-unblock')
    ?.addEventListener('click', handleUnblock);
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('dashboard.html');
  });

  // Render Bot
  const botMount = document.getElementById('__fg_bot_mount');
  if (botMount) {
    const reactRoot = createRoot(botMount);
    reactRoot.render(
      <ByteCompanion
        mood="judging"
        message={'Stay Focused!\nWork is priority.'}
        variant="sidebar"
      />,
    );
  }
}

async function handleUnblock() {
  const btn = document.getElementById('btn-unblock') as HTMLButtonElement;
  const status = document.getElementById('sync-status');
  if (btn) {
    btn.disabled = true;
  }

  const res = await chrome.storage.local.get([TEMP_PASSES_KEY, EXT_COUNTS_KEY]);
  const passes = res[TEMP_PASSES_KEY] || {};
  const counts = res[EXT_COUNTS_KEY] || {};
  const today = new Date().toLocaleDateString('en-CA');

  // Grant pass to both the rule package name and the specific domain
  // Package name is for the background engine, domain is for the content script
  const pkgId = matchingRule?.packageName;
  const domId = currentDomain;

  const passData = {
    expiresAt: Date.now() + PASS_DURATION_MINUTES * 60000,
    grantedMinutes: PASS_DURATION_MINUTES,
    grantedAt: Date.now(),
  };

  if (pkgId) {
    passes[pkgId] = passData;
  }
  passes[domId] = passData;

  if (!counts[today]) {
    counts[today] = {};
  }
  counts[today][currentDomain] = (counts[today][currentDomain] || 0) + 1;

  await chrome.storage.local.set({
    [TEMP_PASSES_KEY]: passes,
    [EXT_COUNTS_KEY]: counts,
    [WILT_UNTIL_KEY]: Date.now() + 60 * 60 * 1000,
  });

  // Sync to NextDNS immediately
  await chrome.runtime.sendMessage({ action: 'manualSync' });

  if (status) {
    status.innerHTML = `
      <div class="sync-indicator" style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${COLORS.blue};">
        ${UI_ICONS.SPINNER}
        Releasing DNS lock... (<span id="countdown">20</span>s)
      </div>
    `;

    let seconds = 20;
    const interval = setInterval(() => {
      seconds--;
      const countEl = document.getElementById('countdown');
      if (countEl) {
        countEl.textContent = seconds.toString();
      }

      if (seconds <= 0) {
        clearInterval(interval);
        const urlParams = new URLSearchParams(window.location.search);
        const targetUrl = urlParams.get('url');
        if (targetUrl) {
          window.location.href = targetUrl;
        }
      }
    }, 1000);
  }
}

init();
