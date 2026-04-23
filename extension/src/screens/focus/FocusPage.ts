import { STORAGE_KEYS } from '../../background/platformAdapter';
import { FocusSessionRecord } from '@stopaccess/types';
import { escapeHtml } from '@stopaccess/core';
import {
  UI_TOKENS,
  renderBrandLogo,
  attachGlobalIconListeners,
} from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import {
  getEffectiveElapsed,
  getRemainingMs,
  getProgress,
  formatTime,
  formatMinutes,
} from '../../lib/sessionTimer';

declare var chrome: any;
declare var window: any;

function isSameDay(leftTs: number, rightTs: number): boolean {
  const left = new Date(leftTs);
  const right = new Date(rightTs);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getTodayHistory(): FocusSessionRecord[] {
  const history =
    ((window as any).__focusHistory as FocusSessionRecord[]) || [];
  const now = Date.now();
  return history
    .filter(
      (session) =>
        session && session.startedAt && isSameDay(session.startedAt, now),
    )
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
}

function getTodayFocusMinutes(
  activeSession?: FocusSessionRecord | null,
): number {
  const history = getTodayHistory();
  const historyMins = history.reduce((sum, s) => {
    const mins =
      s.actualMinutes !== undefined
        ? s.actualMinutes
        : s.status === 'completed'
        ? s.duration
        : 0;
    return sum + (mins || 0);
  }, 0);

  let activeMins = 0;
  if (
    activeSession &&
    (activeSession.status === 'focusing' || activeSession.status === 'paused')
  ) {
    activeMins = Math.floor(getEffectiveElapsed(activeSession) / 60);
  }

  return historyMins + activeMins;
}

function renderTodayRecords(): string {
  const records = getTodayHistory();

  if (records.length === 0) {
    return `
      <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-text-center fg-text-[${COLORS.muted}]" style="min-height:220px;">
        <div style="font-size:16px; color:${COLORS.muted};">No records yet</div>
      </div>
    `;
  }

  return records
    .map((session) => {
      const start = new Date(session.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const actualMins =
        session.actualMinutes !== undefined
          ? session.actualMinutes
          : session.status === 'completed'
          ? session.duration
          : 0;
      const duration = formatMinutes(
        Math.min(actualMins, session.duration || 0),
      );
      const tone =
        session?.status === 'completed'
          ? COLORS.text
          : session?.status === 'cancelled'
          ? COLORS.red
          : COLORS.muted;

      return `
        <div class="fg-grid fg-items-center fg-gap-[14px] fg-py-[14px]" style="grid-template-columns:56px 1fr auto; border-top:1px solid ${COLORS.glassBorder};">
          <div class="fg-text-[12px] fg-font-medium" style="color: ${COLORS.muted};">${start}</div>
          <div style="height:1px; background:${COLORS.glassBorder}; opacity: 0.5;"></div>
          <div class="fg-text-[12px] fg-font-bold" style="color:${tone};">${duration}</div>
        </div>
      `;
    })
    .join('');
}

function renderAmbientShell(
  centerContent: string,
  sideContent: string | null,
  context: 'page' | 'popup' = 'page',
): string {
  const isPopup = context === 'popup';
  const gridTemplate = isPopup ? '1fr' : 'minmax(0,1fr) 280px';
  const padding = isPopup ? '12px' : '18px';
  const minHeight = isPopup ? '380px' : 'calc(100vh - 140px)';

  return `
    <div style="position:relative; min-height:${minHeight}; border-radius:28px; overflow:hidden; background:
      linear-gradient(160deg, ${COLORS.surface}, ${COLORS.bg});
      border:1px solid ${
        COLORS.glassBorder
      }; display: flex; flex-direction: column;
      box-shadow: 0 18px 48px ${COLORS.shadowSoft};">

      <div style="position:relative; z-index:1; display:grid; grid-template-columns:${gridTemplate}; gap:16px; flex: 1; padding:${padding};">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0;">
          ${centerContent}
        </div>
        ${
          !isPopup && sideContent
            ? `<div style="display:flex; flex-direction:column; gap:12px;">${sideContent}</div>`
            : ''
        }
      </div>
    </div>
  `;
}

function renderRingMarkup(
  timeDisplay: string,
  progress: number,
  label: string,
  sublabel: string,
): string {
  const radius = 150;
  const tickCount = 120;
  const activeTicks = Math.round(progress * tickCount);
  const lines = Array.from({ length: tickCount }, (_, index) => {
    const angle = (index / tickCount) * Math.PI * 2 - Math.PI / 2;
    const inner = radius - (index % 5 === 0 ? 16 : 10);
    const outer = radius;
    const x1 = 190 + inner * Math.cos(angle);
    const y1 = 190 + inner * Math.sin(angle);
    const x2 = 190 + outer * Math.cos(angle);
    const y2 = 190 + outer * Math.sin(angle);
    const stroke =
      index < activeTicks
        ? COLORS.accent
        : `color-mix(in srgb, ${COLORS.muted} 35%, transparent)`;
    const strokeWidth = index % 5 === 0 ? 3.5 : 2.5;
    return `<line data-tick-index="${index}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
  }).join('');

  return `
      <div style="position:relative; width:360px; height:360px; max-width:100%;">
        <svg viewBox="0 0 380 380" style="position:absolute; inset:0; width:100%; height:100%;">
          <circle cx="190" cy="190" r="110" fill="${COLORS.glassBg}" stroke="${COLORS.glassBorder}" stroke-width="1" />
          ${lines}
        </svg>
        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <div id="liveTimerDisplay" style="font-size:56px; font-weight:300; line-height:0.95; letter-spacing:-0.05em; color:${COLORS.text}; font-variant-numeric:tabular-nums;">${timeDisplay}</div>
          <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:${COLORS.muted}; font-size:10px; letter-spacing:0.1em; ">
            <span style="width:6px; height:6px; border-radius:50%; background:${COLORS.accent}; box-shadow:0 0 8px ${COLORS.accentSoft};"></span>
            ${label}
          </div>
          <div id="liveSublabelDisplay" style="margin-top:6px; max-width:200px; text-align:center; font-size:12px; line-height:1.5; color:${COLORS.muted};">${sublabel}</div>
        </div>
      </div>
  `;
}

function renderSessionNotes(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  return `
    <div class="fg-flex fg-gap-[10px] fg-flex-wrap fg-justify-center fg-max-w-[620px] fg-mt-[24px]">
      ${items
        .map(
          (item) => `
        <div class="fg-py-[10px] fg-px-[14px] fg-rounded-[14px] fg-text-xs fg-font-bold" style="background:${
          COLORS.glassBg
        }; border:1px solid ${COLORS.glassBorder}; color:${COLORS.text};">
          ${escapeHtml(item)}
        </div>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderPresetButtons(): string {
  return `
    <div class="fg-grid fg-grid-cols-2 fg-gap-3 fg-w-full fg-max-w-[400px] fg-mt-5">
      ${[
        { m: 15, tag: 'Quick Sprint' },
        { m: 25, tag: 'Pomodoro' },
        { m: 45, tag: 'Deep Work' },
        { m: 90, tag: 'Long Session' },
      ]
        .map(
          (preset) => `
        <button class="btn-premium start-focus fg-flex fg-flex-col fg-items-start fg-gap-1 fg-text-left fg-rounded-[18px]" data-mins="${preset.m}" style="padding:16px 18px; min-height:80px; background:${COLORS.glassBg}; border:1px solid ${COLORS.glassBorder}; box-shadow:none;">
          <span style="font-size:22px; font-weight:900; color:${COLORS.text}; line-height:1;">${preset.m}m</span>
          <span class="fg-text-[10px] fg-font-bold  fg-tracking-[0.1em]" style="color:${COLORS.muted};">${preset.tag}</span>
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderIdleStateSummary(): string {
  return `
    <div style="width:min(420px, 100%); margin-bottom:12px; padding:18px 22px; border-radius:22px; background:${COLORS.glassBg}; border:1px solid ${COLORS.glassBorder}; text-align:left; backdrop-filter:blur(12px);">
      <div style="${UI_TOKENS.TEXT.SUBTEXT}; font-size:13px; line-height:1.6;">Pick a session length and Focus will start a real countdown. Nothing shown here is simulated.</div>
    </div>
  `;
}

function renderDomainIcon(domain: string, size = 32): string {
  return renderBrandLogo(domain, undefined, size);
}

function renderActiveStateSummary(
  currentFocusHtml: string,
  count: number,
): string {
  return `
    <div style="width:min(440px, 100%); margin-bottom:12px; padding:18px 22px; border-radius:22px; background:${COLORS.glassBg}; border:1px solid ${COLORS.glassBorder}; text-align:left; backdrop-filter:blur(12px);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="${UI_TOKENS.TEXT.LABEL}">Shielding Services</div>
        <div style="${UI_TOKENS.TEXT.BADGE}; background:${COLORS.accentSoft}; color:${COLORS.accent}; padding:2px 8px; border-radius:6px; border:1px solid ${COLORS.glassBorder};">${count} Active</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px; min-height:30px;">
        ${currentFocusHtml}
      </div>
    </div>
  `;
}

function renderFocusDetails(
  focusStart: number,
  focusEnd: number,
  blockedDomains: string[],
  isPaused: boolean = false,
): string {
  const startedAt = new Date(focusStart).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const details = [`Started ${startedAt}`];
  if (isPaused) {
    details.push('Status: PAUSED');
  } else {
    const endsAt = new Date(focusEnd).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    details.push(`Ends ${endsAt}`);
  }

  if (blockedDomains.length > 0) {
    details.push(`Blocking ${blockedDomains.slice(0, 2).join(', ')}`);
  }

  return renderSessionNotes(details);
}

function renderSidePanels(
  title: string,
  body: string,
  activeSession?: FocusSessionRecord | null,
): string {
  return `
    <div class="fg-p-6 fg-rounded-[22px]" style="background:${
      COLORS.glassBg
    }; border:1px solid ${COLORS.glassBorder}; backdrop-filter:blur(16px);">
      <div style="${
        UI_TOKENS.TEXT.LABEL
      }; margin-bottom: 14px;">Today's Focus Time</div>
      <div style="${UI_TOKENS.TEXT.STAT}">${formatMinutes(
    getTodayFocusMinutes(activeSession),
  )}</div>
    </div>
    <div class="fg-p-6 fg-rounded-[22px]" style="background:${
      COLORS.glassBg
    }; border:1px solid ${COLORS.glassBorder}; backdrop-filter:blur(16px);">
      <div style="${UI_TOKENS.TEXT.LABEL}; margin-bottom: 14px;">${title}</div>
      <div style="${
        UI_TOKENS.TEXT.SUBTEXT
      }; font-size: 13px; line-height:1.7;">${body}</div>
    </div>
    <div class="fg-p-6 fg-rounded-[22px] fg-flex-1" style="background:${
      COLORS.glassBg
    }; border:1px solid ${COLORS.glassBorder}; backdrop-filter:blur(16px);">
      <div style="${
        UI_TOKENS.TEXT.LABEL
      }; margin-bottom: 14px;">Session History</div>
      <div style="${
        UI_TOKENS.TEXT.SUBTEXT
      }; font-size: 13px; margin-bottom: 14px;">Today's completed or interrupted sessions.</div>
      ${renderTodayRecords()}
    </div>
  `;
}

export async function renderFocusPage(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  if (!container) {
    return;
  }

  const activeRes = await chrome.storage.local.get(['fg_active_session']);
  const activeSession =
    activeRes.fg_active_session as FocusSessionRecord | null;
  const historyRes = await chrome.storage.local.get([
    STORAGE_KEYS.SESSION_HISTORY,
  ]);
  (window as any).__focusHistory =
    (historyRes[STORAGE_KEYS.SESSION_HISTORY] as FocusSessionRecord[]) || [];

  const isSessionActive =
    activeSession &&
    (activeSession.status === 'focusing' || activeSession.status === 'paused');

  if (window.__focusInterval) {
    clearInterval(window.__focusInterval);
    window.__focusInterval = null;
  }

  if (isSessionActive) {
    _renderActive(container, context, activeSession!);
  } else {
    _renderIdle(container, context);
  }

  attachGlobalIconListeners(container);

  (window as any).__focusActiveContainer = container;

  if (!window.__focusStorageListener) {
    window.__focusStorageListener = (changes: any) => {
      const activeContainer = (window as any).__focusActiveContainer;
      // Re-render when active session changes
      if (changes.fg_active_session || changes.focus_mode_end_time) {
        if (activeContainer && document.contains(activeContainer)) {
          const isFocusActive = !!document.querySelector(
            '.nav-item[data-tab="focus"].active',
          );
          if (isFocusActive) {
            renderFocusPage(activeContainer, context);
          }
        }
      }
    };
    chrome.storage.onChanged.addListener(window.__focusStorageListener);
  }
}

async function _renderActive(
  container: HTMLElement,
  context: 'page' | 'popup',
  activeSession: FocusSessionRecord,
): Promise<void> {
  const remainingMs = getRemainingMs(activeSession);
  const timeDisplay = formatTime(remainingMs);
  const progress = getProgress(activeSession);

  if (context === 'page') {
    await _renderActivePage(container, timeDisplay, progress, activeSession);
  } else {
    await _renderActivePopup(container, timeDisplay, progress, activeSession);
  }
}

async function _renderActivePage(
  container: HTMLElement,
  timeDisplay: string,
  progress: number,
  activeSession: FocusSessionRecord,
): Promise<void> {
  const currentFocus = activeSession.blockedDomains?.length
    ? activeSession.blockedDomains.slice(0, 2).join(' / ')
    : 'Focus session active';

  const remainingMs = getRemainingMs(activeSession);
  const dynamicEnd = Date.now() + remainingMs;
  const elapsedMins = Math.floor(getEffectiveElapsed(activeSession) / 60);
  const sublabel = `Focused for ${elapsedMins}m • ${Math.round(
    progress * 100,
  )}% through`;

  const isPaused = activeSession?.status === 'paused';
  const mainActionId = isPaused ? 'resumeFocus' : 'pauseFocus';
  const mainActionLabel = isPaused ? 'Resume' : 'Pause';
  const ringLabel = isPaused ? 'Paused' : 'Session Running';

  const allBlocked = [
    ...(activeSession?.blockedDomains || []),
    ...(activeSession?.blockedAtStart?.services || []),
    ...(activeSession?.blockedAtStart?.denylist || []),
  ];

  // Deduplicate by root domain to keep icons clean
  const uniqueBlocked = Array.from(
    new Set(allBlocked.map((d) => d.toLowerCase().trim())),
  ).filter((d) => d && !d.includes('nextdns.io')); // Filter out internal noise

  const currentFocusHtml = uniqueBlocked.length
    ? uniqueBlocked
        .slice(0, 5)
        .map((d) => renderDomainIcon(d, 36))
        .join('')
    : '<div style="font-size:15px; color:${COLORS.text}; line-height:1.6;">Focus session active</div>';

  const centerContent = `
    ${renderActiveStateSummary(currentFocusHtml, uniqueBlocked.length)}
    ${renderRingMarkup(timeDisplay, progress, ringLabel, sublabel)}
    <div class="fg-flex fg-gap-3 fg-mt-3">
      <button class="btn-premium" id="${mainActionId}" style="min-width:110px; justify-content:center; background:${
    isPaused ? COLORS.accent : 'transparent'
  }; color:${isPaused ? COLORS.onAccent : COLORS.text}; border:1px solid ${
    COLORS.glassBorder
  }; border-radius:999px; box-shadow:none; ${
    UI_TOKENS.TEXT.LABEL
  } padding:10px 24px;">
        ${mainActionLabel}
      </button>
      <button class="btn-premium" id="stopFocus" style="min-width:110px; justify-content:center; background:transparent; color:${
        COLORS.red
      }; border:1px solid ${
    COLORS.glassBorder
  }; border-radius:999px; box-shadow:none; ${
    UI_TOKENS.TEXT.LABEL
  } padding:10px 24px;">
        Stop
      </button>
    </div>
    ${renderFocusDetails(
      activeSession.startedAt,
      dynamicEnd,
      activeSession.blockedDomains || [],
      isPaused,
    )}
  `;

  container.innerHTML = renderAmbientShell(
    centerContent,
    renderSidePanels('Current Focus', escapeHtml(currentFocus), activeSession),
  );

  container.querySelector('#pauseFocus')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseFocus' }, () =>
      renderFocusPage(container, 'page'),
    );
  });

  container.querySelector('#resumeFocus')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resumeFocus' }, () =>
      renderFocusPage(container, 'page'),
    );
  });

  container.querySelector('#stopFocus')?.addEventListener('click', () => {
    _showAbortModal(container, 'page', () =>
      renderFocusPage(container, 'page'),
    );
  });

  if (activeSession.status === 'focusing') {
    window.__focusInterval = setInterval(() => {
      const activeTab = document.querySelector('[data-tab="focus"].active');
      if (!activeTab) {
        return;
      }
      const liveRemainingMs = getRemainingMs(activeSession);
      const liveElapsed = getEffectiveElapsed(activeSession);
      const liveProgress = getProgress(activeSession);

      if (liveRemainingMs <= 0) {
        clearInterval(window.__focusInterval);
        renderFocusPage(container, 'page');
        return;
      }
      const timerEl = container.querySelector('#liveTimerDisplay');
      if (timerEl) {
        timerEl.textContent = formatTime(liveRemainingMs);
      }
      const subLabelEl = container.querySelector('#liveSublabelDisplay');
      if (subLabelEl) {
        const liveMins = Math.floor(liveElapsed / 60);
        subLabelEl.textContent = `${liveMins}m focused • ${Math.round(
          liveProgress * 100,
        )}% complete`;
      }
      _updateActiveTicks(container, liveProgress);
    }, 1000);
  }
}

function _updateActiveTicks(container: HTMLElement, progress: number): void {
  const tickCount = 120;
  const activeTicks = Math.round(progress * tickCount);
  const lines = container.querySelectorAll('line[data-tick-index]');
  lines.forEach((el) => {
    const tick = el as SVGLineElement;
    const index = parseInt(tick.getAttribute('data-tick-index') || '0', 10);
    const stroke =
      index < activeTicks
        ? COLORS.accent
        : `color-mix(in srgb, ${COLORS.muted} 35%, transparent)`;
    if (tick.getAttribute('stroke') !== stroke) {
      tick.setAttribute('stroke', stroke);
    }
  });
}

async function _renderActivePopup(
  container: HTMLElement,
  timeDisplay: string,
  progress: number,
  activeSession: FocusSessionRecord,
): Promise<void> {
  const sublabel = `${Math.round(progress * 100)}% complete`;

  const isPaused = activeSession?.status === 'paused';
  const mainActionId = isPaused ? 'resumeFocusPopup' : 'pauseFocusPopup';
  const mainActionLabel = isPaused ? 'RESUME' : 'PAUSE';

  const centerContent = `
    <div style="transform: scale(0.8); margin: -20px 0;">
      ${renderRingMarkup(
        timeDisplay,
        progress,
        isPaused ? 'Paused' : 'Active Focus',
        sublabel,
      )}
    </div>
    <div class="fg-flex fg-gap-2 fg-mt-2">
      <button class="btn-premium" id="${mainActionId}" style="min-width:90px; justify-content:center; background:${
    isPaused ? COLORS.accent : 'transparent'
  }; color:${isPaused ? COLORS.onAccent : COLORS.text}; border:1px solid ${
    COLORS.glassBorder
  }; border-radius:999px; box-shadow:none; ${
    UI_TOKENS.TEXT.SUBTEXT
  } padding:8px 16px;">
        ${mainActionLabel}
      </button>
      <button class="btn-premium" id="stopFocusPopup" style="min-width:90px; justify-content:center; background:transparent; color:${
        COLORS.red
      }; border:1px solid ${
    COLORS.glassBorder
  }; border-radius:999px; box-shadow:none; ${
    UI_TOKENS.TEXT.SUBTEXT
  } padding:8px 16px;">
        STOP
      </button>
    </div>
  `;

  container.innerHTML = renderAmbientShell(centerContent, null, 'popup');

  container.querySelector('#pauseFocusPopup')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pauseFocus' }, () =>
      renderFocusPage(container, 'popup'),
    );
  });

  container
    .querySelector('#resumeFocusPopup')
    ?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'resumeFocus' }, () =>
        renderFocusPage(container, 'popup'),
      );
    });

  container.querySelector('#stopFocusPopup')?.addEventListener('click', () => {
    _showAbortModal(container, 'popup', () =>
      renderFocusPage(container, 'popup'),
    );
  });

  if (activeSession.status === 'focusing') {
    window.__focusInterval = setInterval(() => {
      const liveRemainingMs = getRemainingMs(activeSession);
      const liveElapsed = getEffectiveElapsed(activeSession);
      const liveProgress = getProgress(activeSession);

      if (liveRemainingMs <= 0) {
        clearInterval(window.__focusInterval);
        renderFocusPage(container, 'popup');
        return;
      }
      const timerEl = container.querySelector('#liveTimerDisplay');
      if (timerEl) {
        timerEl.textContent = formatTime(liveRemainingMs);
      }
      const subLabelEl = container.querySelector('#liveSublabelDisplay');
      if (subLabelEl) {
        const liveMins = Math.floor(liveElapsed / 60);
        subLabelEl.textContent = `${liveMins}m focused • ${Math.round(
          liveProgress * 100,
        )}% complete`;
      }
      _updateActiveTicks(container, liveProgress);
    }, 1000);
  }
}

function _renderIdle(container: HTMLElement, context: 'page' | 'popup'): void {
  if (context === 'page') {
    _renderIdlePage(container);
  } else {
    _renderIdlePopup(container);
  }
}

function _renderIdlePage(container: HTMLElement): void {
  const centerContent = `
    ${renderIdleStateSummary()}
    ${renderRingMarkup(
      '--:--',
      0,
      'Ready to Start',
      'The timer appears only after you begin a real session.',
    )}
    ${renderPresetButtons()}
  `;

  container.innerHTML = renderAmbientShell(
    centerContent,
    renderSidePanels('Focus State', 'No active focus session', null),
  );

  container.querySelectorAll('.start-focus').forEach((el) => {
    const btn = el as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const mins = btn.dataset.mins || '0';

      // 1. Visual Ignition sequence
      btn.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      btn.style.transform = 'scale(0.95)';
      btn.style.background = COLORS.accent;
      btn.style.borderColor = COLORS.accent;
      const label = btn.querySelector('span:last-child') as HTMLElement;
      if (label) {
        label.style.color = 'var(--fg-on-accent-muted)';
      }
      const timeVal = btn.querySelector('span:first-child') as HTMLElement;
      if (timeVal) {
        timeVal.style.color = COLORS.onAccent;
      }

      // 2. Animate the ring ticks rapidly
      const ticks = container.querySelectorAll('line[data-tick-index]');
      ticks.forEach((tick, i) => {
        setTimeout(() => {
          (tick as SVGLineElement).setAttribute('stroke', COLORS.accent);
          (tick as SVGLineElement).setAttribute('stroke-width', '4');
        }, i * 3); // Fast sweep animation
      });

      // 3. Pulse the timer display
      const timerDisplay = container.querySelector(
        '#liveTimerDisplay',
      ) as HTMLElement;
      if (timerDisplay) {
        timerDisplay.style.transition = 'all 0.4s ease';
        timerDisplay.style.transform = 'scale(1.1)';
        timerDisplay.style.color = COLORS.accent;
        timerDisplay.textContent = 'GO!';
      }

      // 4. Finalise and start session
      setTimeout(() => {
        chrome.runtime.sendMessage(
          { action: 'startFocus', minutes: parseInt(mins, 10) },
          () => {
            renderFocusPage(container, 'page');
          },
        );
      }, 600);
    });
  });
}

function _renderIdlePopup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="focus-container" style="padding: 10px 0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div class="widget-title" style="color: ${
          COLORS.text
        }; font-size: 14px;">IGNITE DEEP FOCUS</div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        } margin-top: 4px;">Blocks synced across devices.</div>
      </div>

      <div class="focus-presets" style="gap: 10px;">
        ${[
          { m: 15, tag: 'Quick' },
          { m: 25, tag: 'Pomo' },
          { m: 45, tag: 'Deep' },
          { m: 90, tag: 'Flow' },
        ]
          .map(
            (p) => `
          <div class="focus-preset-card start-focus" data-mins="${p.m}" style="padding: 14px 10px;">
            <div class="focus-preset-time" style="font-size: 1.1rem;">${p.m}M</div>
            <div class="focus-preset-tag" style="${UI_TOKENS.TEXT.BADGE} color: ${COLORS.muted};">${p.tag}</div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.start-focus').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mins = btn.getAttribute('data-mins')!;
      chrome.runtime.sendMessage(
        { action: 'startFocus', minutes: parseInt(mins, 10) },
        () => renderFocusPage(container, 'popup'),
      );
    });
  });
}

