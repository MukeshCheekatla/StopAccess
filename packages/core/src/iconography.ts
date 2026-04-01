/**
 * @focusgate/core — Iconography Engine
 * Resolves brands and domains to high-quality assets.
 */
import { BrandDefinition, ServiceIconResult } from '@focusgate/types';
import { BRAND_DATA } from './iconography.data';

export const SERVICE_URLS = {
  NEXTDNS_LOGIN: 'https://my.nextdns.io/login',
  SIMPLE_ICONS_CDN: 'https://cdn.simpleicons.org',
  GOOGLE_FAVICON_API: 'https://www.google.com/s2/favicons',
  GOOGLE_FONTS_URL:
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
};

const DOMAIN_TO_BRAND: Record<string, string> = {};
for (const [key, def] of Object.entries(BRAND_DATA)) {
  if (def.domain) {
    DOMAIN_TO_BRAND[def.domain] = key;
  }
}

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
 * @deprecated Use resolveIconUrl for a simpler identifier-to-URL mapping.
 * This is maintained for legacy NextDNS entity mapping that requires full 'ServiceIconResult'.
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
        accent: match.color,
        label: String(service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  // 2. Google Favicon (More reliable than Clearbit)
  const domainCandidate =
    service?.id?.includes('.') && service.id.length > 4
      ? service.id
      : service?.name?.includes('.') && service.name.length > 4
      ? service.name
      : null;

  if (domainCandidate) {
    const rootDomain = getRootDomain(domainCandidate);
    const rootUrl = getFaviconUrl(rootDomain);
    const subUrl = getFaviconUrl(domainCandidate);

    if (rootUrl) {
      return {
        kind: 'remote',
        url: rootUrl, // Lead with the brand (root) icon
        fallbackUrl: subUrl, // Fallback to subdomain if needed
        domain: rootDomain,
        accent: '#3b82f6',
        label: domainCandidate[0].toUpperCase(),
      };
    }
  }

  // 3. Fallback to Simple Icons Slug (Reverse scan to prefer brand segments)
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
 * Favicon implementation using Google API.
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

  // Fallback check: if it's a subdomain, we might want the root domain instead
  // However, we'll return the most specific one first.
  return `${SERVICE_URLS.GOOGLE_FAVICON_API}?domain=${encodeURIComponent(
    clean,
  )}&sz=128`;
}

/**
 * Extracts the base domain (e.g. example.com) from a full domain string.
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

  // Handle common multi-part TLDs (e.g. .co.uk, .com.br)
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

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  games: '🎮',
  gambling: '🎰',
  porn: '🔞',
  'social-networks': '🌐',
  'video-streaming': '🎬',
  shopping: '🛍️',
  dating: '❤️',
};

/**
 * Restores vibrant category badges with emojis.
 */
export function getCategoryBadge(category: { id?: string; name?: string }) {
  const key = String(category?.id || '').toLowerCase();
  return (
    CATEGORY_EMOJI_MAP[key] ||
    String(category?.name || key)
      .slice(0, 2)
      .toUpperCase()
  );
}

/**
 * High-level resolver: Simple Icons -> Google Favicon (Clearbit unreliable)
 */
export function getAppIconUrl(identifier: string): string | null {
  return resolveIconUrl(identifier) || null;
}

/**
 * THE single source of truth for icon resolution across all screens.
 * Priority order:
 *   1. BRAND_DATA slug → Simple Icons CDN (full-color SVG, most vibrant)
 *   2. BRAND_DATA favicon → Google Favicon on brand domain
 *   3. Root domain → Google Favicon on stripped root
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

  // 1. BRAND_DATA Lookup (Domain & Segment)
  const root = getRootDomain(cleanId);

  // A. Precise Domain Lookup (Highest Priority - e.g. steampowered.com, chat.google.com)
  const domainKey = DOMAIN_TO_BRAND[cleanId] || DOMAIN_TO_BRAND[root];
  if (domainKey && BRAND_DATA[domainKey]) {
    const { primaryUrl, fallbackUrl } = getBrandAssetUrls(
      BRAND_DATA[domainKey],
    );
    if (primaryUrl || fallbackUrl) {
      return (primaryUrl || fallbackUrl) as string;
    }
  }

  // B. Segment Match (Fallback logic)
  const segments = cleanId.split('.');
  for (const seg of segments) {
    const norm = normalizeKey(seg);
    if (norm.length > 2 && BRAND_DATA[norm]) {
      const { primaryUrl, fallbackUrl } = getBrandAssetUrls(BRAND_DATA[norm]);
      if (primaryUrl || fallbackUrl) {
        return (primaryUrl || fallbackUrl) as string;
      }
    }
  }

  // 3. Google Favicon Root
  return getFaviconUrl(root);
}
