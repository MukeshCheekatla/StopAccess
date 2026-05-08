/**
 * content/overlay.tsx
 * Block overlay, pre-warn banner, and companion warning widget.
 * All DOM injection/removal lives here — nothing else.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { resolveFaviconUrl } from '@stopaccess/core';
import {
  EXTENSION_COLOR_VAR_DECLARATIONS,
  COLORS,
} from '@/ui/theme/designTokens';
import { ByteCompanion } from '@/ui/companion';
import { grantTempPass, DEFAULT_MAX_DAILY_PASSES } from './passManager';
import { UI_ICONS } from '@/ui/ui';

export const OVERLAY_ID = '__fg_block_overlay__';
export const PREBLOCK_ID = '__fg_block_prewarn__';
export const OVERLAY_DELAY_MS = 2500; // NOTE: Do NOT remove or reduce. Prevents race conditions on page load.
// COMPANION_ID removed
const PASS_DURATION_MINUTES = 5;

export let overlayActive = false;
export let prewarnActive = false;
let overlayEl: HTMLElement | null = null;
let prewarnEl: HTMLElement | null = null;
let prewarnTimeout: ReturnType<typeof setTimeout> | null = null;
let liveTimerInterval: ReturnType<typeof setInterval> | null = null;
let passCountdownInterval: ReturnType<typeof setTimeout> | null = null;
// companionWarningShown removed

export function setPassCountdownInterval(
  v: ReturnType<typeof setTimeout> | null,
) {
  passCountdownInterval = v;
}

// ── Helpers ───────────────────────────────────────

function escapeHtml(value: any) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// ── Markup ────────────────────────────────────────

function buildOverlayMarkup(domain: string, options: any = {}) {
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
    ? 'Focus session active'
    : isLimitMode
    ? 'Daily access limit exceeded'
    : 'Access denied by StopAccess';
  const remaining = isLimitMode ? Math.max(0, limitMinutes - usedMinutes) : 0;
  const clockIcon = UI_ICONS.CLOCK.replace(
    'width="14" height="14"',
    'class="fg-w-4 fg-h-4 fg-opacity-50"',
  );
  const timeStr = formatTime(usedMs || usedMinutes * 60000);
  const isLongTime = timeStr.includes('h');
  const timeFontSize = isLongTime
    ? 'fg-text-xl sm:fg-text-2xl'
    : 'fg-text-2xl sm:fg-text-3xl';
  const remainingPasses = Math.max(0, maxExtensions - extensionCount);
  const iconUrl = resolveFaviconUrl(domain);
  const logoUrl = chrome.runtime.getURL('assets/icon-128.png');

  return `
    <div class="fg-anim-overlay" style="display: flex; align-items: center; justify-content: center; height: 100vh; width: 100vw; background-color: var(--fg-host-bg); color: var(--fg-on-accent); font-family: sans-serif; overflow-y: auto; padding: 24px; position: relative;">
      <div id="__fg_bot_mount" class="fg-hidden lg:fg-block fg-absolute fg-left-12 fg-top-1/2 fg--translate-y-1/2 fg-w-[280px] fg-z-[2147483647]"></div>
      <div class="fg-anim-card" style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 440px; position: relative; z-index: 10;">
        <div class="fg-flex fg-flex-col fg-items-center fg-mb-8">
          <img src="${logoUrl}" style="width: 48px; height: 48px; margin-bottom: 8px;" alt="StopAccess" />
          <div class="fg-text-[11px] fg-font-black fg-tracking-[0.1em] fg-opacity-40">StopAccess</div>
        </div>
        <div style="position: relative; width: 160px; height: 160px; margin-bottom: 32px;">
          <svg style="width: 100%; height: 100%; transform: rotate(-90deg);" viewBox="0 0 180 180">
            <circle class="fg-fill-none fg-stroke-zinc-800" cx="90" cy="90" r="${R}" stroke-width="8" />
            <circle class="fg-fill-none" cx="90" cy="90" r="${R}"
              stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
              style="stroke-dasharray: ${C}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <div class="fg-absolute fg-inset-0 fg-flex fg-flex-col fg-items-center fg-justify-center fg-gap-1">
            <div class="${timeFontSize} fg-font-bold fg-tabular-nums" id="__fg_live_time">${timeStr}</div>
            <div class="fg-text-[12px] fg-font-semibold fg-text-[var(--fg-muted)]">
              ${isLimitMode ? 'Time Used' : 'Screen Time'}
            </div>
          </div>
        </div>
        <div class="fg-flex fg-items-center fg-justify-center fg-gap-3 fg-mb-2">
          <img src="${iconUrl}" style="width: 28px; height: 28px; border-radius: 6px; background: ${
    COLORS.zinc900
  }; border: 1px solid ${COLORS.zinc800};" alt="" />
          <div class="fg-break-words fg-text-[22px] sm:fg-text-2xl fg-font-bold fg-text-[var(--fg-on-accent)] fg-opacity-90">${safeDomain}</div>
        </div>
        <div class="fg-text-[13px] sm:fg-text-sm fg-text-[var(--fg-muted)] fg-mb-6 sm:fg-mb-8 fg-text-center fg-leading-relaxed">${statusText}</div>
        <div class="fg-grid fg-grid-cols-3 fg-gap-px fg-w-full fg-bg-zinc-800 fg-rounded-2xl fg-overflow-hidden fg-mb-6 sm:fg-mb-8 fg-border fg-border-zinc-800">
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-[var(--fg-text)]" id="__fg_session_count">${sessions}</div>
            <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)]">Sessions</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-[var(--fg-text)]" id="__fg_remaining_time">${remaining}m</div>
            <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)]">Time left</div>
          </div>
          <div class="fg-bg-zinc-950 fg-py-3 sm:fg-py-4 fg-px-2 fg-text-center">
            <div class="fg-text-base sm:fg-text-lg fg-font-bold fg-text-[var(--fg-text)]" id="__fg_passes_left">${remainingPasses}</div>
            <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)]">Passes left</div>
          </div>
        </div>
        ${
          canExtend
            ? `<div class="fg-w-full fg-p-4 sm:fg-p-5 fg-bg-zinc-900/50 fg-border fg-border-zinc-800 fg-rounded-[20px] fg-mb-4">
            <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
              <div class="fg-text-[13px] sm:fg-text-sm fg-font-black fg-text-zinc-300">Temporary Access</div>
              <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)] fg-bg-zinc-800/50 fg-px-2 fg-py-0.5 fg-rounded-full">${remainingPasses} available</div>
            </div>
            <div class="fg-grid fg-grid-cols-2 fg-gap-3">
              <button class="fg-extend-btn fg-col-span-2 fg-flex fg-items-center fg-justify-center fg-gap-2 fg-p-3.5 fg-bg-zinc-800/50 fg-border fg-border-zinc-700/50 fg-rounded-xl fg-text-sm fg-font-bold fg-text-zinc-300 fg-transition-all hover:fg-bg-zinc-700/50 active:fg-scale-[0.98] disabled:fg-opacity-30 disabled:fg-cursor-not-allowed" data-minutes="${PASS_DURATION_MINUTES}">
                ${clockIcon} Use ${PASS_DURATION_MINUTES}m pass
              </button>
            </div>
          </div>`
            : extensionCount >= maxExtensions
            ? `<div class="fg-w-full fg-p-4 fg-bg-zinc-900/30 fg-border fg-border-zinc-800 fg-rounded-xl fg-mb-4 fg-text-center fg-text-xs fg-text-zinc-600">
            <strong class="fg-text-zinc-400">Daily limit reached.</strong> No passes left for today.
          </div>`
            : ''
        }
        <button class="fg-back fg-w-full fg-p-4 fg-border fg-border-zinc-800 fg-rounded-xl fg-bg-transparent fg-text-zinc-400 fg-text-sm fg-font-black fg-transition-all hover:fg-bg-[var(--fg-white-wash)] active:fg-scale-[0.98]">
          &larr; Back To Safety
        </button>
      </div>
    </div>
  `;
}

// ── Timer ─────────────────────────────────────────

function restartLiveTimer(shadow: ShadowRoot, startMs: number) {
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
  }
  let currentMs = startMs;
  let lastTick = Date.now();

  liveTimerInterval = setInterval(() => {
    const el = shadow.getElementById('__fg_live_time');
    if (!el) {
      clearInterval(liveTimerInterval!);
      liveTimerInterval = null;
      return;
    }
    if (document.visibilityState !== 'visible') {
      lastTick = Date.now();
      return;
    }
    const now = Date.now();
    currentMs += now - lastTick;
    lastTick = now;
    el.textContent = formatTime(currentMs);
  }, 1000);
}

// ── Listeners ─────────────────────────────────────

function attachOverlayListeners(
  shadow: ShadowRoot,
  domain: string,
  options: any,
) {
  shadow.querySelector('.fg-back')?.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('dashboard.html');
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
}

// ── Inject / Remove ───────────────────────────────

export function injectOverlay(domain: string, options: any = {}) {
  if (overlayActive) {
    return;
  }
  overlayActive = true;
  window.stop();

  try {
    document.querySelectorAll('video, audio').forEach((el: any) => {
      if (!el.paused) {
        el.pause();
      }
    });
  } catch (e) {}

  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.style.overflow = 'hidden';
  }

  overlayEl = document.createElement('div');
  overlayEl.id = OVERLAY_ID;
  const shadow = overlayEl.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('tailwind.css');
  shadow.appendChild(styleLink);

  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    :host {
      ${EXTENSION_COLOR_VAR_DECLARATIONS}
      all: initial !important;
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      z-index: 2147483647 !important;
      display: block !important;
      background-color: var(--fg-host-bg) !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif !important;
    }
    @keyframes fgFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
    .fg-anim-overlay {
      animation: fgFadeIn 0.3s ease-out forwards;
      display: flex !important; align-items: center !important;
      justify-content: center !important;
      height: 100vh !important; width: 100vw !important;
      background-color: var(--fg-host-bg) !important; overflow-y: auto !important;
    }
    .fg-anim-card {
      animation: fgFadeIn 0.4s ease-out forwards;
      display: flex !important; flex-direction: column !important;
      align-items: center !important; width: 100% !important; max-width: 440px !important;
    }
  `;
  shadow.appendChild(baseStyle);

  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.innerHTML = buildOverlayMarkup(domain, options);

  styleLink.onload = () => {
    shadow.appendChild(wrapper);
    attachOverlayListeners(shadow, domain, options);
    requestAnimationFrame(() => {
      wrapper.style.opacity = '1';
    });

    const botMount = shadow.getElementById('__fg_bot_mount');
    if (botMount) {
      const root = createRoot(botMount);
      root.render(
        <ByteCompanion
          mood="judging"
          message={'Stay Focused!\nWork is priority.'}
          variant="sidebar"
        />,
      );
    }

    restartLiveTimer(
      shadow,
      options.usedMs || (options.usedMinutes || 0) * 60000,
    );
  };

  const root = document.body || document.documentElement;
  if (root) {
    root.appendChild(overlayEl);
  }
}

export function removeOverlay() {
  if (prewarnTimeout) {
    clearTimeout(prewarnTimeout);
    prewarnTimeout = null;
  }

  const existingOverlay = document.getElementById(OVERLAY_ID);
  const existingPrewarn = document.getElementById(PREBLOCK_ID);

  if (
    !overlayActive &&
    !prewarnActive &&
    !existingOverlay &&
    !existingPrewarn
  ) {
    return;
  }

  overlayActive = false;
  prewarnActive = false;

  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
  if (passCountdownInterval) {
    clearTimeout(passCountdownInterval);
    passCountdownInterval = null;
  }

  if (existingOverlay?.parentNode) {
    existingOverlay.parentNode.removeChild(existingOverlay);
  } else if (overlayEl?.parentNode) {
    overlayEl.parentNode.removeChild(overlayEl);
  }
  overlayEl = null;

  if (existingPrewarn?.parentNode) {
    existingPrewarn.parentNode.removeChild(existingPrewarn);
  } else if (prewarnEl?.parentNode) {
    prewarnEl.parentNode.removeChild(prewarnEl);
  }
  prewarnEl = null;

  document.documentElement.style.overflow = '';
  if (document.body) {
    document.body.style.overflow = '';
  }
}

export function injectPrewarn(domain: string, options: any) {
  if (overlayActive || prewarnActive) {
    return;
  }
  prewarnActive = true;

  document.documentElement.style.overflow = 'hidden';
  if (document.body) {
    document.body.style.overflow = 'hidden';
  }

  prewarnEl = document.createElement('div');
  prewarnEl.id = PREBLOCK_ID;
  prewarnEl.setAttribute(
    'style',
    `
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    z-index: 2147483646 !important;
    background: ${COLORS.overlaySubtle} !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    display: flex !important; align-items: center !important;
    justify-content: center !important; transition: opacity 0.5s ease !important;
  `,
  );

  prewarnEl.innerHTML = `
    <div style="text-align: center; color: white; font-family: sans-serif;">
      <div style="width: 60px; height: 60px; border: 3px solid ${COLORS.red}; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; opacity: 0.8;">
         <div style="width: 24px; height: 24px; background: ${COLORS.red}; border-radius: 50%;"></div>
      </div>
      <div style="font-size: 20px; font-weight: bold; opacity: 0.9;">StopAccess</div>
      <div style="font-size: 13px; opacity: 0.6; margin-top: 8px;">Securing your focus...</div>
    </div>
  `;

  const root = document.body || document.documentElement;
  if (root) {
    root.appendChild(prewarnEl);
  }

  prewarnTimeout = setTimeout(() => {
    prewarnActive = false;
    if (prewarnEl?.parentNode) {
      prewarnEl.parentNode.removeChild(prewarnEl);
    }
    prewarnEl = null;
    injectOverlay(domain, options);
  }, OVERLAY_DELAY_MS);
}
