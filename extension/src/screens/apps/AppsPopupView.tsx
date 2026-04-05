import React, { useEffect, useMemo, useState } from 'react';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { DomainRuleCard } from './components/DomainRuleCardPanel';
import { ServiceCardPanel } from './components/ServiceCardPanel';
import { extensionAdapter as storage } from '../../background/platformAdapter';
import { toast } from '../../lib/toast';
import { findServiceIdByDomain } from '@focusgate/core';

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

export const AppsPopupView: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [lockedDomains, setLockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageMap>({});

  const refresh = async () => {
    try {
      const [
        { rules: storedRules = '[]', usage: usageMap = {} },
        locked,
        activeDomain,
      ] = await Promise.all([
        chrome.storage.local.get(['rules', 'usage']),
        getLockedDomains(),
        getCurrentTabDomain(),
      ]);

      setRules(JSON.parse(storedRules as string));
      setUsage(usageMap as UsageMap);
      setLockedDomains(locked);
      setCurrentDomain(activeDomain);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
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
              rule.mode === 'limit'),
        )
        .filter((rule: any) => {
          const name = (rule.appName || '').toLowerCase();
          const domain = (
            rule.customDomain ||
            rule.packageName ||
            ''
          ).toLowerCase();
          return !query || name.includes(query) || domain.includes(query);
        }),
    [rules, query],
  );

  const serviceRules = activeRules.filter(
    (rule: any) => rule.type === 'service',
  );
  const domainRules = activeRules.filter(
    (rule: any) => rule.type === 'domain' || !rule.type,
  );

  const currentSiteBlocked = useMemo(() => {
    if (!currentDomain) {
      return false;
    }

    return rules.some((rule: any) => {
      const ruleDomain = rule.customDomain || rule.packageName;
      const active = Boolean(
        rule.blockedToday || rule.mode === 'block' || rule.mode === 'limit',
      );

      if (!active) {
        return false;
      }

      if (
        ruleDomain === currentDomain ||
        (ruleDomain && currentDomain.endsWith(`.${ruleDomain}`))
      ) {
        return true;
      }

      if (rule.type === 'service') {
        return findServiceIdByDomain(currentDomain) === rule.packageName;
      }

      return false;
    });
  }, [currentDomain, rules]);

  const recentActivity = useMemo(
    () =>
      Object.entries(usage)
        .map(([domain, entry]) => ({ domain, time: entry?.time || 0 }))
        .filter(({ domain, time }) => {
          const alreadyBlocked = rules.some((rule: any) => {
            const ruleDomain = rule.customDomain || rule.packageName;
            const active = Boolean(
              rule.blockedToday ||
                rule.mode === 'block' ||
                rule.mode === 'limit',
            );

            if (!active) {
              return false;
            }

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

  const handleLimitChange = async (pkg: string, minutes: number) => {
    const rule = rules.find((entry: any) => entry.packageName === pkg);
    if (!rule) {
      return;
    }

    const { updateRule } = await import('@focusgate/state/rules');
    await updateRule(storage, {
      ...rule,
      dailyLimitMinutes: minutes,
      mode: minutes > 0 ? 'limit' : 'block',
      updatedAt: Date.now(),
    });
    chrome.runtime.sendMessage({ action: 'manualSync' });
    refresh();
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
      <div className="fg-flex fg-items-center fg-justify-between fg-px-[2px]">
        <div className="fg-text-[11px] fg-font-extrabold fg-uppercase fg-tracking-[1px] fg-text-[var(--muted)]">
          BLOCK LIST
        </div>
        <div className="fg-inline-flex fg-items-center fg-gap-2 fg-text-[10px] fg-font-black fg-text-[var(--muted)]">
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
            <div className="fg-flex fg-h-8 fg-w-8 fg-items-center fg-justify-center fg-rounded-[8px] fg-bg-white/[0.02]">
              <img
                src={`https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64`}
                className="fg-h-5 fg-w-5 fg-rounded-[4px]"
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
        {serviceRules.map((rule: any) => (
          <ServiceCardPanel
            key={rule.packageName}
            service={{
              id: rule.packageName,
              name: rule.appName || rule.packageName,
              active: Boolean(
                rule.blockedToday ||
                  rule.mode === 'block' ||
                  rule.mode === 'limit',
              ),
            }}
            isLocked={lockedDomains.includes(rule.packageName)}
            onDelete={() =>
              appsController.removeRule(rule.packageName, rules).then(refresh)
            }
            onToggle={() =>
              appsController
                .toggleRule(
                  'service',
                  rule.packageName,
                  rule.appName || rule.packageName,
                  !(
                    rule.blockedToday ||
                    rule.mode === 'block' ||
                    rule.mode === 'limit'
                  ),
                  rules,
                )
                .then(refresh)
            }
          />
        ))}

        {domainRules.map((rule: any) => (
          <DomainRuleCard
            key={rule.packageName}
            rule={rule}
            lockedDomains={lockedDomains}
            onDelete={(pkg) =>
              appsController.removeRule(pkg, rules).then(refresh)
            }
            onToggle={(pkg, kind, current) =>
              appsController
                .toggleRule(
                  kind as any,
                  pkg,
                  rule.appName || pkg,
                  !current,
                  rules,
                )
                .then(refresh)
            }
            onLimitChange={handleLimitChange}
          />
        ))}

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
                    className="fg-h-4 fg-w-4"
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
