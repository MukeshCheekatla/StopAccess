import React, { useEffect, useMemo, useState } from 'react';
import { UI_TOKENS, getBrandLogoUrl, resolveIconDomain } from '../../lib/ui';
import { appsController } from '../../lib/appsController';
import { toast } from '../../lib/toast';
import {
  findServiceIdByDomain,
  getDomainForRule,
  formatMinutes,
  resolveTargetInput,
} from '@stopaccess/core';
import { STORAGE_KEYS } from '@stopaccess/state';
import {
  loadAppsRuntimeState,
  subscribeAppsRuntimeState,
} from '../../lib/appsRuntimeState';

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

function isRuleBlockingEnabled(rule: any, passes: Record<string, any> = {}) {
  if (rule?.desiredBlockingState === false || rule?.mode === 'allow') {
    return false;
  }

  const pkg = rule?.packageName || rule?.appName;
  if (pkg && passes[pkg]) {
    const pass = passes[pkg];
    if (pass && Number(pass.expiresAt) > Date.now()) {
      return false;
    }
  }

  return Boolean(
    rule?.blockedToday ||
      rule?.mode === 'block' ||
      rule?.mode === 'limit' ||
      rule?.desiredBlockingState,
  );
}

function getPassCountdown(pass: any) {
  const diff = Math.max(0, Number(pass?.expiresAt || 0) - Date.now());
  const mins = Math.floor(diff / 60000);

  if (mins >= 60) {
    return formatMinutes(mins);
  }

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

  const currentSiteBlocked = useMemo(() => {
    if (!currentDomain) {
      return false;
    }

    return rules.some((rule: any) => {
      const active = isRuleBlockingEnabled(rule, passes);
      return active && ruleMatchesDomain(rule, currentDomain);
    });
  }, [currentDomain, rules, passes]);

  const currentSitePass = useMemo(() => {
    if (!currentDomain) {
      return null;
    }
    const pass = passes[currentDomain];
    if (pass && Number(pass.expiresAt) > Date.now()) {
      return pass;
    }
    return null;
  }, [currentDomain, passes]);

  const query = searchTerm.trim().toLowerCase();

  const activeRules = useMemo(
    () =>
      rules
        .filter(
          (rule: any) =>
            (rule.type === 'service' || rule.type === 'domain' || !rule.type) &&
            (isRuleBlockingEnabled(rule, passes) ||
              passes[getDomainForRule(rule) || '']?.expiresAt > Date.now()),
        )
        .filter((rule: any) => {
          const isCurrentSite =
            currentDomain && ruleMatchesDomain(rule, currentDomain);
          // Only filter out the current site if it is being shown in the Current Site card.
          if (isCurrentSite && (!currentSiteBlocked || currentSitePass)) {
            return false;
          }

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
    [rules, query, currentDomain, passes, currentSiteBlocked, currentSitePass],
  );
  const recentActivity = useMemo(
    () =>
      Object.entries(usage)
        .map(([domain, entry]) => {
          const resolved = resolveTargetInput(domain);
          return {
            domain,
            time: (entry as any)?.time || 0,
            displayName: resolved.displayName,
          };
        })
        .filter(({ domain, time }) => {
          const alreadyBlockedOrActivePass = rules.some((rule: any) => {
            const active = isRuleBlockingEnabled(rule, passes);
            const domainForRule = getDomainForRule(rule);
            const pass = domainForRule ? passes[domainForRule] : null;
            const hasPass = pass && Number(pass.expiresAt) > Date.now();
            return (active || hasPass) && ruleMatchesDomain(rule, domain);
          });

          return (
            time > 60000 &&
            !alreadyBlockedOrActivePass &&
            domain !== currentDomain
          );
        })
        .sort((a, b) => b.time - a.time)
        .slice(0, 3),
    [rules, usage, currentDomain, passes],
  );

  const handleResumeBlock = async (target: string | any) => {
    const newPasses = { ...passes };

    if (typeof target === 'string') {
      delete newPasses[target];
    } else {
      const pkg = target.packageName || target.appName;
      const domain = getDomainForRule(target);
      if (pkg) {
        delete newPasses[pkg];
      }
      if (domain) {
        delete newPasses[domain];
      }
      if (currentDomain) {
        delete newPasses[currentDomain];
      }
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.TEMP_PASSES]: newPasses,
    });
    chrome.runtime.sendMessage({ action: 'manualSync' });
    toast.success('Block resumed');
    refresh();
  };

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
      title: 'Turn off for 40 mins?',
      body: `Verify your security to pause ${
        rule.appName || targetDomain
      } for the next 40 minutes.`,
    });

    if (confirmed) {
      const minutes = 40;
      const result = await appsController.grantTempPass(
        targetDomain,
        minutes,
        Number(rule.maxDailyPasses ?? 3),
        true, // Always skip limit for temporary passes from popup
      );

      if (result.ok) {
        // Reset streak for unblocking
        const { updateRule } = await import('@stopaccess/state/rules');
        const { extensionAdapter } = await import(
          '../../background/platformAdapter'
        );
        await updateRule(extensionAdapter, {
          ...(rule as any),
          streakDays: 0,
          streakStartedAt: Date.now(),
        });

        toast.success('Turned off for 40 minutes');
        refresh();
      } else {
        toast.error(result.error);
      }
    }
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

      {currentDomain && (!currentSiteBlocked || currentSitePass) ? (
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
              {currentSitePass ? (
                <div className="fg-flex fg-items-center fg-gap-1.5 fg-text-[14px] fg-font-bold fg-text-[var(--fg-accent)]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  {getPassCountdown(currentSitePass)}
                </div>
              ) : null}
              <div className="fg-text-[12px] fg-font-bold fg-text-[var(--muted)]">
                Current Site
              </div>
            </div>
          </div>
          <button
            className="fg-inline-flex fg-items-center fg-rounded-[8px] fg-bg-[var(--fg-accent)] fg-px-[12px] fg-py-[7px] fg-text-[13px] fg-font-bold fg-text-white hover:fg-opacity-90"
            onClick={() => {
              if (currentSitePass) {
                // If there's a pass on the current domain, we can resume by domain
                handleResumeBlock(currentDomain!);
              } else {
                handleAddDomain(currentDomain);
              }
            }}
            type="button"
          >
            {currentSitePass ? 'Resume' : 'Block'}
          </button>
        </div>
      ) : null}

      <div className="fg-px-[2px]">
        <div style={UI_TOKENS.TEXT.R.LABEL}>Active Blocks</div>
      </div>

      <div className="fg-flex fg-min-h-0 fg-flex-1 fg-flex-col fg-gap-2 fg-overflow-y-auto">
        {activeRules.map((rule: any) => {
          const primaryDomain = getDomainForRule(rule);
          const matchesCurrent = ruleMatchesDomain(rule, currentDomain);
          const pkg = rule.packageName || rule.appName;
          const activePass =
            (pkg && passes[pkg]) ||
            (primaryDomain && passes[primaryDomain]) ||
            (matchesCurrent && currentDomain && passes[currentDomain]);
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
                    {(() => {
                      const raw = (rule.appName || rule.packageName).slice(
                        0,
                        2,
                      );
                      return raw.length > 0
                        ? raw.charAt(0).toUpperCase() +
                            raw.slice(1).toLowerCase()
                        : '?';
                    })()}
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
                  isRuleBlockingEnabled(rule, passes) ? 'active' : ''
                }`}
                data-kind={rule.type || 'domain'}
                disabled={lockedDomains.includes(
                  (rule.packageName ?? '').toLowerCase(),
                )}
                onClick={async () => {
                  if (isTemporarilyOff) {
                    handleResumeBlock(rule);
                  } else {
                    handleTemporaryDisable(rule);
                  }
                }}
                type="button"
                title={isTemporarilyOff ? 'Resume Block' : 'Temporary disable'}
              >
                <span className="on-text">On</span>
                <span className="off-text">Off</span>
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
            <div className="fg-text-[12px] fg-font-bold fg-tracking-wider fg-text-[var(--muted)]">
              Recent Activity
            </div>
          </div>
          <div className="fg-flex fg-flex-col fg-gap-2">
            {recentActivity.map((item) => (
              <div
                key={item.domain}
                className="fg-panel-muted fg-flex fg-items-center fg-justify-between fg-gap-3 fg-rounded-[12px] fg-px-[14px] fg-py-[10px]"
              >
                <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-[10px]">
                  <img
                    src={getBrandLogoUrl(item.domain, 64)}
                    className="fg-h-5 fg-w-5 fg-rounded-[20%]"
                    alt=""
                  />
                  <div className="fg-truncate fg-text-[14px] fg-font-semibold fg-text-[var(--fg-text)]">
                    {item.displayName}
                  </div>
                </div>
                <button
                  className="fg-rounded-[6px] fg-bg-[var(--fg-surface-hover)] fg-px-[10px] fg-py-1.5 fg-text-[12px] fg-font-bold fg-text-white hover:fg-bg-[var(--fg-surface)]"
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
