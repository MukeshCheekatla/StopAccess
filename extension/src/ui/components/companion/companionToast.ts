/**
 * Helper to dispatch a toast notification to the Byte companion sign board.
 * This is used specifically in the dashboard/extension sidebar.
 */
export function dispatchCompanionToast(
  msg: string,
  options?: { icon?: string; mood?: string },
) {
  window.dispatchEvent(
    new CustomEvent('fg_companion_toast', {
      detail: {
        msg,
        icon: options?.icon,
        mood: options?.mood,
      },
    }),
  );
}
