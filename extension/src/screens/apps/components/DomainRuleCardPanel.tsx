import React from 'react';
import { getBrandLogoUrl, resolveIconDomain } from '../../../lib/ui';

interface DomainRuleCardProps {
  rule: any;
  lockedDomains: string[];
  onToggle: (pkg: string, kind: string, current: boolean) => void;
  onDelete: (pkg: string) => void;
  onLimitChange: (pkg: string, minutes: number) => void;
}

export const DomainRuleCard: React.FC<DomainRuleCardProps> = ({
  rule,
  lockedDomains,
  onToggle,
  onDelete,
  onLimitChange,
}) => {
  const domain = rule.customDomain || rule.packageName;
  const active = Boolean(
    rule.blockedToday || rule.mode === 'block' || rule.mode === 'limit',
  );
  const isLocked = lockedDomains.includes(rule.packageName);
  // For service rules, use the service ID to resolve; for domain rules use the domain directly.
  const iconKey = rule.type === 'service' ? rule.packageName || domain : domain;
  const iconDomain = resolveIconDomain(iconKey, rule.appName);
  const faviconUrl = getBrandLogoUrl(iconDomain, 128);
  const limitValue = rule.dailyLimitMinutes || 0;

  const limitOptions = [
    { value: 0, label: 'Instant Block' },
    { value: 5, label: '5m' },
    { value: 10, label: '10m' },
    { value: 15, label: '15m' },
    { value: 30, label: '30m' },
    { value: 45, label: '45m' },
    { value: 60, label: '1h' },
    { value: 90, label: '1.5h' },
    { value: 120, label: '2h' },
  ];

  return (
    <div
      className={`fg-flex fg-items-center fg-justify-between fg-gap-[6px] fg-rounded-[12px] fg-px-[14px] fg-py-3 ${
        active ? 'fg-bg-white/[0.05]' : 'fg-bg-white/[0.01]'
      }`}
    >
      <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-3">
        <div className="fg-relative fg-flex fg-h-7 fg-w-7 fg-shrink-0 fg-items-center fg-justify-center">
          <div className="fg-absolute fg-inset-0 fg-hidden fg-items-center fg-justify-center fg-text-[11px] fg-font-black fg-text-[var(--muted)]">
            {(rule.appName || domain).slice(0, 2).toUpperCase()}
          </div>
          <img
            src={faviconUrl}
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
          <div className="fg-truncate fg-text-[13px] fg-font-bold fg-text-[var(--fg-text)]">
            {rule.appName || domain}
          </div>
          <div className="fg-mt-0.5 fg-flex fg-items-center fg-gap-[6px]">
            <div className="fg-text-[9px] fg-font-semibold  fg-text-[var(--muted)]">
              Allowance:
            </div>
            <select
              className="fg-h-6 fg-cursor-pointer fg-appearance-none fg-rounded-[6px] fg-border-0 fg-bg-white/[0.05] fg-px-1.5 fg-text-[10px] fg-font-bold fg-text-[var(--fg-text)] fg-outline-none"
              value={limitValue}
              onChange={(e) =>
                onLimitChange(rule.packageName, parseInt(e.target.value, 10))
              }
            >
              {limitOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="fg-bg-zinc-900"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="fg-flex fg-shrink-0 fg-items-center fg-gap-[6px]">
        <button
          className={`fg-relative fg-h-8 fg-w-16 fg-overflow-hidden fg-rounded-full fg-border-0 ${
            active ? 'fg-bg-[var(--red)]' : 'fg-bg-white/[0.05]'
          }`}
          disabled={isLocked}
          onClick={() => onToggle(rule.packageName, 'domain', active)}
          type="button"
        >
          <span
            className={`fg-absolute fg-top-1/2 -fg-translate-y-1/2 fg-text-[11px] fg-font-extrabold ${
              active
                ? 'fg-left-[10px] fg-text-white'
                : 'fg-right-[10px] fg-text-[var(--muted)]'
            }`}
          >
            {active ? 'ON' : 'OFF'}
          </span>
          <span
            className={`fg-absolute fg-top-1 fg-h-6 fg-w-6 fg-rounded-full fg-bg-white ${
              active ? 'fg-translate-x-8' : ''
            }`}
            style={{
              left: '4px',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </button>

        <button
          className="fg-flex fg-h-6 fg-w-6 fg-items-center fg-justify-center fg-rounded-[6px] fg-border-0 fg-bg-white/[0.02] fg-text-[var(--muted)]"
          disabled={isLocked}
          onClick={() => onDelete(rule.packageName)}
          type="button"
          title={isLocked ? 'Locked by active session' : 'Delete rule'}
        >
          {isLocked ? (
            <span className="fg-text-[10px] fg-font-black">L</span>
          ) : (
            <svg
              className="fg-h-3 fg-w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
