/**
 * domainMap.ts -- Maps app names/packages to their primary blocking domain.
 *
 * One domain per app. NextDNS manages the actual block via the denylist
 * toggle (active: true = blocked, active: false = allowed).
 */

export interface AppDomainMap {
  appName: string;
  packageName: string;
  domain: string; // single primary domain
}

export const DOMAIN_MAP: AppDomainMap[] = [];

export function getDomain(appName: string): string | null {
  const entry = DOMAIN_MAP.find(
    (e) => e.appName.toLowerCase() === appName.toLowerCase(),
  );
  return entry?.domain ?? null;
}

export function getByPackage(packageName: string): AppDomainMap | undefined {
  return DOMAIN_MAP.find((e) => e.packageName === packageName);
}

export function getAllAppNames(): string[] {
  return DOMAIN_MAP.map((e) => e.appName);
}
