import { storage } from '../store/storage';

const LOG_KEY = 'app_system_logs';
const MAX_LOGS = 100;

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'sync';
  message: string;
  details?: string;
}

function formatConsolePrefix(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-IN', {
    hour12: false,
  });
  return `[FocusGate][${time}][${entry.level.toUpperCase()}] ${entry.message}`;
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

  const prefix = formatConsolePrefix(newEntry);
  if (level === 'error') {
    if (details) {
      console.error(prefix, details);
    } else {
      console.error(prefix);
    }
  } else {
    if (details) {
      console.log(prefix, details);
    } else {
      console.log(prefix);
    }
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
