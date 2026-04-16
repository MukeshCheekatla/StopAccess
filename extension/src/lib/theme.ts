import { STORAGE_KEYS } from '@stopaccess/state';
import { extensionAdapter as storage } from '../background/platformAdapter';

export async function applyTheme(manualTheme?: string) {
  const theme =
    manualTheme || (await storage.getString(STORAGE_KEYS.THEME)) || 'system';
  const doc = document.documentElement;

  let resolved: 'dark' | 'light';
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolved = isDark ? 'dark' : 'light';
  } else {
    resolved = theme === 'dark' ? 'dark' : 'light';
  }

  doc.classList.toggle('dark-theme', resolved === 'dark');
  doc.classList.toggle('light-theme', resolved === 'light');

  // Sync with localStorage for synchronous head-script access (prevents flash)
  localStorage.setItem('sa_theme', theme);
}

export function setupThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = async () => {
    const currentTheme = await storage.getString(STORAGE_KEYS.THEME);
    if (!currentTheme || currentTheme === 'system') {
      applyTheme('system');
    }
  };

  mediaQuery.addEventListener('change', handleSystemChange);

  // Listen for internal messages (from SettingsPage)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'themeChanged') {
      applyTheme(msg.theme);
    }
  });

  return () => mediaQuery.removeEventListener('change', handleSystemChange);
}
