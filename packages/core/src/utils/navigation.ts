/**
 * @focusgate/core — Navigation Helpers
 */

/**
 * Maps a dashboard-relative path to its extension-root equivalent.
 * Used for intra-extension navigation between Dashboard, Apps, etc.
 */
export function buildDashboardTabPath(tabId: string): string {
  return `dashboard.html#${tabId}`;
}

export function buildExtensionPagePath(pageName: string): string {
  return pageName;
}
