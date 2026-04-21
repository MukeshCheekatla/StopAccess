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
