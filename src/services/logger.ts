import { storage } from '../store/storage';

const LOG_KEY = 'app_system_logs';
const MAX_LOGS = 100;

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'sync';
  message: string;
  details?: string;
}

export function addLog(
  level: LogEntry['level'],
  message: string,
  details?: string,
) {
  const logs = getLogs();
  const newEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };

  const updatedLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
  storage.set(LOG_KEY, JSON.stringify(updatedLogs));

  // Also log to console for dev
  if (level === 'error') {
    console.error(`[${level}] ${message}`, details);
  } else {
    console.log(`[${level}] ${message}`, details);
  }
}

export function getLogs(): LogEntry[] {
  const raw = storage.getString(LOG_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

export function clearLogs() {
  storage.delete(LOG_KEY);
}
