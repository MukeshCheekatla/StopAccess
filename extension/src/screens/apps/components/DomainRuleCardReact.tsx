import React from 'react';
import { resolveIconUrl as getDomainIcon } from '@focusgate/core';

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
  const active = rule.blockedToday;
  const limitValue = rule.dailyLimitMinutes || 0;
  const usedValue = Math.round(rule.usedMinutesToday || 0);
  const extensionsUsed = rule.extensionCountToday || 0;
  const isLocked = lockedDomains.includes(rule.packageName);

  const limitOptions = [
    { value: 0, label: 'No Limit' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];

  const isCustomLimit =
    limitValue > 0 && !limitOptions.some((o) => o.value === limitValue);

  const pct =
    limitValue > 0
      ? Math.min(100, Math.round((usedValue / limitValue) * 100))
      : 0;
  const barColor =
    pct >= 100 ? 'var(--red)' : pct >= 75 ? 'var(--yellow)' : 'var(--accent)';

  return (
    <div
      className="app-card rule-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <img src={getDomainIcon(domain)} alt="" className="app-icon" />
          <div className="app-info" style={{ minWidth: 0 }}>
            <div
              className="stat-val"
              style={{
                fontSize: '15px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {rule.appName}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                marginTop: '2px',
              }}
            >
              <div className="stat-lbl">{domain}</div>
              <div
                style={{
                  fontSize: '8px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background:
                    rule.scope === 'profile'
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,0.05)',
                  color: rule.scope === 'profile' ? '#fff' : 'var(--muted)',
                  fontWeight: 800,
                  border: `1px solid ${
                    rule.scope === 'profile'
                      ? 'transparent'
                      : 'rgba(255,255,255,0.1)'
                  }`,
                }}
              >
                {rule.scope === 'profile' ? 'NEXTDNS' : 'LOCAL'}
              </div>
              {active && (
                <div
                  style={{
                    fontSize: '8px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255,71,87,0.1)',
                    color: 'var(--red)',
                    fontWeight: 800,
                    border: '1px solid rgba(255,71,87,0.2)',
                  }}
                >
                  BLOCKED
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          className="app-controls"
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <button
            className={`toggle-switch-btn ${active ? 'active' : ''}`}
            disabled={isLocked}
            onClick={() => onToggle(rule.packageName, 'domain', active)}
          >
            <span className="on-text">ON</span>
            <span className="off-text">OFF</span>
          </button>
          <button
            className="btn-outline delete-rule"
            disabled={isLocked}
            style={{ padding: '6px', opacity: isLocked ? 0.3 : 1 }}
            onClick={() => onDelete(rule.packageName)}
          >
            {isLocked ? '🔒' : 'Delete'}
          </button>
        </div>
      </div>

      <div
        style={{
          paddingTop: '10px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              width="14"
              height="14"
              style={{ color: 'var(--muted)' }}
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M12 7v5l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Daily Limit
            </span>
          </div>
          <select
            className="input edit-limit-select"
            style={{
              width: 'auto',
              minWidth: '120px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 700,
              textAlign: 'right',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'var(--text)',
              appearance: 'auto',
            }}
            value={limitValue}
            onChange={(e) =>
              onLimitChange(rule.packageName, parseInt(e.target.value, 10))
            }
          >
            {limitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {isCustomLimit && (
              <option value={limitValue}>{limitValue} min</option>
            )}
          </select>
        </div>
        {limitValue > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {usedValue}m used
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: pct >= 100 ? 'var(--red)' : 'var(--muted)',
                  fontWeight: 700,
                }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}
        {extensionsUsed > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(108, 71, 255, 0.1)',
                border: '1px solid rgba(108, 71, 255, 0.2)',
                color: '#9f8cff',
                fontWeight: 800,
              }}
            >
              {extensionsUsed}/5 extensions used today
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
