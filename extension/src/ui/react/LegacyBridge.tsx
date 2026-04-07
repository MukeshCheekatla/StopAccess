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

  useEffect(() => {
    if (containerRef.current) {
      renderFn(containerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="fg-h-full fg-w-full fg-min-w-0" />;
}
