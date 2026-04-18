import React, { useEffect, useMemo, useState } from 'react';
import { UI_TOKENS, getBrandLogoUrl, resolveIconDomain } from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import { appsController } from '../../lib/appsController';
import { toast } from '../../lib/toast';
import { findServiceIdByDomain, getDomainForRule } from '@stopaccess/core';
import { STORAGE_KEYS } from '@stopaccess/state';
import {
  loadAppsRuntimeState,
  subscribeAppsRuntimeState,
} from '../../lib/appsRuntimeState';
import { checkGuard } from '../../background/sessionGuard';

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
  skipLimit = false,
) {
  const guard = await checkGuard('disable_blocking');
  if (!guard.allowed) {
    return { ok: false, error: (guard as any).reason };
  }

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
  if (!skipLimit && currentCount >= maxDailyPasses) {
    return { ok: false, error: 'No more passes left today' };
  }

  passes[domain] = {
    expiresAt: Date.now() + minutes * 60000,
    grantedMinutes: minutes,
    grantedAt: Date.now(),
  };

  // Only increment the counter for limited passes
  if (!skipLimit) {
    counts[today][domain] = currentCount + 1;
  }

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

  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

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
      const [runtimeState, activeDomain] = await Promise.all([
        loadAppsRuntimeState(),
        getCurrentTabDomain(),
      ]);

      setRules(runtimeState.rules);
      setUsage(runtimeState.usage as UsageMap);
      setPasses(runtimeState.passes);
      setLockedDomains(runtimeState.lockedDomains);
      setCurrentDomain(activeDomain);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeAppsRuntimeState(() => {
      refresh();
    });
    const interval = setInterval(async () => {
      setCurrentDomain(await getCurrentTabDomain());
    }, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
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

  const handleTemporaryDisable = async (rule: any) => {
    let targetDomain = null;
    if (currentDomain && ruleMatchesDomain(rule, currentDomain)) {
      targetDomain = currentDomain;
    } else {
      targetDomain = getDomainForRule(rule);
    }

    if (!targetDomain) {
      toast.info('Open the blocked site first, then pause it here');
      return;
    }

    const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
    const confirmed = await confirmGuardianAction({
      title: 'Pause Protection',
      body: `Verify your security to pause ${rule.appName || targetDomain}.`,
    });

    if (confirmed) {
      setPauseTarget({ ...rule, _unblockDomain: targetDomain });
    }
  };

  const handlePauseSelect = async (minutes: number) => {
    if (!pauseTarget) {
      return;
    }
    const targetDomain = pauseTarget._unblockDomain;
    if (!targetDomain) {
      return;
    }

    setPauseTarget(null);
    // Any pass longer than 2 hours (like Turn off for today) skips the limit check
    const result = await grantTempPassForDomain(
      targetDomain,
      minutes,
      Number(pauseTarget.maxDailyPasses ?? 3),
      minutes > 120,
    );
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (minutes >= 1440) {
      const { updateRule } = await import('@stopaccess/state/rules');
      const { extensionAdapter } = await import(
        '../../background/platformAdapter'
      );
      await updateRule(extensionAdapter, {
        ...(pauseTarget as any),
        streakDays: 0,
        streakStartedAt: Date.now(),
      });
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
        <div className="fg-h-6 fg-w-6 fg-animate-spin fg-rounded-full fg-border-2 fg-border-[var(--fg-glass-border)] fg-border-t-[var(--accent)]" />
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
            background: COLORS.overlay,
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setPauseTarget(null)}
        >
          <div
            className="fg-w-full fg-rounded-t-[24px] fg-p-5 fg-pb-6"
            style={{
              background: 'var(--fg-surface)',
              border: '1px solid var(--fg-glass-border)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fg-mb-4 fg-flex fg-items-center fg-gap-3">
              <img
                src={getBrandLogoUrl(
                  resolveIconDomain(
                    pauseTarget.customDomain || pauseTarget.packageName,
                    pauseTarget.appName,
                  ),
                  64,
                )}
                className="fg-h-7 fg-w-7 fg-rounded-[20%]"
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <div
                  style={{
                    ...UI_TOKENS.TEXT.R.CARD_TITLE,
                    color: 'var(--fg-text)',
                  }}
                >
                  {pauseTarget.appName || pauseTarget.packageName}
                </div>
                <div style={UI_TOKENS.TEXT.R.LABEL}>Pause for how long?</div>
              </div>
            </div>

            <div className="fg-grid fg-grid-cols-4 fg-gap-2 fg-mb-3">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className="fg-flex fg-flex-col fg-items-center fg-justify-center fg-rounded-[14px] fg-py-3"
                  style={{
                    background: 'var(--fg-glass-bg)',
                    border: '1px solid var(--fg-glass-border)',
                  }}
                  onClick={() => handlePauseSelect(mins)}
                >
                  <span
                    style={{
                      ...UI_TOKENS.TEXT.R.STAT,
                      fontSize: '18px',
                      color: 'var(--fg-text)',
                    }}
                  >
                    {mins}
                  </span>
                  <span style={UI_TOKENS.TEXT.R.LABEL}>min</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="fg-w-full fg-rounded-[14px] fg-py-3 fg-text-[11px] fg-font-black  fg-tracking-widest"
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--fg-glass-border)',
                color: 'var(--fg-red)',
              }}
              onClick={() => handlePauseSelect(minutesTillMidnight())}
            >
              Turn off for today
            </button>

            <div
              className="fg-mt-3 fg-text-center fg-text-[11px] fg-font-semibold  fg-tracking-wider"
              style={{ color: 'var(--muted)' }}
            >
              {Number(pauseTarget.maxDailyPasses ?? 3)} passes/day · tap outside
              to cancel
            </div>
          </div>
        </div>
      )}

      <div className="fg-flex fg-gap-2">
        <div className="fg-relative fg-flex-1">
          <input
            type="text"
            placeholder="Filter active rules..."
            className="fg-w-full fg-rounded-[12px] fg-border-0 fg-bg-[var(--fg-glass-bg)] fg-px-[14px] fg-py-[10px] fg-text-[13px] fg-text-[var(--fg-text)] fg-outline-none placeholder:fg-text-[var(--muted)] focus:fg-bg-[var(--fg-surface-hover)]"
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
          className="fg-flex fg-h-[38px] fg-w-[38px] fg-shrink-0 fg-items-center fg-justify-center fg-rounded-[12px] fg-bg-[var(--fg-glass-bg)] fg-text-[20px] fg-font-normal fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-surface-hover)]"
          type="button"
        >
          +
        </button>
      </div>

      {currentDomain && !currentSiteBlocked ? (
        <div className="fg-flex fg-items-center fg-justify-between fg-gap-3 fg-rounded-[16px] fg-bg-[var(--fg-glass-bg)] fg-px-[14px] fg-py-3">
          <div className="fg-flex fg-items-center fg-gap-3">
            <div className="fg-flex fg-h-8 fg-w-8 fg-items-center fg-justify-center">
              <img
                src={getBrandLogoUrl(currentDomain || '', 64)}
                className="fg-h-6 fg-w-6 fg-rounded-[20%]"
                alt=""
              />
            </div>
            <div className="fg-min-w-0">
              <div className="fg-truncate fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)]">
                {currentDomain}
              </div>
              <div className="fg-text-[11px] fg-font-semibold  fg-text-[var(--muted)]">
                Current Site
              </div>
            </div>
          </div>
          <button
            className="fg-inline-flex fg-items-center fg-rounded-[8px] fg-bg-[var(--fg-surface-hover)] fg-px-[10px] fg-py-[6px] fg-text-[12px] fg-font-semibold fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-surface)]"
            onClick={() => handleAddDomain(currentDomain)}
            type="button"
          >
            Block
          </button>
        </div>
      ) : null}

      <div className="fg-px-[2px]">
        <div style={UI_TOKENS.TEXT.R.LABEL}>Enforcement Rules</div>
      </div>

      <div className="fg-flex fg-min-h-0 fg-flex-1 fg-flex-col fg-gap-2 fg-overflow-y-auto">
        {activeRules.map((rule: any) => {
          const primaryDomain = getDomainForRule(rule);
          const matchesCurrent = ruleMatchesDomain(rule, currentDomain);
          const activePassDomain =
            matchesCurrent && currentDomain && passes[currentDomain]
              ? currentDomain
              : primaryDomain && passes[primaryDomain]
              ? primaryDomain
              : null;
          const activePass = activePassDomain ? passes[activePassDomain] : null;
          const isTemporarilyOff =
            activePass && Number(activePass.expiresAt) > Date.now();

          return (
            <div
              key={rule.packageName}
              className={`fg-flex fg-items-center fg-justify-between fg-gap-[6px] fg-rounded-[12px] fg-px-[14px] fg-py-3 ${
                matchesCurrent
                  ? 'fg-bg-[var(--fg-surface-hover)]'
                  : 'fg-bg-[var(--fg-glass-bg)]'
              }`}
            >
              <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-3">
                <div className="fg-relative fg-flex fg-h-8 fg-w-8 fg-shrink-0 fg-items-center fg-justify-center">
                  <div className="fg-absolute fg-inset-0 fg-hidden fg-items-center fg-justify-center fg-text-[11px] fg-font-black fg-text-[var(--muted)]">
                    {(rule.appName || rule.packageName)
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <img
                    src={getBrandLogoUrl(
                      resolveIconDomain(
                        rule.customDomain || rule.packageName,
                        rule.appName,
                      ),
                      128,
                    )}
                    alt=""
                    className="fg-relative fg-z-[1] fg-h-7 fg-w-7 fg-object-contain fg-rounded-[20%]"
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
                  <div className="fg-flex fg-items-center fg-gap-2 fg-truncate">
                    <span
                      className="fg-truncate"
                      style={{
                        ...UI_TOKENS.TEXT.R.CARD_TITLE,
                        fontSize: '14px',
                        color: 'var(--fg-text)',
                      }}
                    >
                      {rule.appName || rule.packageName}
                    </span>
                    {isTemporarilyOff ? (
                      <span
                        className="fg-shrink-0"
                        style={{
                          ...UI_TOKENS.TEXT.R.LABEL,
                          fontSize: '11px',
                          color: 'var(--fg-accent)',
                          textTransform: 'none',
                        }}
                      >
                        Disabled until {getPassCountdown(activePass)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                style={{
                  transform: 'scale(0.8)',
                  transformOrigin: 'right center',
                }}
                className={`toggle-switch-btn ${
                  rule.desiredBlockingState === false || isTemporarilyOff
                    ? ''
                    : 'active'
                }`}
                data-kind={rule.type || 'domain'}
                disabled={lockedDomains.includes(
                  rule.packageName.toLowerCase(),
                )}
                onClick={async () => {
                  if (isTemporarilyOff) {
                    const targetDomain = activePassDomain;
                    if (targetDomain) {
                      const newPasses = { ...passes };
                      delete newPasses[targetDomain];
                      await chrome.storage.local.set({
                        [STORAGE_KEYS.TEMP_PASSES]: newPasses,
                      });
                      chrome.runtime.sendMessage({ action: 'manualSync' });
                      toast.success('Block resumed');
                      refresh();
                    }
                  } else {
                    handleTemporaryDisable(rule);
                  }
                }}
                type="button"
                title={isTemporarilyOff ? 'Resume Block' : 'Temporary disable'}
              >
                <span className="on-text">ON</span>
                <span className="off-text">OFF</span>
              </button>
            </div>
          );
        })}

        {activeRules.length === 0 ? (
          <div className="fg-panel-muted fg-rounded-[18px] fg-px-4 fg-py-10 fg-text-center">
            <div className="fg-text-[12px] fg-font-bold  fg-tracking-[0.12em] fg-text-[var(--fg-muted)]">
              No active rules
            </div>
            <div className="fg-mt-2 fg-text-[12px] fg-font-medium fg-text-[var(--fg-muted)]">
              Add a domain above to start blocking.
            </div>
          </div>
        ) : null}
      </div>

      {recentActivity.length > 0 ? (
        <div>
          <div className="fg-mb-[10px] fg-px-[2px]">
            <div className="fg-text-[11px] fg-font-extrabold  fg-tracking-[1px] fg-text-[var(--muted)]">
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
                    src={getBrandLogoUrl(item.domain, 64)}
                    className="fg-h-5 fg-w-5 fg-rounded-[20%]"
                    alt=""
                  />
                  <div className="fg-truncate fg-text-[13px] fg-font-semibold fg-text-[var(--fg-text)]">
                    {item.domain}
                  </div>
                </div>
                <button
                  className="fg-rounded-[6px] fg-bg-[var(--fg-glass-bg)] fg-px-[10px] fg-py-1 fg-text-[10px] fg-font-extrabold fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-surface-hover)]"
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
