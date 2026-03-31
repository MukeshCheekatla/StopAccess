/**
 * @focusgate/core — Shared Utilities
 */

export function fmtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildExtensionPagePath(page: string): string {
  const safePage = String(page || '').replace(/^\/+/, '');
  const runtimeChrome = (
    globalThis as typeof globalThis & {
      chrome?: {
        runtime?: {
          getManifest?: () => {
            background?: {
              service_worker?: string;
            };
          };
        };
      };
    }
  ).chrome;

  try {
    const serviceWorkerPath = runtimeChrome?.runtime
      ?.getManifest?.()
      ?.background?.service_worker;

    if (typeof serviceWorkerPath === 'string' && serviceWorkerPath.startsWith('dist/')) {
      return `dist/${safePage}`;
    }
  } catch {
    // Fall back to dist-styleagnostic root path below.
  }

  return safePage;
}

export function buildDashboardTabPath(tab: string): string {
  return `${buildExtensionPagePath('dashboard.html')}?tab=${encodeURIComponent(tab)}`;
}
