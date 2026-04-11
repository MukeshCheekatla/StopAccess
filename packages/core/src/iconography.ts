/**
 * @stopaccess/core — Iconography Engine
 * Resolves brands and domains to high-quality assets.
 */
import { BrandDefinition, ServiceIconResult } from '@stopaccess/types';
import { BRAND_DATA } from './iconography.data';

export const SERVICE_URLS = {
  NEXTDNS_LOGIN: 'https://my.nextdns.io/login',
  SIMPLE_ICONS_CDN: 'https://cdn.simpleicons.org',
  GOOGLE_FAVICON_API: 'https://www.google.com/s2/favicons',
  GOOGLE_FAVICON_V2_API: 'https://t1.gstatic.com/faviconV2',
  GOOGLE_FONTS_URL:
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
};

const DOMAIN_TO_BRAND: Record<string, string> = {};
for (const [key, def] of Object.entries(BRAND_DATA)) {
  if (def.domain) {
    DOMAIN_TO_BRAND[def.domain] = key;
  }
}

// Research-backed high-resolution overrides for privacy providers and common blocklists
const GLOBAL_ASSET_OVERRIDES: Record<string, string> = {
  'oisd.nl': 'https://oisd.nl/favicon.ico',
  'easylist.to': 'https://avatars.githubusercontent.com/u/1018861?s=64&v=4',
  'adguard.com': 'https://cdn.adguard.com/public/Adguard/logos/favicon.ico',
  'abpvn.com': 'https://abpvn.com/icon.png',
  'hblock.molinero.dev': 'https://icon.horse/icon/hblock.molinero.dev',
  'github.com': 'https://unavatar.io/github',
  'gitlab.com': 'https://unavatar.io/gitlab',
};

const COMMON_TLDS = new Set([
  'com',
  'net',
  'org',
  'edu',
  'gov',
  'io',
  'co',
  'tv',
  'app',
  'dev',
]);

const SKIP_WORDS = new Set([
  'login',
  'auth',
  'signin',
  'signup',
  'sso',
  'api',
  'app',
  'www',
  'mail',
  'smtp',
  'cdn',
  'static',
  'admin',
  'portal',
  'my',
  'account',
  'dashboard',
]);

