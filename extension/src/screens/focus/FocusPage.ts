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
      <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-text-center fg-text-[var(--muted)]" style="min-height:220px;">
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
        <div class="fg-grid fg-items-center fg-gap-[14px] fg-py-[14px]" style="grid-template-columns:56px 1fr auto; border-top:1px solid rgba(255,255,255,0.06);">
          <div class="fg-text-xs" style="color: rgba(255,255,255,0.4);">${start}</div>
          <div style="height:1px; background:rgba(255,255,255,0.08);"></div>
          <div class="fg-text-xs fg-font-bold" style="color:${tone};">${duration}</div>
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
      linear-gradient(160deg, var(--fg-surface), var(--fg-bg));
      border:1px solid var(--fg-glass-border); display: flex; flex-direction: column;
      box-shadow: 0 18px 48px rgba(15,23,42,0.12);">
      <div style="position:absolute; inset:0; background: linear-gradient(135deg, transparent, var(--fg-accent-soft));"></div>
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
        ? 'var(--fg-accent)'
        : 'color-mix(in srgb, var(--fg-muted) 35%, transparent)';
    const strokeWidth = index % 5 === 0 ? 3.5 : 2.5;
    return `<line data-tick-index="${index}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
  }).join('');

  return `
      <div style="position:relative; width:360px; height:360px; max-width:100%;">
        <svg viewBox="0 0 380 380" style="position:absolute; inset:0; width:100%; height:100%;">
          <circle cx="190" cy="190" r="110" fill="var(--fg-glass-bg)" stroke="var(--fg-glass-border)" stroke-width="1" />
          ${lines}
        </svg>
        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <div id="liveTimerDisplay" style="font-size:56px; font-weight:300; line-height:0.95; letter-spacing:-0.05em; color:var(--fg-text); font-variant-numeric:tabular-nums;">${timeDisplay}</div>
          <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:var(--fg-muted); font-size:10px; letter-spacing:0.1em; text-transform:uppercase;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--fg-accent); box-shadow:0 0 8px var(--fg-accent-soft);"></span>
            ${label}
          </div>
          <div id="liveSublabelDisplay" style="margin-top:6px; max-width:200px; text-align:center; font-size:12px; line-height:1.5; color:var(--fg-muted);">${sublabel}</div>
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
        <div class="fg-py-[10px] fg-px-[14px] fg-rounded-[14px] fg-text-xs fg-font-bold" style="background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); color:var(--fg-text);">
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
        <button class="btn-premium start-focus fg-flex fg-flex-col fg-items-start fg-gap-1 fg-text-left fg-rounded-[18px]" data-mins="${preset.m}" style="padding:16px 18px; min-height:80px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); box-shadow:none;">
          <span style="font-size:22px; font-weight:900; color:var(--fg-text); line-height:1;">${preset.m}m</span>
          <span class="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-[0.1em]" style="color:var(--fg-muted);">${preset.tag}</span>
        </button>
      `,
        )
        .join('')}
    </div>
  `;
}

function renderIdleStateSummary(): string {
  return `
    <div style="width:min(420px, 100%); margin-bottom:12px; padding:18px 22px; border-radius:22px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); text-align:left; backdrop-filter:blur(12px);">
      <div style="font-size:12px; font-weight:800; color:var(--fg-muted); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:6px;">Ready</div>
      <div style="font-size:15px; color:var(--fg-text); line-height:1.6;">Pick a session length and Focus will start a real countdown. Nothing shown here is simulated.</div>
    </div>
  `;
}

function renderDomainIcon(domain: string, size = 32): string {
  const root = domain.includes('.')
    ? domain.split('.').slice(-2).join('.')
    : domain;
  const iconUrl = `https://www.google.com/s2/favicons?domain=${root}&sz=128`;
  return `
    <div style="width:${size}px; height:${size}px; border-radius:10px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); display:flex; align-items:center; justify-content:center; overflow:hidden;">
      <img src="${iconUrl}" style="width:${Math.round(
    size * 0.6,
  )}px; height:${Math.round(
    size * 0.6,
  )}px; opacity:0.95;" onerror="this.style.display='none';" alt="">
    </div>
  `;
}

