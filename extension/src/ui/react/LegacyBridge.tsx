import React, { useEffect, useRef } from 'react';

/**
 * Bridge component to render legacy imperative UI functions within React.
 * This allows a gradual migration to 100% React/Tailwind.
 */
interface LegacyBridgeProps {
  renderFn: (container: HTMLElement) => Promise<void> | void;
  isVisible?: boolean;
}

export function LegacyBridge({
  renderFn,
  isVisible = true,
}: LegacyBridgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const lastFnRef = useRef<any>(null);
  const lastVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    if (containerRef.current) {
      const fnChanged = lastFnRef.current !== renderFn;
      const becameVisible = isVisible && !lastVisibleRef.current;

      // If the function changed OR we haven't initialized this container yet OR it just became visible
      if (fnChanged || !initializedRef.current || becameVisible) {
        lastFnRef.current = renderFn;
        lastVisibleRef.current = isVisible;
        initializedRef.current = true;
        renderFn(containerRef.current);
      }
    }
  }, [renderFn, isVisible]);

  return (
    <div
      ref={containerRef}
      className="fg-h-full fg-w-full fg-min-w-0"
      id="legacy-bridge-root"
    />
  );
}