function _showAbortModal(
  container: HTMLElement,
  context: 'page' | 'popup',
  onDone: () => void,
): void {
  const stopBtnId = context === 'page' ? '#stopFocus' : '#stopFocusPopup';
  const btn = container.querySelector(stopBtnId) as HTMLButtonElement;

  const isPopup = context === 'popup';
  const width = isPopup ? '260px' : '320px';
  const padding = isPopup ? '24px' : '32px';
  const titleSize = isPopup ? '14px' : '16px';
  const bodySize = isPopup ? '11px' : '12px';

  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = `
    <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:${width}; z-index:10000; padding:${padding}; text-align:center; background:${
    COLORS.surface
  }; backdrop-filter:blur(20px); border:1px solid ${
    COLORS.glassBorder
  }; border-radius: ${
    isPopup ? '20px' : '24px'
  }; box-shadow: 0 20px 50px var(--fg-shadow-strong); color: ${COLORS.text};">
      <div style="font-size:${titleSize}; font-weight:900; color:${
    COLORS.text
  }; margin-bottom:${
    isPopup ? '8px' : '12px'
  }; letter-spacing:1px;">ABORT SESSION?</div>
      <div style="font-size:${bodySize}; color:${
    COLORS.muted
  }; line-height:1.6; margin-bottom:${isPopup ? '20px' : '24px'};">${
    isPopup
      ? 'Quitting early will end your current shield.'
      : 'Stopping now will record this as a failure in your focus analytics. Are you sure?'
  }</div>
      <div style="display:flex; gap:${
        isPopup ? '10px' : '12px'
      }; justify-content:center;">
        <button class="btn-cancel-abort" style="flex:1; background:${
          COLORS.glassBg
        }; border:1px solid ${COLORS.glassBorder}; color:${
    COLORS.text
  }; padding:${isPopup ? '8px' : '10px'}; border-radius:${
    isPopup ? '10px' : '12px'
  }; cursor:pointer; font-weight:800; font-size:${
    isPopup ? '10px' : '11px'
  };">CANCEL</button>
        <button class="btn-confirm-abort" style="flex:1; background:${
          COLORS.red
        }; border:none; color:${COLORS.onAccent}; padding:${
    isPopup ? '8px' : '10px'
  }; border-radius:${
    isPopup ? '10px' : '12px'
  }; cursor:pointer; font-weight:800; font-size:${
    isPopup ? '10px' : '11px'
  };">ABORT</button>
      </div>
    </div>
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:${
      COLORS.overlay
    }; z-index:9999; backdrop-filter:blur(${isPopup ? '4px' : '8px'});"></div>
  `;
  document.body.appendChild(modalContainer);

  const cleanup = () => document.body.removeChild(modalContainer);
  modalContainer
    .querySelector('.btn-cancel-abort')
    ?.addEventListener('click', cleanup);
  modalContainer
    .querySelector('.btn-confirm-abort')
    ?.addEventListener('click', () => {
      cleanup();
      if (btn) {
        btn.disabled = true;
        let countdown = 5;
        btn.innerText = `ENDING IN ${countdown}S...`;
        const interval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            btn.innerText = `ENDING IN ${countdown}S...`;
          } else {
            clearInterval(interval);
            chrome.runtime.sendMessage({ action: 'stopFocus' }, () => onDone());
          }
        }, 1000);
      }
    });
}
