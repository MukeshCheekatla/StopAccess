import React, { type ReactNode, useMemo } from 'react';
import { UI_TOKENS } from '../../lib/ui';

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
  hiddenSidebar?: boolean;
  onTabChange: (tab: T) => void;
  children: ReactNode;
  status: ShellStatus;
  tabs: Array<ShellTab<T>>;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
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
    <div className="fg-main fg-shell-bg fg-flex fg-flex-col fg-h-screen fg-w-full fg-overflow-hidden fg-text-[var(--text)]">
      {passHud}
      <div className="fg-flex fg-items-center fg-gap-2 fg-px-4 fg-py-3 fg-bg-[rgba(0,0,0,0.1)] fg-overflow-x-auto fg-no-scrollbar fg-z-50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          // Omit color from style to let tailwind classes handle it (crucial for theme flipping)
          const styleWithoutColor = { ...UI_TOKENS.TEXT.R.LABEL };
          delete (styleWithoutColor as any).color;

          return (
            <button
              key={tab.id}
              className={`fg-appearance-none fg-border-0 fg-outline-none fg-shadow-none fg-px-3 fg-py-1.5 fg-rounded-lg fg-whitespace-nowrap fg-transition-all fg-duration-150 active:fg-scale-95 ${
                isActive
                  ? 'fg-bg-[var(--accent)]'
                  : 'fg-bg-[var(--fg-glass-bg)] fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-surface)]'
              }`}
              style={
                {
                  ...styleWithoutColor,
                  color: isActive ? '#ffffff' : undefined,
                } as any
              }
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}

        <div className="fg-ml-auto fg-flex fg-items-center fg-gap-3">
          <span
            className={`fg-inline-flex fg-items-center fg-gap-2 fg-px-3 fg-py-1.5 fg-rounded-full fg-whitespace-nowrap ${statusClassName}`}
            style={{
              ...UI_TOKENS.TEXT.R.LABEL,
              color:
                status.tone === 'active' || status.tone === 'error'
                  ? '#ffffff'
                  : undefined,
            }}
          >
            <span
              className={`fg-w-1.5 fg-h-1.5 fg-rounded-full ${
                status.tone === 'active'
                  ? 'fg-bg-white fg-animate-pulse'
                  : status.tone === 'error'
                  ? 'fg-bg-white'
                  : 'fg-bg-[var(--fg-muted)]'
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
  hiddenSidebar = false,
  onTabChange,
  children,
  status,
  tabs,
  theme = 'system',
  onThemeChange,
}: DashboardShellProps<T>) {
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    // Suppress transitions for the first 100ms to allow theme to settle without "sweeping" animations
    const timer = setTimeout(() => setIsInitializing(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const statusClassName = useMemo(
    () => `fg-status-pill ${resolveStatusClass(status.tone)}`,
    [status.tone],
  );

  return (
    <div
      className={`fg-flex fg-h-screen fg-w-full fg-overflow-hidden fg-shell-bg fg-text-[var(--fg-text)] ${
        isInitializing ? 'suppress-transitions' : ''
      }`}
    >
      <div
        className={`fg-sidebar fg-w-[272px] fg-bg-[var(--fg-sidebar-bg)] fg-border-r fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-shrink-0 fg-p-[14px] ${
          hiddenSidebar ? 'fg-hidden' : ''
        }`}
      >
        <div className="fg-px-3 fg-pt-4 fg-pb-[22px] fg-flex fg-items-center fg-gap-[14px]">
          <img
            src="/assets/icon-48.png"
            alt="StopAccess"
            className="fg-w-9 fg-h-9 fg-rounded-[10px] fg-border fg-border-[var(--fg-glass-border)] fg-object-contain"
          />
          <div className="fg-flex fg-items-baseline fg-gap-3">
            <div
              style={{
                ...UI_TOKENS.TEXT.R.HEADING,
                fontSize: '1.15rem',
                letterSpacing: '-0.03em',
              }}
            >
              StopAccess
            </div>
            <div
              id="statusBadge"
              className={`fg-inline-flex fg-items-center fg-gap-1.5 fg-px-[10px] fg-py-[3px] fg-rounded-full ${statusClassName}`}
              style={UI_TOKENS.TEXT.R.BADGE}
            >
              {status.label}
            </div>
          </div>
        </div>

        <nav className="fg-flex-1 fg-flex fg-flex-col fg-gap-1 fg-px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item fg-w-full fg-appearance-none fg-text-left fg-px-[0.95rem] fg-py-[0.875rem] fg-flex fg-items-center fg-gap-[0.875rem] fg-rounded-[12px] fg-border fg-text-[1rem] fg-font-semibold fg-transition-all ${
                activeTab === tab.id
                  ? 'nav-item-active active fg-text-[var(--fg-text)] fg-bg-[var(--fg-nav-active)] fg-border-[var(--fg-nav-border)] fg-shadow-sm'
                  : 'fg-shadow-none fg-bg-transparent fg-border-transparent fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-nav-active)] hover:fg-border-[var(--fg-nav-border)]'
              }`}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <span className="fg-w-5 fg-h-5 fg-flex-shrink-0 fg-flex fg-items-center fg-justify-center fg-opacity-[0.86]">
                {tab.icon}
              </span>
              <span
                className="fg-flex-1"
                style={{
                  ...UI_TOKENS.TEXT.R.CARD_TITLE,
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'inherit',
                }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="fg-px-2 fg-mb-4">
          <div className="fg-px-2 fg-mb-2">
            <div
              style={{
                ...UI_TOKENS.TEXT.R.LABEL,
                fontSize: '10px',
                letterSpacing: '0.08em',
                opacity: 0.6,
              }}
            >
              THEME
            </div>
          </div>
          <div
            className="fg-relative fg-flex fg-items-center fg-rounded-[14px] fg-p-1 fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-h-[42px]"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--fg-sidebar-bg) 90%, black 10%)',
            }}
          >
            {/* Animated Slider Pill */}
            <div
              className="fg-absolute fg-h-[32px] fg-shadow-[0_2px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] fg-rounded-[10px] fg-transition-all fg-duration-300 fg-ease-out fg-z-[1] fg-border fg-border-[var(--fg-glass-border)]"
              style={{
                width: 'calc((100% - 8px) / 3)',
                left:
                  theme === 'light'
                    ? '4px'
                    : theme === 'system'
                    ? 'calc(4px + (100% - 8px) / 3)'
                    : 'calc(4px + 2 * (100% - 8px) / 3)',
                backgroundColor:
                  theme === 'light' ? '#ffffff' : 'var(--fg-surface)',
              }}
            />

            <button
              onClick={() => onThemeChange?.('light')}
              className={`fg-relative fg-z-[2] fg-flex-1 fg-flex fg-items-center fg-justify-center fg-h-full fg-rounded-[10px] fg-transition-colors fg-duration-300 ${
                theme === 'light'
                  ? 'fg-text-black'
                  : 'fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]'
              }`}
              title="Light Mode"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.07" x2="5.64" y2="17.66" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </button>

            <button
              onClick={() => onThemeChange?.('system')}
              className={`fg-relative fg-z-[2] fg-flex-1 fg-flex fg-items-center fg-justify-center fg-h-full fg-rounded-[10px] fg-transition-colors fg-duration-300 ${
                theme === 'system'
                  ? 'fg-text-[var(--fg-text)]'
                  : 'fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]'
              }`}
              title="System Default"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </button>

            <button
              onClick={() => onThemeChange?.('dark')}
              className={`fg-relative fg-z-[2] fg-flex-1 fg-flex fg-items-center fg-justify-center fg-h-full fg-rounded-[10px] fg-transition-colors fg-duration-300 ${
                theme === 'dark'
                  ? 'fg-text-[var(--fg-text)]'
                  : 'fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]'
              }`}
              title="Dark Mode"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="fg-flex-1 fg-flex fg-flex-col fg-overflow-hidden">
        <div className="fg-flex-1 fg-overflow-y-auto fg-overflow-x-hidden">
          {hiddenSidebar ? (
            children
          ) : (
            <div
              className="fg-shell-content"
              style={
                activeTab === 'apps'
                  ? {
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      height: '100%',
                      paddingBottom: 0,
                      overflowY: 'clip',
                    }
                  : undefined
              }
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function resolveStatusClass(tone: ShellStatusTone) {
  if (tone === 'default') {
    return 'fg-bg-[var(--fg-glass-bg)] fg-text-[var(--fg-muted)]';
  }
  if (tone === 'active') {
    return 'fg-bg-[var(--fg-green)]';
  }
  if (tone === 'error') {
    return 'fg-bg-[var(--fg-red)]';
  }
  return 'fg-bg-[var(--fg-glass-bg)] fg-text-[var(--fg-muted)]';
}