function renderActiveStateSummary(
  currentFocusHtml: string,
  count: number,
): string {
  return `
    <div style="width:min(440px, 100%); margin-bottom:12px; padding:18px 22px; border-radius:22px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); text-align:left; backdrop-filter:blur(12px);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-size:12px; font-weight:800; color:var(--fg-muted); letter-spacing:0.12em; text-transform:uppercase;">Shielding Services</div>
        <div style="font-size:10px; font-weight:900; background:var(--fg-accent-soft); color:var(--fg-accent); padding:2px 8px; border-radius:6px; border:1px solid var(--fg-glass-border);">${count} ACTIVE</div>
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
    <div class="fg-p-6 fg-rounded-[22px]" style="background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); backdrop-filter:blur(16px);">
      <div class="fg-text-xs fg-font-extrabold fg-tracking-[0.12em] fg-uppercase fg-mb-[14px]" style="color:var(--fg-muted);">Today</div>
      <div class="fg-text-sm fg-font-bold fg-mb-[10px]" style="color:var(--fg-text);">Focus Time</div>
      <div style="font-size:42px; font-weight:300; line-height:1; color:var(--fg-text);">${formatMinutes(
        getTodayFocusMinutes(),
      )}</div>
    </div>
    <div class="fg-p-6 fg-rounded-[22px]" style="background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); backdrop-filter:blur(16px);">
      <div class="fg-text-xs fg-font-extrabold fg-tracking-[0.12em] fg-uppercase fg-mb-[14px]" style="color:var(--fg-muted);">Current State</div>
      <div class="fg-text-sm fg-font-bold fg-mb-[10px]" style="color:var(--fg-text);">${title}</div>
      <div style="font-size:15px; line-height:1.7; color:var(--fg-muted);">${body}</div>
    </div>
    <div class="fg-p-6 fg-rounded-[22px] fg-flex-1" style="background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); backdrop-filter:blur(16px);">
      <div class="fg-text-xs fg-font-extrabold fg-tracking-[0.12em] fg-uppercase fg-mb-[14px]" style="color:var(--fg-muted);">Today Records</div>
      <div class="fg-text-sm fg-font-bold fg-mb-1" style="color:var(--fg-text);">Session History</div>
      <div class="fg-text-[13px] fg-mb-[14px]" style="color:var(--fg-muted);">Completed and interrupted sessions from today.</div>
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

async function _renderActive(
  container: HTMLElement,
  context: 'page' | 'popup',
  focusEnd: number,
  focusStart: number,
  activeSession: FocusSessionRecord | null,
): Promise<void> {
  const now = Date.now();
  const totalDuration = focusEnd - focusStart;
  const remaining = Math.max(0, focusEnd - now);
  const timeDisplay = formatTime(remaining);
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalDuration));

  if (context === 'page') {
    await _renderActivePage(
      container,
      timeDisplay,
      progress,
      focusEnd,
      focusStart,
      totalDuration,
      activeSession,
    );
  } else {
    await _renderActivePopup(
      container,
      timeDisplay,
      progress,
      focusEnd,
      focusStart,
      totalDuration,
      activeSession,
    );
  }
}

async function _renderActivePage(
  container: HTMLElement,
  timeDisplay: string,
  progress: number,
  focusEnd: number,
  focusStart: number,
  totalDuration: number,
  activeSession: FocusSessionRecord | null,
): Promise<void> {
  const currentFocus = activeSession?.blockedDomains?.length
    ? activeSession.blockedDomains.slice(0, 2).join(' / ')
    : 'Focus session active';
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
    : '<div style="font-size:15px; color:var(--fg-text); line-height:1.6;">Focus session active</div>';

  const sublabel = `${Math.round(progress * 100)}% complete`;

  const centerContent = `
    ${renderActiveStateSummary(currentFocusHtml, uniqueBlocked.length)}
    ${renderRingMarkup(timeDisplay, progress, 'Session Running', sublabel)}
    <button class="btn-premium" id="stopFocus" style="margin-top:10px; min-width:110px; justify-content:center; background:transparent; color:var(--fg-text); border:1px solid var(--fg-glass-border); border-radius:999px; box-shadow:none; font-size:14px; font-weight:600; padding:10px 24px;">
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
    const currentProgress = Math.max(
      0,
      Math.min(1, 1 - remaining / totalDuration),
    );
    const subLabelEl = container.querySelector('#liveSublabelDisplay');
    if (subLabelEl) {
      subLabelEl.textContent = `${Math.round(currentProgress * 100)}% complete`;
    }
    _updateActiveTicks(container, currentProgress);
  }, 1000);
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
        ? 'var(--fg-accent)'
        : 'color-mix(in srgb, var(--fg-muted) 35%, transparent)';
    if (tick.getAttribute('stroke') !== stroke) {
      tick.setAttribute('stroke', stroke);
    }
  });
}

async function _renderActivePopup(
  container: HTMLElement,
  timeDisplay: string,
  progress: number,
  focusEnd: number,
  focusStart: number,
  totalDuration: number,
  activeSession: FocusSessionRecord | null, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
  const sublabel = `${Math.round(progress * 100)}% complete`;

  const centerContent = `
    <div style="transform: scale(0.8); margin: -20px 0;">
      ${renderRingMarkup(timeDisplay, progress, 'Active Focus', sublabel)}
    </div>
    <button class="btn-premium" id="stopFocusPopup" style="margin-top:10px; min-width:110px; justify-content:center; background:transparent; color:var(--fg-text); border:1px solid var(--fg-glass-border); border-radius:999px; box-shadow:none; font-size:12px; font-weight:600; padding:8px 20px;">
      ABORT SESSION
    </button>
  `;

  container.innerHTML = renderAmbientShell(centerContent, null, 'popup');

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
    const timerEl = container.querySelector('#liveTimerDisplay');
    if (timerEl) {
      timerEl.textContent = formatTime(rem);
    }
    const liveProgress = Math.max(0, Math.min(1, 1 - rem / totalDuration));
    const subLabelEl = container.querySelector('#liveSublabelDisplay');
    if (subLabelEl) {
      subLabelEl.textContent = `${Math.round(liveProgress * 100)}% complete`;
    }
    _updateActiveTicks(container, liveProgress);
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
        <div class="widget-title" style="color: rgba(255,255,255,0.9); font-size: 14px;">IGNITE DEEP FOCUS</div>
        <div style="font-size: 10px; color: rgba(255,255,255,0.5); font-weight: 600; margin-top: 4px;">Blocks synced across devices.</div>
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
      <div style="font-size:${titleSize}; font-weight:900; color:rgba(255,255,255,0.98); margin-bottom:${
    isPopup ? '8px' : '12px'
  }; letter-spacing:1px;">ABORT SESSION?</div>
      <div style="font-size:${bodySize}; color:rgba(255,255,255,0.6); line-height:1.6; margin-bottom:${
    isPopup ? '20px' : '24px'
  };">${
    isPopup
      ? 'Quitting early will end your current shield.'
      : 'Stopping now will record this as a failure in your focus analytics. Are you sure?'
  }</div>
      <div style="display:flex; gap:${
        isPopup ? '10px' : '12px'
      }; justify-content:center;">
        <button class="btn-cancel-abort" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.9); padding:${
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
