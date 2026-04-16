import React from 'react';
import { getBrandLogoUrl, resolveIconDomain } from '../../../lib/ui';

interface ServiceCardProps {
  service: any;
  isLocked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const ServiceCardPanel: React.FC<ServiceCardProps> = ({
  service,
  isLocked,
  onToggle,
  onDelete,
}) => {
  const active = service.active ?? false;
  const iconDomain = resolveIconDomain(service.id, service.name);
  const faviconUrl = getBrandLogoUrl(iconDomain, 128);

  return (
    <div
      className={`fg-flex fg-items-center fg-justify-between fg-gap-[6px] fg-rounded-[12px] fg-px-[14px] fg-py-3 ${
        active ? 'fg-bg-white/[0.05]' : 'fg-bg-white/[0.01]'
      }`}
    >
      <div className="fg-flex fg-min-w-0 fg-flex-1 fg-items-center fg-gap-3">
        <div className="fg-relative fg-flex fg-h-7 fg-w-7 fg-shrink-0 fg-items-center fg-justify-center">
          <div className="fg-absolute fg-inset-0 fg-hidden fg-items-center fg-justify-center fg-text-[11px] fg-font-black fg-text-[var(--muted)]">
            {(service.name || service.id).slice(0, 2).toUpperCase()}
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
            {service.name}
          </div>
          <div className="fg-mt-0.5 fg-flex fg-items-center fg-gap-[6px]">
            <div className="fg-text-[9px] fg-font-semibold  fg-text-[var(--muted)]">
              Allowance:
            </div>
            <select
              className="fg-h-6 fg-rounded-[6px] fg-border-0 fg-bg-white/[0.05] fg-px-1.5 fg-text-[10px] fg-font-bold fg-text-[var(--fg-text)]"
              value={0}
              disabled
            >
              <option>Instant Block</option>
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
          onClick={onToggle}
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
          onClick={onDelete}
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
