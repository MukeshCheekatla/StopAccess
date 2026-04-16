import React, { useEffect, useMemo, useState } from 'react';
import { UI_TOKENS } from '../../lib/ui';
import { extensionAdapter as storage } from '../../background/platformAdapter';
import {
  fmtTime,
  findServiceIdByDomain,
  resolveFaviconUrl,
} from '@stopaccess/core';

type UsageEntry = {
  time?: number;
};

type Rule = {
  blockedToday?: boolean;
  customDomain?: string;
  mode?: string;
  packageName?: string;
  type?: string;
};

type ActivityRow = {
  domain: string;
  isBlocked: boolean;
  timeMs: number;
};

export function DashboardPopupView() {
  const [usage, setUsage] = useState<Record<string, UsageEntry>>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const refreshUsage = async () => {
      const { usage: nextUsage = {}, rules: rulesRaw = '[]' } =
        await chrome.storage.local.get(['usage', 'rules']);

      if (!mounted) {
        return;
      }

      setUsage(nextUsage as Record<string, UsageEntry>);
      setRules(JSON.parse(rulesRaw as string) as Rule[]);
      setLoading(false);
    };

    const refreshTimer = async () => {
      const endTime = await storage.getNumber('focus_mode_end_time');
      if (!mounted) {
        return;
      }
      setRemaining(Math.max(0, endTime - Date.now()));
    };

    const listener = (changes: any) => {
      if (changes.usage || changes.rules) {
        refreshUsage();
      }
      if (changes.focus_mode_end_time) {
        refreshTimer();
      }
    };

    chrome.storage.onChanged.addListener(listener);

    refreshUsage();
    refreshTimer();

    const timerInterval = window.setInterval(refreshTimer, 1000);

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(listener);
      window.clearInterval(timerInterval);
    };
  }, []);

  const totalUsageMs = useMemo(
    () =>
      Object.values(usage).reduce(
        (total, entry) => total + (entry?.time || 0),
        0,
      ),
    [usage],
  );

  const activityRows = useMemo<ActivityRow[]>(
    () =>
      Object.entries(usage)
        .map(([domain, entry]) => ({
          domain,
          timeMs: entry?.time || 0,
          isBlocked: rules.some((rule) => {
            const active = rule.blockedToday || rule.mode === 'block';
            if (!active) {
              return false;
            }

            if ((rule.customDomain || rule.packageName) === domain) {
              return true;
            }

            if (rule.type === 'service') {
              return findServiceIdByDomain(domain) === rule.packageName;
            }

            return false;
          }),
        }))
        .filter((entry) => entry.timeMs >= 60000)
        .sort((a, b) => b.timeMs - a.timeMs)
        .slice(0, 8),
    [rules, usage],
  );

  const timerLabel =
    remaining > 0
      ? (() => {
          const totalSeconds = Math.floor(remaining / 1000);
          const mins = Math.floor(totalSeconds / 60);
          const secs = totalSeconds % 60;
          return `${String(mins).padStart(2, '0')}:${String(secs).padStart(
            2,
            '0',
          )}`;
        })()
      : '--:--';

  return (
    <div className="fg-flex fg-flex-col fg-gap-4 fg-p-4">
      <div className="fg-grid fg-grid-cols-2 fg-gap-3">
        <StatTile label="Daily Activity" value={fmtTime(totalUsageMs)} />
        <StatTile label="Lock Timer" value={timerLabel} mono />
      </div>

      <div className="fg-flex fg-items-center fg-justify-between fg-px-1">
        <div style={UI_TOKENS.TEXT.R.LABEL}>RECOGNIZED ACTIVITY</div>
      </div>

      <div className="fg-flex fg-min-h-0 fg-flex-1 fg-flex-col fg-gap-3 fg-overflow-y-auto fg-pr-1">
        {activityRows.length > 0 ? (
          activityRows.map((row) => <ActivityCard key={row.domain} row={row} />)
        ) : !loading ? (
          <div className="fg-panel-muted fg-rounded-[18px] fg-px-4 fg-py-10 fg-text-center">
            <div style={{ ...UI_TOKENS.TEXT.R.LABEL, opacity: 0.6 }}>
              No activity yet
            </div>
            <div className="fg-mt-2 fg-text-[12px] fg-font-medium fg-leading-relaxed fg-text-slate-400">
              Open a few sites and the popup will start summarizing your day.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="fg-rounded-[12px] fg-bg-[var(--fg-glass-bg)] fg-p-[14px] fg-border fg-border-[var(--fg-glass-border)]">
      <div style={UI_TOKENS.TEXT.R.LABEL}>{label}</div>
      <div
        className={`fg-mt-2 ${mono ? 'fg-tabular-nums' : ''}`}
        style={{ ...UI_TOKENS.TEXT.R.STAT, fontSize: '16px' }}
      >
        {value}
      </div>
    </div>
  );
}

function ActivityCard({ row }: { row: ActivityRow }) {
  const faviconUrl = resolveFaviconUrl(row.domain);
  const fallbackLabel =
    row.domain.split('.')[0].slice(0, 2).toUpperCase() || '?';

  return (
    <div className="fg-flex fg-items-center fg-gap-4 fg-rounded-[12px] fg-bg-[var(--fg-glass-bg)] fg-p-3 fg-border fg-border-[var(--fg-glass-border)]">
      <div className="fg-relative fg-flex fg-h-9 fg-w-9 fg-shrink-0 fg-items-center fg-justify-center">
        {row.isBlocked ? (
          <div className="fg-absolute -fg-bottom-0.5 -fg-right-0.5 fg-z-10 fg-flex fg-h-3.5 fg-w-3.5 fg-items-center fg-justify-center fg-rounded-full fg-border-2 fg-border-[var(--fg-surface)] fg-bg-[var(--fg-red)] fg-text-[8px] fg-font-black fg-text-white">
            x
          </div>
        ) : null}
        <div className="fg-absolute fg-inset-0 fg-hidden fg-items-center fg-justify-center fg-text-[11px] fg-font-black fg-text-[var(--muted)]">
          {fallbackLabel}
        </div>
        <img
          src={faviconUrl}
          alt=""
          className="fg-relative fg-z-[1] fg-h-7 fg-w-7 fg-object-contain fg-rounded-[20%]"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget
              .previousElementSibling as HTMLDivElement | null;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />
      </div>

      <div className="fg-min-w-0 fg-flex-1">
        <div
          className="fg-truncate"
          style={{
            ...UI_TOKENS.TEXT.R.CARD_TITLE,
            fontSize: '14px',
            color: row.isBlocked ? 'var(--fg-muted)' : 'var(--fg-text)',
          }}
        >
          {row.domain}
        </div>
      </div>

      <div
        className="fg-tabular-nums"
        style={{
          ...UI_TOKENS.TEXT.R.CARD_TITLE,
          fontSize: '14px',
          color: row.isBlocked ? 'var(--fg-red)' : 'var(--fg-text)',
        }}
      >
        {fmtTime(row.timeMs)}
      </div>
    </div>
  );
}
