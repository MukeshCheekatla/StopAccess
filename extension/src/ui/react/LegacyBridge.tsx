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
    let cancelled = false;

    if (containerRef.current) {
      const run = async () => {
        try {
          await renderFn(containerRef.current!);
        } catch (error) {
          if (!cancelled) {
            console.error('[LegacyBridge] Render failed:', error);
            containerRef.current!.innerHTML = `<div class="fg-p-8 fg-text-red-500 fg-text-xs">Bridge Fail: ${
              error instanceof Error ? error.message : 'Unknown error'
            }</div>`;
          }
        }
      };
      run();
    }

    return () => {
      cancelled = true;
    };
  }, [renderFn]);

  return <div ref={containerRef} className="fg-h-full fg-w-full fg-min-w-0" />;
}
