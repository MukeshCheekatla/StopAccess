import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../background/platformAdapter';
import { FocusSessionRecord } from '@focusgate/types';

declare var chrome: any;
declare var window: any;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) {
    parts.push(h.toString().padStart(2, '0'));
  }
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));
  return parts.join(':');
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '0m';
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    .filter((session) => session.endedAt && isSameDay(session.endedAt, now))
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
}

function getTodayFocusMinutes(): number {
  return getTodayHistory()
    .filter((session) => session.status === 'completed')
    .reduce(
      (sum, session) => sum + (session.actualMinutes || session.duration || 0),
      0,
    );
}

function renderTodayRecords(): string {
  const records = getTodayHistory();

  if (records.length === 0) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:220px; text-align:center; color:var(--muted);">
        <div style="font-size:16px; color:rgba(255,255,255,0.72);">No records yet</div>
      </div>
    `;
  }

  return records
    .map((session) => {
      const start = new Date(session.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const duration = formatMinutes(
        session.actualMinutes || session.duration || 0,
      );
      const tone =
        session.status === 'completed'
          ? 'rgba(255,255,255,0.88)'
          : session.status === 'cancelled'
          ? 'var(--red)'
          : 'var(--muted)';

      return `
        <div style="display:grid; grid-template-columns:56px 1fr auto; gap:14px; align-items:center; padding:14px 0; border-top:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:12px; color:var(--muted);">${start}</div>
          <div style="height:1px; background:rgba(255,255,255,0.08);"></div>
          <div style="font-size:12px; color:${tone}; font-weight:700;">${duration}</div>
        </div>
      `;
    })
    .join('');
}

function renderAmbientShell(
  centerContent: string,
  sideContent: string,
): string {
  return `
    <div style="position:relative; min-height:600px; border-radius:24px; overflow:hidden; background:
      radial-gradient(circle at 48% 46%, rgba(0,180,160,0.12), transparent 30%),
      linear-gradient(180deg, #09090b, #0c0d12);
      border:1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column;">
      <div style="position:absolute; inset:0; background:
        radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.4) 100%);"></div>
      <div style="position:relative; z-index:1; display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:24px; flex: 1; padding:32px;">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px;">
          ${centerContent}
        </div>
        <div style="display:flex; flex-direction:column; gap:16px;">
          ${sideContent}
        </div>
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
  const radius = 170;
  const tickCount = 120;
  const activeTicks = Math.round(progress * tickCount);
  const lines = Array.from({ length: tickCount }, (_, index) => {
    const angle = (index / tickCount) * Math.PI * 2 - Math.PI / 2;
    const inner = radius - (index % 5 === 0 ? 20 : 12);
    const outer = radius;
    const x1 = 230 + inner * Math.cos(angle);
    const y1 = 230 + inner * Math.sin(angle);
    const x2 = 230 + outer * Math.cos(angle);
    const y2 = 230 + outer * Math.sin(angle);
    const stroke =
      index < activeTicks ? 'rgba(132,255,228,0.92)' : 'rgba(255,255,255,0.25)';
    const strokeWidth = index % 5 === 0 ? 4 : 3;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
  }).join('');

  return `
    <div style="position:relative; width:460px; height:460px; max-width:100%;">
      <svg viewBox="0 0 460 460" style="position:absolute; inset:0; width:100%; height:100%;">
        <circle cx="230" cy="230" r="130" fill="rgba(82, 82, 91, 0.03)" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
        ${lines}
      </svg>
      <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div id="liveTimerDisplay" style="font-size:72px; font-weight:300; line-height:0.95; letter-spacing:-0.06em; color:rgba(255,255,255,0.96); font-variant-numeric:tabular-nums;">${timeDisplay}</div>
        <div style="margin-top:12px; display:inline-flex; align-items:center; gap:8px; color:rgba(255,255,255,0.58); font-size:11px; letter-spacing:0.1em; text-transform:uppercase;">
          <span style="width:6px; height:6px; border-radius:50%; background:rgba(132,255,228,0.95); box-shadow:0 0 8px rgba(132,255,228,0.45);"></span>
          ${label}
        </div>
        <div style="margin-top:8px; max-width:240px; text-align:center; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.45);">${sublabel}</div>
      </div>
    </div>
  `;
}

