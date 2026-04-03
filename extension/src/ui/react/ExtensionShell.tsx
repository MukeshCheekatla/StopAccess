import React, {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useState,
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

  const navListRef = useRef<HTMLElement>(null);
  const [indicatorData, setIndicatorData] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (navListRef.current) {
        const activeEl = navListRef.current.querySelector(
          '.nav-item.active',
        ) as HTMLElement;
        if (activeEl) {
          setIndicatorData({
            top: activeEl.offsetTop,
            height: activeEl.offsetHeight,
            opacity: 1,
          });
        }
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [activeTab]);

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
            </div>
          </div>
        </div>
        <div className="sidebar-status-row">
          <div className="sidebar-status-label">{pageTitle}</div>
          <div id="statusBadge" className={statusClassName}>
            {status.label}
          </div>
        </div>
        <nav
          className="nav-list"
          ref={navListRef}
          style={{ position: 'relative' }}
        >
          <div
            className="nav-snake-bg"
            style={{
              position: 'absolute',
              left: '8px',
              right: '8px',
              top: `${indicatorData.top}px`,
              height: `${indicatorData.height}px`,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              opacity: indicatorData.opacity,
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            className="nav-snake-bar"
            style={{
              position: 'absolute',
              left: '8px',
              top: `${indicatorData.top + indicatorData.height * 0.225}px`,
              height: `${indicatorData.height * 0.55}px`,
              width: '4px',
              background: '#fff',
              borderRadius: '0 4px 4px 0',
              opacity: indicatorData.opacity,
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                ...dashboardNavButtonStyle,
                zIndex: 2,
                position: 'relative',
              }}
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
