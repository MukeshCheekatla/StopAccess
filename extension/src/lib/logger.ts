/**
 * StopAccess Extension Logger
 * Tracks recent user actions and system events for the dashboard feed.
 */

export async function addActionLog(
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info',
) {
  const { fg_logs = [] } = (await chrome.storage.local.get(['fg_logs'])) as {
    fg_logs: any[];
  };
  const newLog = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    message,
    type,
  };

  const updatedLogs = [newLog, ...fg_logs].slice(0, 20);
  await chrome.storage.local.set({ fg_logs: updatedLogs });
}

export async function getActionLogs(): Promise<any[]> {
  const { fg_logs = [] } = (await chrome.storage.local.get(['fg_logs'])) as {
    fg_logs: any[];
  };
  return fg_logs;
}
