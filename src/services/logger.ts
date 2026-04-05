import { storage } from '../store/storageAdapter';

const LOG_KEY = 'app_system_logs';
const MAX_LOGS = 100;

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'update';
  message: string;
  details?: string;
}

// ANSI Escape Codes for colored Terminal output
const COLORS = {
  reset: '\u001b[0m',
  bright: '\u001b[1m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  gray: '\u001b[90m',
};

function shouldPrintToConsole(): boolean {
  return true; // Always print in DEV to help user
}

/**
 * Formats a prefix with colors for terminal readability
 */
function formatConsolePrefix(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-IN', {
    hour12: false,
  });

  let color = COLORS.gray;
  let levelTag = entry.level.toUpperCase();

  if (entry.level === 'error') {
    color = COLORS.red + COLORS.bright;
  }
  if (entry.level === 'warn') {
    color = COLORS.yellow;
  }
  if (entry.level === 'update') {
    color = COLORS.cyan;
  }
  if (entry.level === 'info') {
    color = COLORS.green;
  }

  return `${COLORS.gray}[${time}]${COLORS.reset} ${color}[${levelTag}]${COLORS.reset} ${entry.message}`;
}

/**
 * Masks sensitive keys but reveals enough to know *which* key is used.
 */
function redact(input: string | undefined): string {
  if (!input) {
    return '';
  }
  // Reveal first 3 and last 3 characters for easier debugging tracking
  return input.replace(/[a-zA-Z0-9]{10,}/g, (match) => {
    if (match.length < 8) {
      return '****';
    }
    return `${match.substring(0, 3)}...${match.substring(match.length - 3)}`;
  });
}

export function addLog(
  level: LogEntry['level'],
  message: string,
  details?: string,
) {
  const redactedMessage = redact(message);
  const redactedDetails = details ? redact(details) : undefined;

  const logs = getLogs();
  const newEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactedMessage,
    details: redactedDetails,
  };

  const updatedLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
  storage.set(LOG_KEY, JSON.stringify(updatedLogs));

  if (!shouldPrintToConsole()) {
    return;
  }

  const prefix = formatConsolePrefix(newEntry);

  if (level === 'error') {
    console.error(prefix);
    if (redactedDetails) {
      console.log(`${COLORS.gray}  DETAILS: ${redactedDetails}${COLORS.reset}`);
    }
  } else {
    console.log(prefix);
    if (redactedDetails && level !== 'info') {
      console.log(`${COLORS.gray}  DETAILS: ${redactedDetails}${COLORS.reset}`);
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
