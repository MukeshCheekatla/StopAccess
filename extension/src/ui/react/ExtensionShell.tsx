import React, { type ReactNode, useMemo } from 'react';

export type ShellTab<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

export type ShellStatusTone = 'active' | 'error' | 'muted' | 'default';

export type ShellStatus = {
  label: string;
  tone: ShellStatusTone;
};

type PopupShellProps<T extends string> = {
  activeTab: T;
  onTabChange: (tab: T) => void;
  passHud?: ReactNode;
  children: ReactNode;
  status: ShellStatus;
  tabs: Array<ShellTab<T>>;
  topbarRight?: ReactNode;
};

type DashboardShellProps<T extends string> = {
  activeTab: T;
  footer?: ReactNode;
  hiddenSidebar?: boolean;
  onTabChange: (tab: T) => void;
  pageTitle: string;
  children: ReactNode;
  status: ShellStatus;
  tabs: Array<ShellTab<T>>;
};

export function PopupShell<T extends string>({
  activeTab,
  onTabChange,
  passHud,
  children,
  status,
  tabs,
  topbarRight,
}: PopupShellProps<T>) {
  const statusClassName = useMemo(
    () => `fg-status-badge ${resolveStatusClass(status.tone)}`,
    [status.tone],
  );

  return (
    <div className="fg-main fg-shell-bg fg-flex fg-flex-col fg-h-screen fg-w-screen fg-overflow-hidden fg-text-[var(--text)]">
      {passHud}
      <div className="fg-flex fg-items-center fg-gap-2 fg-px-4 fg-py-3 fg-bg-[rgba(0,0,0,0.1)] fg-overflow-x-auto fg-no-scrollbar fg-z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`fg-appearance-none fg-border-0 fg-outline-none fg-shadow-none fg-px-3 fg-py-1.5 fg-rounded-lg fg-text-[10px] fg-font-extrabold fg-tracking-[0.08em] fg-whitespace-nowrap fg-transition-all fg-duration-150 active:fg-scale-95 ${
              activeTab === tab.id
                ? 'fg-bg-[var(--accent)] fg-text-white'
                : 'fg-bg-[rgba(255,255,255,0.03)] fg-text-[var(--muted)] hover:fg-text-white hover:fg-bg-[rgba(255,255,255,0.05)]'
            }`}
            data-tab={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}

        <div className="fg-ml-auto fg-flex fg-items-center fg-gap-3">
          <span
            className={`fg-inline-flex fg-items-center fg-gap-2 fg-px-3 fg-py-1.5 fg-rounded-full fg-text-[10px] fg-font-bold fg-whitespace-nowrap ${statusClassName}`}
          >
            <span
              className={`fg-w-1.5 fg-h-1.5 fg-rounded-full ${
                status.tone === 'active'
                  ? 'fg-bg-white fg-animate-pulse'
                  : status.tone === 'error'
                  ? 'fg-bg-[var(--red)]'
                  : 'fg-bg-[var(--muted)]'
              }`}
            />
            {status.label}
          </span>
          {topbarRight}
        </div>
      </div>
      <div className="fg-flex-1 fg-min-h-0 fg-overflow-y-auto fg-no-scrollbar">
        {children}
      </div>
    </div>
  );
}

export function DashboardShell<T extends string>({
  activeTab,
  footer,
  hiddenSidebar = false,
  onTabChange,
  pageTitle,
  children,
  status,
  tabs,
}: DashboardShellProps<T>) {
  const statusClassName = useMemo(
    () => `fg-status-pill ${resolveStatusClass(status.tone)}`,
    [status.tone],
  );

  return (
    <div className="fg-flex fg-h-screen fg-w-screen fg-overflow-hidden fg-shell-bg fg-text-[var(--text)]">
      <div
        className={`fg-sidebar fg-w-[272px] fg-bg-[rgba(24,24,27,0.95)] fg-border-r fg-border-[var(--glass-border)] fg-flex fg-flex-col fg-shrink-0 fg-p-[14px] ${
          hiddenSidebar ? 'fg-hidden' : ''
        }`}
      >
        <div className="fg-px-3 fg-pt-4 fg-pb-[22px] fg-flex fg-items-center fg-gap-[14px]">
          <img
            src="/assets/icon-48.png"
            alt="FocusGate"
            className="fg-w-9 fg-h-9 fg-rounded-[10px] fg-border fg-border-[rgba(255,255,255,0.08)] fg-object-contain"
          />
          <div>
            <div className="fg-text-[1.15rem] fg-font-bold fg-tracking-[-0.03em] fg-text-white">
              FocusGate
            </div>
            <div className="fg-mt-0.5 fg-text-[12px] fg-text-[var(--muted)]">
              Extension workspace
            </div>
          </div>
        </div>

        <div className="fg-flex fg-items-center fg-justify-between fg-gap-[10px] fg-px-3 fg-pb-4">
          <div className="fg-text-xs fg-font-bold fg-text-[var(--muted)] fg-tracking-[-0.01em]">
            {pageTitle}
          </div>
          <div
            id="statusBadge"
            className={`fg-inline-flex fg-items-center fg-gap-1.5 fg-px-[10px] fg-py-[4px] fg-rounded-full fg-text-[10px] fg-font-extrabold ${statusClassName}`}
          >
            {status.label}
          </div>
        </div>

        <nav className="fg-flex-1 fg-flex fg-flex-col fg-gap-1 fg-px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item fg-w-full fg-appearance-none fg-shadow-none fg-text-left fg-px-[0.95rem] fg-py-[0.875rem] fg-flex fg-items-center fg-gap-[0.875rem] fg-rounded-[12px] fg-border fg-text-[1rem] fg-font-semibold ${
                activeTab === tab.id
                  ? 'nav-item-active active fg-text-white fg-bg-[rgba(255,255,255,0.08)] fg-border-[rgba(255,255,255,0.08)]'
                  : 'fg-bg-transparent fg-border-transparent fg-text-[var(--muted)] hover:fg-text-white hover:fg-bg-[rgba(255,255,255,0.04)] hover:fg-border-[rgba(255,255,255,0.04)]'
              }`}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <span className="fg-w-5 fg-h-5 fg-flex-shrink-0 fg-flex fg-items-center fg-justify-center fg-opacity-[0.86]">
                {tab.icon}
              </span>
              <span className="fg-flex-1">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="fg-mt-auto fg-mx-2 fg-my-2 fg-px-4 fg-py-[14px] fg-rounded-[14px] fg-bg-[rgba(255,255,255,0.03)] fg-border fg-border-[rgba(255,255,255,0.05)]">
          <div className="fg-text-[11px] fg-text-[var(--muted)] fg-uppercase fg-tracking-[0.12em] fg-font-bold fg-mb-1">
            Workspace
          </div>
          <div className="fg-text-[13px] fg-font-bold fg-text-white">
            {footer}
          </div>
        </div>
      </div>
      <div className="fg-flex-1 fg-flex fg-flex-col fg-overflow-hidden">
        <div className="fg-flex-1 fg-overflow-y-auto">
          <div className="fg-shell-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

function resolveStatusClass(tone: ShellStatusTone) {
  if (tone === 'default') {
    return 'fg-bg-[rgba(255,255,255,0.05)] fg-text-[var(--muted)]';
  }
  if (tone === 'active') {
    return 'fg-bg-[var(--green)] fg-text-white';
  }
  if (tone === 'error') {
    return 'fg-bg-[var(--red)] fg-text-white';
  }
  return 'fg-bg-[rgba(255,255,255,0.02)] fg-text-[var(--muted)]';
}
