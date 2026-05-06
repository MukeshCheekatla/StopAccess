import React, { useEffect, useRef } from 'react';

/**
 * Bridge component to render legacy imperative UI functions within React.
 * This allows a gradual migration to 100% React/Tailwind.
 */
interface LegacyBridgeProps {
  renderFn: (container: HTMLElement) => Promise<void> | void;
  isVisible?: boolean;
  refreshKey?: any;
}

export function LegacyBridge({
  renderFn,
  isVisible = true,
  refreshKey,
}: LegacyBridgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const lastFnRef = useRef<any>(null);
  const lastVisibleRef = useRef<boolean>(false);
  const lastRefreshKeyRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      const fnChanged = lastFnRef.current !== renderFn;
      const becameVisible = isVisible && !lastVisibleRef.current;
      const refreshRequested =
        refreshKey !== undefined && lastRefreshKeyRef.current !== refreshKey;

      // If the function changed OR we haven't initialized OR it just became visible OR a refresh was requested
      if (
        fnChanged ||
        !initializedRef.current ||
        becameVisible ||
        refreshRequested
      ) {
        lastFnRef.current = renderFn;
        lastVisibleRef.current = isVisible;
        lastRefreshKeyRef.current = refreshKey;
        initializedRef.current = true;

        const execute = async (attempt = 1) => {
          try {
            const result = renderFn(containerRef.current!);
            if (result instanceof Promise) {
              await result;
            }
          } catch (err: any) {
            console.error('[LegacyBridge] Render failed:', err);
            if (attempt < 2) {
              console.log('[LegacyBridge] Retrying in 500ms...');
              setTimeout(() => execute(attempt + 1), 500);
            } else {
              if (containerRef.current) {
                containerRef.current.innerHTML = `
                  <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-h-full fg-p-10 fg-text-center">
                    <div class="fg-text-[var(--fg-red)] fg-mb-4">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h2 class="fg-text-lg fg-font-bold fg-mb-2">Unable to load page</h2>
                    <p class="fg-text-sm fg-text-[var(--fg-muted)] fg-mb-6">${
                      err.message || 'An unexpected error occurred'
                    }</p>
                    <button id="bridge-retry-btn" class="fg-px-6 fg-h-10 fg-bg-[var(--fg-white-wash)] fg-rounded-xl fg-text-xs fg-font-bold fg-transition-all hover:fg-bg-[var(--fg-surface-hover)]">
                      Try Again
                    </button>
                  </div>
                `;
                containerRef.current
                  .querySelector('#bridge-retry-btn')
                  ?.addEventListener('click', () => execute(1));
              }
            }
          }
        };

        execute();
      }
    }
  }, [renderFn, isVisible, refreshKey]);

  return (
    <div
      ref={containerRef}
      className="fg-h-full fg-w-full fg-min-w-0"
      id="legacy-bridge-root"
    />
  );
}