function renderSessionNotes(items: string[]): string {
  if (items.length === 0) {
    return '';
  }

  return `
    <div style="display:flex; gap:10px; margin-top:34px; flex-wrap:wrap; justify-content:center; max-width:620px;">
      ${items
        .map(
          (item) => `
        <div style="padding:10px 14px; border-radius:14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); font-size:12px; font-weight:700; color:rgba(255,255,255,0.72);">
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
    <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; width:100%; max-width:400px; margin-top:20px;">
      ${[
        { m: 15, tag: 'Quick Sprint' },
        { m: 25, tag: 'Pomodoro' },
        { m: 45, tag: 'Deep Work' },
        { m: 90, tag: 'Long Session' },
      ]
        .map(
          (preset) => `
        <button class="btn-premium start-focus" data-mins="${preset.m}" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:16px 18px; min-height:80px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); box-shadow:none; border-radius:18px; text-align:left;">
          <span style="font-size:22px; font-weight:900; color:var(--text); line-height:1;">${preset.m}m</span>
          <span style="font-size:10px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">${preset.tag}</span>
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderIdleStateSummary(): string {
  return `
    <div style="width:min(420px, 100%); margin-bottom:26px; padding:18px 22px; border-radius:22px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-align:left; backdrop-filter:blur(12px);">
      <div style="font-size:12px; font-weight:800; color:rgba(255,255,255,0.44); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:8px;">Ready</div>
      <div style="font-size:16px; color:rgba(255,255,255,0.86); line-height:1.6;">Pick a session length and Focus will start a real countdown. Nothing shown here is simulated.</div>
    </div>
  `;
}

function renderActiveStateSummary(currentFocus: string): string {
  return `
    <div style="width:min(440px, 100%); margin-bottom:26px; padding:18px 22px; border-radius:22px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); text-align:left; backdrop-filter:blur(12px);">
      <div style="font-size:12px; font-weight:800; color:rgba(255,255,255,0.44); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:8px;">Current Focus</div>
      <div style="font-size:16px; color:rgba(255,255,255,0.9); line-height:1.6;">${escapeHtml(
        currentFocus,
      )}</div>
    </div>
  `;
}

function renderFocusDetails(
  focusStart: number,
  focusEnd: number,
  blockedDomains: string[],
): string {
  const startedAt = new Date(focusStart).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endsAt = new Date(focusEnd).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const details = [`Started ${startedAt}`, `Ends ${endsAt}`];
  if (blockedDomains.length > 0) {
    details.push(`Blocking ${blockedDomains.slice(0, 2).join(', ')}`);
  }

  return renderSessionNotes(details);
}

function renderSidePanels(title: string, body: string): string {
  return `
    <div style="padding:22px 24px; border-radius:22px; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.07); backdrop-filter:blur(16px);">
      <div style="font-size:12px; font-weight:800; color:rgba(255,255,255,0.44); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:14px;">Today</div>
      <div style="font-size:14px; font-weight:700; color:rgba(255,255,255,0.88); margin-bottom:10px;">Focus Time</div>
      <div style="font-size:42px; font-weight:300; line-height:1; color:rgba(255,255,255,0.96);">${formatMinutes(
        getTodayFocusMinutes(),
      )}</div>
    </div>
    <div style="padding:22px 24px; border-radius:22px; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.07); backdrop-filter:blur(16px);">
      <div style="font-size:12px; font-weight:800; color:rgba(255,255,255,0.44); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:14px;">Current State</div>
      <div style="font-size:14px; font-weight:700; color:rgba(255,255,255,0.88); margin-bottom:10px;">${title}</div>
      <div style="font-size:15px; line-height:1.7; color:rgba(255,255,255,0.7);">${body}</div>
    </div>
    <div style="padding:22px 24px; border-radius:22px; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.07); backdrop-filter:blur(16px); flex:1;">
      <div style="font-size:12px; font-weight:800; color:rgba(255,255,255,0.44); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:14px;">Today Records</div>
      <div style="font-size:14px; font-weight:700; color:rgba(255,255,255,0.88); margin-bottom:4px;">Session History</div>
      <div style="font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:14px;">Completed and interrupted sessions from today.</div>
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

  const focusEnd =
    activeSession?.status === 'focusing'
      ? activeSession.startedAt + activeSession.duration * 60000
      : await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);

  const focusStart =
    activeSession?.status === 'focusing'
      ? activeSession.startedAt
      : (await storage.getNumber('fg_focus_session_start', 0)) ||
        focusEnd - 1500000;

  const now = Date.now();
  const isFocusing = focusEnd > now;

  if (window.__focusInterval) {
    clearInterval(window.__focusInterval);
    window.__focusInterval = null;
  }

  if (isFocusing) {
    _renderActive(container, context, focusEnd, focusStart, activeSession);
  } else {
    _renderIdle(container, context);
  }
}

function _renderActive(
  container: HTMLElement,
  context: 'page' | 'popup',
  focusEnd: number,
  focusStart: number,
  activeSession: FocusSessionRecord | null,
): void {
  const now = Date.now();
  const totalDuration = focusEnd - focusStart;
  const remaining = Math.max(0, focusEnd - now);
  const timeDisplay = formatTime(remaining);

  if (context === 'page') {
    _renderActivePage(
      container,
      timeDisplay,
      focusEnd,
      focusStart,
      totalDuration,
      activeSession,
    );
  } else {
    _renderActivePopup(
      container,
      timeDisplay,
      focusEnd,
      totalDuration,
      remaining,
    );
  }
}

function _renderActivePage(
  container: HTMLElement,
  timeDisplay: string,
  focusEnd: number,
  focusStart: number,
  totalDuration: number,
  activeSession: FocusSessionRecord | null,
): void {
  const progress = Math.max(
    0,
    Math.min(1, 1 - Math.max(0, focusEnd - Date.now()) / totalDuration),
  );
  const currentFocus = activeSession?.blockedDomains?.length
    ? activeSession.blockedDomains.slice(0, 2).join(' / ')
    : 'Focus session active';
  const sublabel = `${Math.round(progress * 100)}% complete`;

  const centerContent = `
    ${renderActiveStateSummary(currentFocus)}
    ${renderRingMarkup(timeDisplay, progress, 'Session Running', sublabel)}
    <button class="btn-premium" id="stopFocus" style="margin-top:14px; min-width:126px; justify-content:center; background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.65); border-radius:999px; box-shadow:none; font-size:16px; font-weight:600; padding:14px 30px;">
      Pause
    </button>
    ${renderFocusDetails(
      focusStart,
      focusEnd,
      activeSession?.blockedDomains || [],
    )}
  `;

  container.innerHTML = renderAmbientShell(
    centerContent,
    renderSidePanels('Current Focus', escapeHtml(currentFocus)),
  );

  container.querySelector('#stopFocus')?.addEventListener('click', () => {
    _showAbortModal(container, 'page', () =>
      renderFocusPage(container, 'page'),
    );
  });

  window.__focusInterval = setInterval(() => {
    const activeTab = document.querySelector('[data-tab="focus"].active');
    if (!activeTab) {
      return;
    }
    const remaining = Math.max(0, focusEnd - Date.now());
    if (remaining <= 0) {
      clearInterval(window.__focusInterval);
      renderFocusPage(container, 'page');
      return;
    }
    const timerEl = container.querySelector('#liveTimerDisplay');
    if (timerEl) {
      timerEl.textContent = formatTime(remaining);
    }
  }, 1000);
}

function _renderActivePopup(
  container: HTMLElement,
  timeDisplay: string,
  focusEnd: number,
  totalDuration: number,
  remaining: number,
): void {
  const radius = 90;
  const circum = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remaining / totalDuration));
  const offset = circum * (1 - progress);

  container.innerHTML = `
    <div class="focus-container" style="padding: 20px 0;">
      <div class="focus-timer-v2" style="width: 200px; height: 200px; margin-bottom: 24px;">
        <div class="focus-active-glow"></div>
        <svg class="focus-timer-svg" viewBox="0 0 200 200">
          <circle class="focus-timer-track" cx="100" cy="100" r="90" style="stroke-width: 6;" />
          <circle class="focus-timer-progress" cx="100" cy="100" r="90"
                  style="stroke-width: 6;"
                  stroke-dasharray="${circum}"
                  stroke-dashoffset="${offset}" />
        </svg>
        <div class="focus-timer-text">
          <div class="focus-timer-val" id="preciseTimerPopup" style="font-size: 2.5rem;">${timeDisplay}</div>
          <div class="focus-timer-label" style="font-size: 8px;">Shield Active</div>
        </div>
      </div>

      <button class="btn-premium" id="stopFocusPopup" style="background: rgba(255,255,255,0.02); color: var(--muted); border: 1px solid var(--glass-border); box-shadow: none; font-size: 10px; padding: 8px 16px;">
        ABORT SESSION
      </button>
    </div>
  `;

  container.querySelector('#stopFocusPopup')?.addEventListener('click', () => {
    _showAbortModal(container, 'popup', () =>
      renderFocusPage(container, 'popup'),
    );
  });

  window.__focusInterval = setInterval(() => {
    const rem = Math.max(0, focusEnd - Date.now());
    if (rem <= 0) {
      clearInterval(window.__focusInterval);
      renderFocusPage(container, 'popup');
      return;
    }
    const timerEl = document.getElementById('preciseTimerPopup');
    if (timerEl) {
      timerEl.innerText = formatTime(rem);
    }
    _updateProgressRing(container, rem, totalDuration);
  }, 1000);
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
    renderSidePanels('Focus State', 'No active focus session'),
  );

  container.querySelectorAll('.start-focus').forEach((el) => {
    const btn = el as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const mins = btn.dataset.mins || '0';
      btn.innerText = 'STARTING...';
      btn.classList.add('loading');
      chrome.runtime.sendMessage(
        { action: 'startFocus', minutes: parseInt(mins, 10) },
        () => renderFocusPage(container, 'page'),
      );
    });
  });
}

