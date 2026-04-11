import React, { useEffect, useMemo, useState } from 'react';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { toast } from '../../lib/toast';
import { findServiceIdByDomain, resolveServiceIcon } from '@stopaccess/core';
import { STORAGE_KEYS } from '@stopaccess/state';

type UsageMap = Record<string, { time?: number }>;

async function getCurrentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab.url.startsWith('http')) {
    return null;
  }

  try {
    return new URL(tab.url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function ruleMatchesDomain(rule: any, domain: string | null) {
  if (!domain) {
    return false;
  }

  const ruleDomain = rule.customDomain || rule.packageName;
  if (
    ruleDomain === domain ||
    (ruleDomain && domain.endsWith(`.${ruleDomain}`))
  ) {
    return true;
  }

  if (rule.type === 'service') {
    return findServiceIdByDomain(domain) === rule.packageName;
  }

  return false;
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

async function grantTempPassForDomain(
  domain: string,
  minutes: number,
  maxDailyPasses: number,
) {
  const storageRes = await chrome.storage.local.get([
    STORAGE_KEYS.TEMP_PASSES,
    STORAGE_KEYS.EXTENSION_COUNTS,
  ]);

  const passes = storageRes[STORAGE_KEYS.TEMP_PASSES] || {};
  const counts = storageRes[STORAGE_KEYS.EXTENSION_COUNTS] || {};
  const today = getTodayKey();

  if (!counts[today]) {
    counts[today] = {};
  }

  const currentCount = counts[today][domain] || 0;
  if (currentCount >= maxDailyPasses) {
    return { ok: false, error: 'No more passes left today' };
  }

  passes[domain] = {
    expiresAt: Date.now() + minutes * 60000,
    grantedMinutes: minutes,
    grantedAt: Date.now(),
  };
  counts[today][domain] = currentCount + 1;

  await chrome.storage.local.set({
    [STORAGE_KEYS.TEMP_PASSES]: passes,
    [STORAGE_KEYS.EXTENSION_COUNTS]: counts,
  });

  chrome.runtime.sendMessage({ action: 'manualSync' });
  return { ok: true };
}

function getPassCountdown(pass: any) {
  const diff = Math.max(0, Number(pass?.expiresAt || 0) - Date.now());
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AppsPopupView: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [lockedDomains, setLockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageMap>({});
  const [passes, setPasses] = useState<Record<string, any>>({});
  const [pauseTarget, setPauseTarget] = useState<any | null>(null);

  const refresh = async () => {
    try {
      const [
        {
          rules: storedRules = '[]',
          usage: usageMap = {},
          fg_temp_passes = {},
        },
        locked,
        activeDomain,
      ] = await Promise.all([
        chrome.storage.local.get(['rules', 'usage', STORAGE_KEYS.TEMP_PASSES]),
        getLockedDomains(),
        getCurrentTabDomain(),
      ]);

      setRules(JSON.parse(storedRules as string));
      setUsage(usageMap as UsageMap);
      setPasses(fg_temp_passes as Record<string, any>);
      setLockedDomains(locked);
      setCurrentDomain(activeDomain);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  const query = searchTerm.trim().toLowerCase();

  const activeRules = useMemo(
    () =>
      rules
        .filter(
          (rule: any) =>
            (rule.type === 'service' || rule.type === 'domain' || !rule.type) &&
            (rule.blockedToday ||
              rule.mode === 'block' ||
              rule.mode === 'limit' ||
              rule.desiredBlockingState),
        )
        .filter((rule: any) => {
          const name = (rule.appName || '').toLowerCase();
          const domain = (
            rule.customDomain ||
            rule.packageName ||
            ''
          ).toLowerCase();
          return !query || name.includes(query) || domain.includes(query);
        })
        .sort((left: any, right: any) => {
          const leftCurrent = ruleMatchesDomain(left, currentDomain) ? 1 : 0;
          const rightCurrent = ruleMatchesDomain(right, currentDomain) ? 1 : 0;
          if (leftCurrent !== rightCurrent) {
            return rightCurrent - leftCurrent;
          }
          return (right.streakDays || 0) - (left.streakDays || 0);
        }),
    [rules, query, currentDomain],
  );

  const currentSiteBlocked = useMemo(() => {
    if (!currentDomain) {
      return false;
    }

    return rules.some((rule: any) => {
      const active = Boolean(
        rule.blockedToday ||
          rule.mode === 'block' ||
          rule.mode === 'limit' ||
          rule.desiredBlockingState,
      );
      return active && ruleMatchesDomain(rule, currentDomain);
    });
  }, [currentDomain, rules]);

  const recentActivity = useMemo(
    () =>
      Object.entries(usage)
        .map(([domain, entry]) => ({ domain, time: entry?.time || 0 }))
        .filter(({ domain, time }) => {
          const alreadyBlocked = rules.some((rule: any) => {
            const active = Boolean(
              rule.blockedToday ||
                rule.mode === 'block' ||
                rule.mode === 'limit' ||
                rule.desiredBlockingState,
            );
            return active && ruleMatchesDomain(rule, domain);
          });

          return time > 60000 && !alreadyBlocked;
        })
        .sort((a, b) => b.time - a.time)
        .slice(0, 3),
    [rules, usage],
  );

  const handleAddDomain = async (value?: string) => {
    const domainValue = (value || searchTerm)
      .trim()
      .toLowerCase()
      .replace(/^www\./, '');
    if (!domainValue.includes('.')) {
      toast.error('Invalid domain');
      return;
    }

    const res = await appsController.addDomainRule(domainValue);
    if (res.ok) {
      setSearchTerm('');
      refresh();
    }
  };

  const handleTemporaryDisable = (rule: any) => {
    if (!currentDomain || !ruleMatchesDomain(rule, currentDomain)) {
      toast.info('Open the blocked site first, then pause it here');
      return;
    }
    setPauseTarget(rule);
  };

  const handlePauseSelect = async (minutes: number) => {
    if (!pauseTarget || !currentDomain) {
      return;
    }
    setPauseTarget(null);
    const result = await grantTempPassForDomain(
      currentDomain,
      minutes,
      Number(pauseTarget.maxDailyPasses ?? 3),
    );
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const label =
      minutes >= 1440
        ? 'rest of today'
        : `${minutes} min${minutes === 1 ? '' : 's'}`;
    toast.success(`Paused for ${label}`);
    refresh();
  };

  const minutesTillMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 60000);
  };

  if (loading) {
    return (
      <div className="fg-flex fg-h-64 fg-w-full fg-items-center fg-justify-center">
        <div className="fg-h-6 fg-w-6 fg-animate-spin fg-rounded-full fg-border-2 fg-border-white/5 fg-border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="fg-flex fg-w-full fg-flex-col fg-gap-[14px] fg-p-[14px]">
      {/* Pause Duration Bottom Sheet */}
      {pauseTarget && (
        <div
          className="fg-fixed fg-inset-0 fg-z-50 fg-flex fg-items-end fg-justify-center"
          style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setPauseTarget(null)}
        >
          <div
            className="fg-w-full fg-rounded-t-[24px] fg-p-5 fg-pb-6"
            style={{
              background: 'var(--fg-surface, #1a1a2e)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fg-mb-4 fg-flex fg-items-center fg-gap-3">
              <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                  resolveServiceIcon({
                    id: pauseTarget.packageName,
                    name: pauseTarget.appName,
                  }).domain ||
                    pauseTarget.customDomain ||
                    pauseTarget.packageName,
                )}&sz=64`}
                className="fg-h-7 fg-w-7 fg-rounded-[20%]"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <div className="fg-text-[13px] fg-font-black fg-text-white">
                  {pauseTarget.appName || pauseTarget.packageName}
                </div>
                <div
                  className="fg-text-[9px] fg-font-bold fg-uppercase fg-tracking-widest"
                  style={{ color: 'var(--muted)' }}
                >
                  Pause for how long?
                </div>
              </div>
            </div>

            <div className="fg-grid fg-grid-cols-4 fg-gap-2 fg-mb-3">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className="fg-flex fg-flex-col fg-items-center fg-justify-center fg-rounded-[14px] fg-py-3"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onClick={() => handlePauseSelect(mins)}
                >
                  <span className="fg-text-[18px] fg-font-black fg-text-white">
                    {mins}
                  </span>
                  <span
                    className="fg-text-[9px] fg-font-bold fg-uppercase"
                    style={{ color: 'var(--muted)' }}
                  >
                    min
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="fg-w-full fg-rounded-[14px] fg-py-3 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
              onClick={() => handlePauseSelect(minutesTillMidnight())}
            >
              Turn off for today
            </button>

            <div
              className="fg-mt-3 fg-text-center fg-text-[9px] fg-font-bold fg-uppercase fg-tracking-widest"
              style={{ color: 'var(--muted)' }}
            >
              {Number(pauseTarget.maxDailyPasses ?? 3)} passes/day · tap outside
              to cancel
            </div>
          </div>
        </div>
      )}
      <div className="fg-flex fg-items-center fg-justify-between fg-px-[2px]">
        <div className="fg-text-[11px] fg-font-extrabold fg-uppercase fg-tracking-[1px] fg-text-[var(--muted)]">
          BLOCK LIST
        </div>
        <div className="fg-inline-flex fg-items-center fg-gap-2 fg-text-[10px] fg-font-extrabold fg-text-[var(--muted)]">
          <span>{activeRules.length} RULES</span>
          <span className="fg-text-slate-600">/</span>
          <span>{recentActivity.length} RECENT</span>
        </div>
      </div>

      <div className="fg-flex fg-gap-2">
        <div className="fg-relative fg-flex-1">
          <input
            type="text"
            placeholder="Filter active rules..."
            className="fg-w-full fg-rounded-[12px] fg-border-0 fg-bg-white/[0.04] fg-px-[14px] fg-py-[10px] fg-text-[13px] fg-text-white fg-outline-none placeholder:fg-text-[var(--muted)] focus:fg-bg-white/[0.05]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddDomain();
              }
            }}
          />
        </div>
        <button
          onClick={() => handleAddDomain()}
          className="fg-flex fg-h-[38px] fg-w-[38px] fg-shrink-0 fg-items-center fg-justify-center fg-rounded-[12px] fg-bg-white/[0.06] fg-text-[20px] fg-font-normal fg-text-white hover:fg-bg-white/[0.1]"
          type="button"
        >
          +
        </button>
      </div>

      {currentDomain && !currentSiteBlocked ? (
        <div className="fg-flex fg-items-center fg-justify-between fg-gap-3 fg-rounded-[16px] fg-bg-white/[0.03] fg-px-[14px] fg-py-3">
          <div className="fg-flex fg-items-center fg-gap-3">
            <div className="fg-flex fg-h-8 fg-w-8 fg-items-center fg-justify-center">
              <img
                src={`https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64`}
                className="fg-h-6 fg-w-6 fg-rounded-[20%]"
                alt=""
              />
            </div>
            <div className="fg-min-w-0">
              <div className="fg-truncate fg-text-[12px] fg-font-extrabold fg-text-white">
                {currentDomain}
              </div>
              <div className="fg-text-[9px] fg-font-bold fg-uppercase fg-text-[var(--muted)]">
                Current Site
              </div>
            </div>
          </div>
          <button
            className="fg-inline-flex fg-items-center fg-rounded-[8px] fg-bg-white/[0.08] fg-px-[10px] fg-py-[6px] fg-text-[10px] fg-font-semibold fg-text-white hover:fg-bg-white/[0.12]"
            onClick={() => handleAddDomain(currentDomain)}
            type="button"
          >
            Block
          </button>
        </div>
      ) : null}

      <div className="fg-px-[2px]">
        <div className="fg-text-[11px] fg-font-extrabold fg-uppercase fg-tracking-[1px] fg-text-[var(--muted)]">
          Enforcement Rules
        </div>
      </div>

      <div className="fg-flex fg-min-h-0 fg-flex-1 fg-flex-col fg-gap-2 fg-overflow-y-auto">
        {activeRules.map((rule: any) => {
          const matchesCurrent = ruleMatchesDomain(rule, currentDomain);
          const activePass =
            currentDomain && matchesCurrent ? passes[currentDomain] : null;
          const isTemporarilyOff =
            activePass && Number(activePass.expiresAt) > Date.now();

          return (
            <div
              key={rule.packageName}
              className={`fg-flex fg-items-center fg-justify-between fg-gap-[6px] fg-rounded-[12px] fg-px-[14px] fg-py-3 ${
                matchesCurrent ? 'fg-bg-white/[0.08]' : 'fg-bg-white/[0.03]'
              }`}
            >
              <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-3">
                <div className="fg-relative fg-flex fg-h-7 fg-w-7 fg-shrink-0 fg-items-center fg-justify-center">
                  <div className="fg-absolute fg-inset-0 fg-hidden fg-items-center fg-justify-center fg-text-[11px] fg-font-black fg-text-[var(--muted)]">
                    {(rule.appName || rule.packageName)
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                      resolveServiceIcon({
                        id: rule.packageName,
                        name: rule.appName,
                      }).domain ||
                        rule.customDomain ||
                        rule.packageName,
                    )}&sz=128`}
                    alt=""
                    className="fg-relative fg-z-[1] fg-h-6 fg-w-6 fg-object-contain fg-rounded-[20%]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget
                        .previousElementSibling as HTMLDivElement | null;
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                </div>

                <div className="fg-min-w-0 fg-flex-1">
                  <div className="fg-truncate fg-text-[13px] fg-font-bold fg-text-white">
                    {rule.appName || rule.packageName}
                  </div>
                  <div className="fg-mt-0.5 fg-flex fg-items-center fg-gap-[6px] fg-text-[9px] fg-font-semibold fg-uppercase fg-text-[var(--muted)]">
                    <span>
                      {matchesCurrent ? 'Current Site' : rule.type || 'Rule'}
                    </span>
                    <span>Streak {Number(rule.streakDays || 0)}</span>
                    <span>{Number(rule.maxDailyPasses ?? 3)} passes</span>
                  </div>
                  {isTemporarilyOff ? (
                    <div className="fg-mt-1 fg-text-[10px] fg-font-bold fg-text-[var(--fg-accent)]">
                      Disabled until {getPassCountdown(activePass)}
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                className={`fg-relative fg-h-8 fg-w-16 fg-overflow-hidden fg-rounded-full fg-border-0 ${
                  isTemporarilyOff ? 'fg-bg-white/[0.05]' : 'fg-bg-[var(--red)]'
                }`}
                disabled={lockedDomains.includes(rule.packageName)}
                onClick={() => handleTemporaryDisable(rule)}
                type="button"
                title="Temporary disable only"
              >
                <span
                  className={`fg-absolute fg-top-1/2 -fg-translate-y-1/2 fg-text-[11px] fg-font-black ${
                    isTemporarilyOff
                      ? 'fg-right-[10px] fg-text-[var(--muted)]'
                      : 'fg-left-[10px]'
                  }`}
                  style={{
                    color: isTemporarilyOff ? 'var(--muted)' : '#fefefe',
                    opacity: 1,
                  }}
                >
                  {isTemporarilyOff ? 'OFF' : 'ON'}
                </span>
                <span
                  className={`fg-absolute fg-top-1 fg-h-6 fg-w-6 fg-rounded-full fg-bg-white ${
                    isTemporarilyOff ? '' : 'fg-translate-x-8'
                  }`}
                  style={{
                    left: '4px',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </button>
            </div>
          );
        })}

        {activeRules.length === 0 ? (
          <div className="fg-panel-muted fg-rounded-[18px] fg-px-4 fg-py-10 fg-text-center">
            <div className="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.18em] fg-text-slate-400">
              No active rules
            </div>
            <div className="fg-mt-2 fg-text-xs fg-font-medium fg-text-slate-500">
              Add a domain above to start blocking.
            </div>
          </div>
        ) : null}
      </div>

      {recentActivity.length > 0 ? (
        <div>
          <div className="fg-mb-[10px] fg-px-[2px]">
            <div className="fg-text-[11px] fg-font-extrabold fg-uppercase fg-tracking-[1px] fg-text-[var(--muted)]">
              Recent Activity
            </div>
          </div>
          <div className="fg-flex fg-flex-col fg-gap-2">
            {recentActivity.map((item) => (
              <div
                key={item.domain}
                className="fg-panel-muted fg-flex fg-items-center fg-justify-between fg-gap-3 fg-rounded-[12px] fg-px-[14px] fg-py-[10px] fg-opacity-80"
              >
                <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-[10px]">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
                    className="fg-h-5 fg-w-5 fg-rounded-[20%]"
                    alt=""
                  />
                  <div className="fg-truncate fg-text-[13px] fg-font-semibold fg-text-white">
                    {item.domain}
                  </div>
                </div>
                <button
                  className="fg-rounded-[6px] fg-bg-white/[0.08] fg-px-[10px] fg-py-1 fg-text-[10px] fg-font-extrabold fg-text-white hover:fg-bg-white/[0.12]"
                  onClick={() => handleAddDomain(item.domain)}
                  type="button"
                >
                  Block
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
