import { NativeModules, Platform } from 'react-native';

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconBase64: string;
}

const { InstalledApps } = NativeModules;

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (Platform.OS !== 'android') {
    return [];
  }
  try {
    return await InstalledApps.getInstalledApps();
  } catch (err) {
    console.error('[InstalledApps] Error fetching apps:', err);
    return [];
  }
}

export async function getIconByPackage(
  packageName: string,
): Promise<string | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  try {
    return await InstalledApps.getIconForPackage(packageName);
  } catch (err) {
    console.warn(`[InstalledApps] Failed to fetch icon for ${packageName}`);
    return null;
  }
}
