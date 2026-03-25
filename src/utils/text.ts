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