function normalizeKey(value = ''): string {
  return String(value)
    .toLowerCase()
    .replace(/[+]/g, 'plus')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function getBrandAssetUrls(match: BrandDefinition) {
  const fallbackUrl = match.domain ? getFaviconUrl(match.domain) : null;
  const primaryUrl =
    match.source === 'favicon'
      ? fallbackUrl
      : match.slug
      ? `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${match.slug}/${(
          match.color || '#FFFFFF'
        ).replace('#', '')}`
      : fallbackUrl;

  return {
    primaryUrl,
    fallbackUrl,
  };
}

/**
 * Resolves a NextDNS service/app ID to a high-fidelity vibrant icon asset.
 */
export function resolveServiceIcon(service: {
  id?: string;
  name?: string;
}): ServiceIconResult {
  const keys = [
    service?.id,
    service?.name,
    ...(service?.id?.includes('.') ? service.id.split('.') : []),
    ...(service?.name?.includes('.') ? service.name.split('.') : []),
  ].filter(Boolean) as string[];

  // 1. BRAND_DATA (Verified Assets)
  for (const k of keys) {
    const norm = normalizeKey(k);
    if (!norm || norm.length <= 2) {
      continue;
    }

    const brandKey = DOMAIN_TO_BRAND[k] || norm;
    const match = BRAND_DATA[brandKey];
    if (match) {
      const { primaryUrl, fallbackUrl } = getBrandAssetUrls(match);
      if (!primaryUrl && !fallbackUrl) {
        continue;
      }

      return {
        kind: 'remote',
        url: (primaryUrl || fallbackUrl) as string,
        fallbackUrl,
        domain: match.domain || null,
        accent: match.color || '#3b82f6',
        label: String(service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  // 2. Resolve via domain chain
  const domainCandidate =
    service?.id?.includes('.') && service.id.length > 4
      ? service.id
      : service?.name?.includes('.') && service.name.length > 4
      ? service.name
      : null;

  if (domainCandidate) {
    const rootDomain = getRootDomain(domainCandidate);
    const resolvedUrl = resolveFaviconUrl(domainCandidate);

    return {
      kind: 'remote',
      url: resolvedUrl,
      fallbackUrl: getFaviconUrl(rootDomain),
      domain: rootDomain,
      accent: '#3b82f6',
      label: domainCandidate[0].toUpperCase(),
    };
  }

  // 3. Fallback to Simple Icons Slug
  for (const k of [...keys].reverse()) {
    const norm = normalizeKey(k);
    if (norm.length > 3 && !COMMON_TLDS.has(norm) && !SKIP_WORDS.has(norm)) {
      return {
        kind: 'remote',
        url: `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${norm}`,
        fallbackUrl: null,
        domain: null,
        accent: '#3b82f6',
        label: String(service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  return {
    kind: 'fallback',
    label: String(service?.name || service?.id || '?')
      .slice(0, 2)
      .toUpperCase(),
    accent: '#3b82f6',
    fallbackUrl: null,
    domain: null,
  };
}

/**
 * Standard Google Favicon implementation.
 */
export function getFaviconUrl(domain: string): string | null {
  const clean = String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '');

  if (!clean || clean.length < 3) {
    return null;
  }

  const fullUrl = `https://${clean}/`;
  return `${
    SERVICE_URLS.GOOGLE_FAVICON_V2_API
  }?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
    fullUrl,
  )}&size=128`;
}

/**
 * Extracts the base domain from a full domain string.
 */
export function getRootDomain(domain: string): string {
  const clean = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .replace(/^www\./, '');

  const parts = clean.split('.');
  if (parts.length <= 2) {
    return clean;
  }

  const isMultiPartTld =
    parts.length > 2 &&
    (parts[parts.length - 2] === 'co' ||
      parts[parts.length - 2] === 'com' ||
      parts[parts.length - 2] === 'org' ||
      parts[parts.length - 2] === 'gov' ||
      parts[parts.length - 2] === 'edu');

  if (isMultiPartTld && parts.length > 2) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  games:
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></svg>',
  gambling:
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M12 7v10"/></svg>',
  porn: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  'social-networks':
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
  'video-streaming':
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  shopping:
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  dating:
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
};

export function getCategoryBadge(category: { id?: string; name?: string }) {
  const key = String(category?.id || '').toLowerCase();
  return (
    CATEGORY_ICON_MAP[key] ||
    String(category?.name || key)
      .slice(0, 2)
      .toUpperCase()
  );
}

/**
 * High-level resolver for all screens.
 */
export function getAppIconUrl(identifier: string): string | null {
  return resolveIconUrl(identifier) || null;
}

/**
 * THE shared source of truth for all domain-based icons (Dashboard, Reports, Activity).
 * Uses a research-backed failover chain: Overrides -> IconHorse -> Google.
 */
export function resolveFaviconUrl(identifier: string): string {
  const cleanId = String(identifier || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const root = getRootDomain(cleanId);

  // 1. Research-backed Overrides (Highest Priority)
  if (GLOBAL_ASSET_OVERRIDES[cleanId]) {
    return GLOBAL_ASSET_OVERRIDES[cleanId];
  }
  if (GLOBAL_ASSET_OVERRIDES[root]) {
    return GLOBAL_ASSET_OVERRIDES[root];
  }

  // 2. IconHorse (Excellent for non-standard TLDs like .nl, .to)
  return `https://icon.horse/icon/${cleanId}`;
}

/**
 * Single source of truth for named brand resolution.
 */
export function resolveIconUrl(identifier: string): string | null {
  if (!identifier) {
    return null;
  }

  const cleanId = String(identifier)
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const root = getRootDomain(cleanId);

  // 1. Direct Brand Key Lookup (Highest Precision)
  const directMatch = BRAND_DATA[cleanId];
  if (directMatch) {
    const { primaryUrl, fallbackUrl } = getBrandAssetUrls(directMatch);
    if (primaryUrl || fallbackUrl) {
      return (primaryUrl || fallbackUrl) as string;
    }
  }

  // 2. Precise Domain Lookup
  const domainKey = DOMAIN_TO_BRAND[cleanId] || DOMAIN_TO_BRAND[root];
  if (domainKey && BRAND_DATA[domainKey]) {
    const { primaryUrl, fallbackUrl } = getBrandAssetUrls(
      BRAND_DATA[domainKey],
    );
    if (primaryUrl || fallbackUrl) {
      return (primaryUrl || fallbackUrl) as string;
    }
  }

  // 3. Global Overrides & Chain
  return resolveFaviconUrl(cleanId);
}
