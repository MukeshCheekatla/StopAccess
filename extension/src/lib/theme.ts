import { STORAGE_KEYS } from '@focusgate/state';
import { extensionAdapter as storage } from '../background/platformAdapter';

export async function applyTheme(manualTheme?: string) {
  const theme =
    manualTheme || (await storage.getString(STORAGE_KEYS.THEME)) || 'system';
  const doc = document.documentElement;

  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    doc.classList.toggle('dark-theme', isDark);
    doc.classList.toggle('light-theme', !isDark);
  } else {
    doc.classList.toggle('dark-theme', theme === 'dark');
    doc.classList.toggle('light-theme', theme === 'light');
  }
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
