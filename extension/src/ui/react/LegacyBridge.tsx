import React, { useEffect, useRef } from 'react';

/**
 * Bridge component to render legacy imperative UI functions within React.
 * This allows a gradual migration to 100% React/Tailwind.
 */
interface LegacyBridgeProps {
  renderFn: (container: HTMLElement) => Promise<void> | void;
}

export function LegacyBridge({ renderFn }: LegacyBridgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const lastFnRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      // If the function changed OR we haven't initialized this container yet
      if (lastFnRef.current !== renderFn || !initializedRef.current) {
        lastFnRef.current = renderFn;
        initializedRef.current = true;
        renderFn(containerRef.current);
      }
    }
  }, [renderFn]);

  return (
    <div
      ref={containerRef}
      className="fg-h-full fg-w-full fg-min-w-0"
      id="legacy-bridge-root"
    />
  );
}
