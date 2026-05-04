/**
 * HTML/Text Escaping and Sanitization utilities
 */

export function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeForHeader(value: any): string {
  // ISO-8859-1 is 0-255. Characters > 255 will crash fetch() on some browsers (Windows/Chrome).
  // This commonly happens when users copy-paste API keys with invisible zero-width spaces or emojis.
  // eslint-disable-next-line no-control-regex
  return String(value ?? '').replace(/[^\x00-\xFF]/g, '');
}

/**
 * Deterministic stringify to ensure consistent hashing even if key order changes.
 */
export function stableStringify(obj: any): string {
  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(',')}}`;
}

/**
 * Format an app name to be consistent across the app:
 * - Capitalizes the first letter
 * - Handles potential package names by taking the last part if it looks like one
 */
export function formatAppName(name: string): string {
  if (!name) {
    return '';
  }

  // If it's a package name (contains multiple dots), take the last part
  let display = name;
  if (name.includes('.') && name.split('.').length > 2) {
    display = name.split('.').pop() || name;
  }

  // Capitalize first letter
  return display.charAt(0).toUpperCase() + display.slice(1);
}
