import { storage } from '../store/storage';
import { addLog } from '../services/logger';
import { getRules } from '../store/rules';

const BASE_URL = 'https://api.nextdns.io';
const CONFIG_KEY = 'nextdns_config';

export interface NextDNSConfig {
  apiKey: string;
  profileId: string;
}

export function getConfig(): NextDNSConfig | null {
  const raw = storage.getString(CONFIG_KEY);
  return raw ? (JSON.parse(raw) as NextDNSConfig) : null;
}

export function saveConfig(config: NextDNSConfig): void {
  storage.set(CONFIG_KEY, JSON.stringify(config));
  addLog('info', 'NextDNS configuration saved', `Profile ${config.profileId}`);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg?.apiKey && cfg?.profileId);
}

export async function testConnection(): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) {
    addLog('warn', 'NextDNS test skipped', 'No configuration found');
    return false;
  }
  try {
    addLog('sync', 'Testing NextDNS connection', `Profile ${cfg.profileId}`);
    const res = await fetch(`${BASE_URL}/profiles/${cfg.profileId}/denylist`, {
      headers: { 'X-Api-Key': cfg.apiKey },
    });
    addLog(
      res.ok ? 'info' : 'error',
      res.ok
        ? 'NextDNS connection test passed'
        : 'NextDNS connection test failed',
      `HTTP ${res.status}`,
    );
    return res.ok;
  } catch (e) {
    addLog(
      'error',
      'NextDNS connection test exception',
      e instanceof Error ? e.message : String(e),
    );
    return false;
  }
}

export async function checkDNSStatus(): Promise<boolean> {
  try {
    const res = await fetch('https://test.nextdns.io');
    const json = await res.json();
    const ok = json.status === 'ok';
    addLog(
      'info',
      `NextDNS Status Check: ${ok ? 'Protected' : 'Unprotected'}`,
      JSON.stringify(json),
    );
    return ok;
  } catch {
    return false;
  }
}

interface AppDomainMap {
  [key: string]: string[];
}

const DOMAIN_MAP: AppDomainMap = {};

function getDomainsForApp(appName: string): string[] {
  const lower = appName.toLowerCase();
  for (const [key, domains] of Object.entries(DOMAIN_MAP)) {
    if (lower.includes(key)) {
      return domains;
    }
  }
  return [];
}

export async function blockApps(names: string[]): Promise<void> {
  const cfg = getConfig();
  if (!cfg) {
    addLog('warn', 'NextDNS sync skipped', 'No configuration found');
    return;
  }

  const allDomains = names.flatMap((name) => getDomainsForApp(name));
  const uniqueDomains = Array.from(new Set(allDomains));

  if (uniqueDomains.length === 0) {
    addLog(
      'info',
      'NextDNS sync skipped',
      'No domains resolved from current app set',
    );
    return;
  }

  try {
    // 1. Fetch CURRENT denylist to avoid overwriting user's manual settings
    const currentRes = await fetch(
      `${BASE_URL}/profiles/${cfg.profileId}/denylist`,
      {
        headers: { 'X-Api-Key': cfg.apiKey },
      },
    );

    let existingIds: string[] = [];
    if (currentRes.ok) {
      const existingData = await currentRes.json();
      // NextDNS denylist API can return an array or an object with 'data'
      const dataArr = Array.isArray(existingData)
        ? existingData
        : existingData.data && Array.isArray(existingData.data)
        ? existingData.data
        : [];

      existingIds = dataArr.map((item: any) => item.id).filter(Boolean);
    }

    // 2. Combine app-based domains
    const appDomains = names.flatMap((name) => getDomainsForApp(name));

    // 3. Merged result
    const mergedDomains = Array.from(new Set([...existingIds, ...appDomains]));

    // 4. Transform for NextDNS structure (ID based)
    const items = mergedDomains.map((d) => ({ id: d, active: true }));

    addLog(
      'sync',
      `NextDNS Sync: ${mergedDomains.length} total domains (${appDomains.length} from app)`,
      appDomains.join(', '),
    );

    const res = await fetch(`${BASE_URL}/profiles/${cfg.profileId}/denylist`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': cfg.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(items),
    });

    if (res.ok) {
      addLog(
        'info',
        'NextDNS Sync Successful',
        `Active: ${mergedDomains.length} domains`,
      );
    } else {
      const err = await res.text();
      addLog('error', `NextDNS Sync Failed: ${res.status}`, err);
    }
  } catch (e) {
    addLog(
      'error',
      'NextDNS Network Exception',
      e instanceof Error ? e.message : String(e),
    );
  }
}

export async function blockApp(appName: string): Promise<void> {
  const currentRules = getRules();
  const blockedNames = currentRules
    .filter((r: any) => r.mode === 'block' || r.appName === appName)
    .map((r: any) => r.appName);
  await blockApps(blockedNames);
}

export async function unblockApp(appName: string): Promise<void> {
  const currentRules = getRules();
  const blockedNames = currentRules
    .filter((r: any) => r.mode === 'block' && r.appName !== appName)
    .map((r: any) => r.appName);
  await blockApps(blockedNames);
}

export async function unblockAll(): Promise<void> {
  const cfg = getConfig();
  if (!cfg) {
    addLog('warn', 'NextDNS clear skipped', 'No configuration found');
    return;
  }

  try {
    addLog('sync', 'Clearing all blocks');
    const res = await fetch(`${BASE_URL}/profiles/${cfg.profileId}/denylist`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': cfg.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([]),
    });

    if (res.ok) {
      addLog('info', 'NextDNS Clear Success');
    } else {
      const err = await res.text();
      addLog('error', `NextDNS Clear Failed: ${res.status}`, err);
    }
  } catch (e) {
    addLog(
      'error',
      'NextDNS Clear Exception',
      e instanceof Error ? e.message : String(e),
    );
  }
}
