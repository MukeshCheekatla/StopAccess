import React, {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';

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

type RenderArgs<T extends string> = {
  container: HTMLElement;
  activeTab: T;
};

type PopupShellProps<T extends string> = {
  activeTab: T;
  onTabChange: (tab: T) => void;
  passHud?: ReactNode;
  renderContent: (args: RenderArgs<T>) => Promise<void>;
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
  renderContent: (args: RenderArgs<T>) => Promise<void>;
  status: ShellStatus;
  tabs: Array<ShellTab<T>>;
};

export function useMountedRenderer<T extends string>(
  activeTab: T,
  renderContent: (args: RenderArgs<T>) => Promise<void>,
) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const mountContent = async () => {
      const container = contentRef.current;
      if (!container) {
        return;
      }

      try {
        await renderContent({ container, activeTab });
      } catch (error) {
        if (cancelled) {
          return;
        }
        renderNavigationError(container, error);
      }
    };

    mountContent();

    return () => {
      cancelled = true;
    };
  }, [activeTab, renderContent]);

  return contentRef;
}

export function PopupShell<T extends string>({
  activeTab,
  onTabChange,
  passHud,
  renderContent,
  status,
  tabs,
  topbarRight,
}: PopupShellProps<T>) {
  const contentRef = useMountedRenderer(activeTab, renderContent);
  const statusClassName = useMemo(
    () => `status-badge ${resolveStatusClass(status.tone)}`,
    [status.tone],
  );

  return (
    <div className="main">
      {passHud}
      <div style={popupTopbarStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
            data-tab={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={popupNavButtonStyle}
            type="button"
          >
            {tab.label}
          </button>
        ))}
        <span className={statusClassName} style={popupStatusStyle}>
          {status.label}
        </span>
        {topbarRight}
      </div>
      <div id="mainContent" ref={contentRef} />
    </div>
  );
}

export function DashboardShell<T extends string>({
  activeTab,
  footer,
  hiddenSidebar = false,
  onTabChange,
  pageTitle,
  renderContent,
  status,
  tabs,
}: DashboardShellProps<T>) {
  const contentRef = useMountedRenderer(activeTab, renderContent);
  const statusClassName = useMemo(
    () => `status-pill ${resolveStatusClass(status.tone)}`,
    [status.tone],
  );

  return (
    <>
      <div
        className="sidebar"
        style={hiddenSidebar ? { display: 'none' } : undefined}
      >
        <div className="sidebar-brand" style={{ paddingBottom: '18px' }}>
          <div className="brand-mark">
            <div
              className="brand-logo"
              style={{
                fontWeight: 900,
                fontSize: '13px',
                letterSpacing: '-0.8px',
                width: '34px',
                height: '34px',
              }}
            >
              FG
            </div>
            <div>
              <div className="brand-name">FocusGate</div>
              <div className="brand-subtitle">Extension workspace</div>
            </div>
          </div>
        </div>
        <nav className="nav-list">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={dashboardNavButtonStyle}
              type="button"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="shell-footer">
          <div className="shell-footer-label">Workspace</div>
          <div className="shell-footer-value">{footer}</div>
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <div className="topbar-copy">
            <div className="topbar-eyebrow">FocusGate</div>
            <div id="pageTitle" className="page-label">
              {pageTitle}
            </div>
          </div>
          <div id="statusBadge" className={statusClassName}>
            {status.label}
          </div>
        </div>
        <div id="mainContent" ref={contentRef}>
          <div className="loader-spinner" />
        </div>
      </div>
    </>
  );
}

function resolveStatusClass(tone: ShellStatusTone) {
  if (tone === 'default') {
    return '';
  }
  return tone;
}

function renderNavigationError(container: HTMLElement, error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Unknown navigation error';

  container.innerHTML = `
    <div class="empty-state">
      <div style="font-size:14px; font-weight:900; color:var(--red);">SYNC FAIL</div>
      <div style="font-weight:800;">Navigation Error</div>
      <div style="font-size:11px; color:var(--muted);">${message}</div>
    </div>`;
}

const popupTopbarStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '12px 16px',
  background: 'rgba(0,0,0,0.1)',
  borderBottom: '1px solid var(--glass-border)',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
  scrollbarWidth: 'none',
};

const popupNavButtonStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--glass-border)',
  color: 'var(--muted)',
  fontSize: '10px',
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const popupStatusStyle: CSSProperties = {
  marginLeft: 'auto',
  fontSize: '10px',
  padding: '6px 10px',
};

const dashboardNavButtonStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
};