function _renderIdlePopup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="focus-container" style="padding: 10px 0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div class="widget-title" style="color: var(--text); font-size: 14px;">IGNITE DEEP FOCUS</div>
        <div style="font-size: 10px; color: var(--muted); font-weight: 600; margin-top: 4px;">Network-wide synchronization lock.</div>
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
            <div class="focus-preset-tag" style="font-size: 8px;">${p.tag}</div>
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
      await chrome.storage.local.set({ fg_focus_session_start: Date.now() });
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
    <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:${width}; z-index:10000; padding:${padding}; text-align:center; background:rgba(20,20,20,0.98); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: ${
    isPopup ? '20px' : '24px'
  }; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color: white;">
      <div style="font-size:${titleSize}; font-weight:900; color:var(--text); margin-bottom:${
    isPopup ? '8px' : '12px'
  }; letter-spacing:1px;">ABORT SESSION?</div>
      <div style="font-size:${bodySize}; color:var(--muted); line-height:1.6; margin-bottom:${
    isPopup ? '20px' : '24px'
  };">${
    isPopup
      ? 'Quitting early will end your current shield.'
      : 'Stopping now will record this as a failure in your focus analytics. Are you sure?'
  }</div>
      <div style="display:flex; gap:${
        isPopup ? '10px' : '12px'
      }; justify-content:center;">
        <button class="btn-cancel-abort" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text); padding:${
          isPopup ? '8px' : '10px'
        }; border-radius:${
    isPopup ? '10px' : '12px'
  }; cursor:pointer; font-weight:800; font-size:${
    isPopup ? '10px' : '11px'
  };">CANCEL</button>
        <button class="btn-confirm-abort" style="flex:1; background:var(--red); border:none; color:white; padding:${
          isPopup ? '8px' : '10px'
        }; border-radius:${
    isPopup ? '10px' : '12px'
  }; cursor:pointer; font-weight:800; font-size:${
    isPopup ? '10px' : '11px'
  };">ABORT</button>
      </div>
    </div>
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:9999; backdrop-filter:blur(${
      isPopup ? '4px' : '8px'
    });"></div>
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

function _updateProgressRing(
  container: HTMLElement,
  remaining: number,
  totalDuration: number,
): void {
  const circle = container.querySelector('.focus-timer-progress');
  if (!circle) {
    return;
  }
  const r = parseFloat(circle.getAttribute('r') || '90');
  const circum = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, remaining / totalDuration));
  circle.setAttribute('stroke-dashoffset', String(circum * (1 - progress)));
}
