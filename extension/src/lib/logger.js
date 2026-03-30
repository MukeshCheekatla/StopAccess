/**
 * FocusGate Extension Logger
 * Tracks recent user actions and system events for the dashboard feed.
 */

export async function addActionLog(message, type = 'info') {
  const { fg_logs = [] } = await chrome.storage.local.get(['fg_logs']);
  const newLog = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    message,
    type, // 'info', 'success', 'error', 'warning'
  };

  const updatedLogs = [newLog, ...fg_logs].slice(0, 20);
  await chrome.storage.local.set({ fg_logs: updatedLogs });
}

export async function getActionLogs() {
  const { fg_logs = [] } = await chrome.storage.local.get(['fg_logs']);
  return fg_logs;
}
