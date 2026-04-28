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
        renderFn(containerRef.current);
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
