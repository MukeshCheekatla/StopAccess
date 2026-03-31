/**
 * @focusgate/core — Iconography Engine
 * Resolves brands and domains to high-quality assets.
 */

export const SERVICE_URLS = {
  NEXTDNS_LOGIN: 'https://my.nextdns.io/login',
  SIMPLE_ICONS_CDN: 'https://cdn.simpleicons.org',
  GOOGLE_FAVICON_API: 'https://www.google.com/s2/favicons',
  DUCKDUCKGO_ICONS: 'https://icons.duckduckgo.com/ip3',
  CLEARBIT_LOGO: 'https://logo.clearbit.com',
  GOOGLE_FONTS_URL:
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
};

const BRAND_DATA: Record<string, { slug: string; color: string }> = {
  facebook: { slug: 'facebook', color: '#1877F2' },
  instagram: { slug: 'instagram', color: '#E4405F' },
  whatsapp: { slug: 'whatsapp', color: '#25D366' },
  youtube: { slug: 'youtube', color: '#FF0000' },
  netflix: { slug: 'netflix', color: '#E50914' },
  twitter: { slug: 'twitter', color: '#1DA1F2' },
  x: { slug: 'x', color: '#ffffff' },
  reddit: { slug: 'reddit', color: '#FF4500' },
  linkedin: { slug: 'linkedin', color: '#0077B5' },
  pinterest: { slug: 'pinterest', color: '#BD081C' },
  spotify: { slug: 'spotify', color: '#1DB954' },
  discord: { slug: 'discord', color: '#5865F2' },
  telegram: { slug: 'telegram', color: '#26A5E4' },
  twitch: { slug: 'twitch', color: '#9146FF' },
  tiktok: { slug: 'tiktok', color: '#000000' },
  amazon: { slug: 'amazon', color: '#FF9900' },
  primevideo: { slug: 'primevideo', color: '#00A8E1' },
  hulu: { slug: 'hulu', color: '#3DBB3E' },
  disneyplus: { slug: 'disneyplus', color: '#292C6D' },
  openai: { slug: 'openai', color: '#10a37f' },
  chatgpt: { slug: 'openai', color: '#10a37f' },
  duolingo: { slug: 'duolingo', color: '#58CC02' },
  slack: { slug: 'slack', color: '#4A154B' },
  microsoftteams: { slug: 'microsoftteams', color: '#6264A7' },
  teams: { slug: 'microsoftteams', color: '#6264A7' },
  zoom: { slug: 'zoom', color: '#2D8CFF' },
  github: { slug: 'github', color: '#181717' },
  google: { slug: 'google', color: '#4285F4' },
  roblox: { slug: 'roblox', color: '#000000' },
  minecraft: { slug: 'minecraft', color: '#2E2D2D' },
  fortnite: { slug: 'fortnite', color: '#313131' },
  skype: { slug: 'skype', color: '#00AFF0' },
  signal: { slug: 'signal', color: '#3A76F0' },
  messenger: { slug: 'messenger', color: '#006AFF' },
  blizzard: { slug: 'blizzardentertainment', color: '#00B4FF' },
  bereal: { slug: 'bereal', color: '#000000' },
  steam: { slug: 'steam', color: '#000000' },
  xbox: { slug: 'xbox', color: '#107C10' },
  xboxlive: { slug: 'xbox', color: '#107C10' },
  playstation: { slug: 'playstation', color: '#003791' },
  'playstation-network': { slug: 'playstation', color: '#003791' },
};

function normalizeKey(value = ''): string {
  return String(value)
    .toLowerCase()
    .replace(/[+]/g, 'plus')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * Resolves a NextDNS service/app ID to a high-fidelity vibrant icon asset.
 */
export function resolveServiceIcon(service: { id?: string; name?: string }) {
  const keys = [
    service?.id,
    service?.name,
    ...(service?.id?.includes('.') ? service.id.split('.') : []),
    ...(service?.name?.includes('.') ? service.name.split('.') : []),
  ];

  // 1. BRAND_DATA (Verified Assets)
  for (const k of keys) {
    const norm = normalizeKey(k || '');
    if (!norm || norm.length <= 2) {
      continue;
    }

    const match = BRAND_DATA[norm];
    if (match) {
      return {
        kind: 'remote',
        url: `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${match.slug}`,
        accent: match.color,
        label: (service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  // 2. Google Favicon (More reliable than Clearbit) — we use favicon here too!
  const domainCandidate =
    service?.id?.includes('.') && service.id.length > 4
      ? service.id
      : service?.name?.includes('.') && service.name.length > 4
      ? service.name
      : null;

  if (domainCandidate) {
    const url = getFaviconUrl(domainCandidate);
    if (url) {
      return {
        kind: 'remote',
        url,
        accent: '#3b82f6',
        label: domainCandidate[0].toUpperCase(),
      };
    }
  }

  // 3. Fallback to Simple Icons Slug
  for (const k of keys) {
    const norm = normalizeKey(k || '');
    const commonTlds = [
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
    ];
    if (norm.length > 3 && !commonTlds.includes(norm)) {
      return {
        kind: 'remote',
        url: `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${norm}`,
        accent: '#3b82f6',
        label: (service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  return {
    kind: 'fallback',
    label: (service?.name || service?.id || '?').slice(0, 2).toUpperCase(),
    accent: '#3b82f6',
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

  return `${SERVICE_URLS.GOOGLE_FAVICON_API}?domain=${encodeURIComponent(
    clean,
  )}&sz=128`;
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
  if (!identifier) {
    return null;
  }

  const cleanId = String(identifier)
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const segments = cleanId.split('.');

  for (const seg of segments) {
    const norm = normalizeKey(seg);
    if (BRAND_DATA[norm]) {
      return `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${BRAND_DATA[norm].slug}`;
    }
  }

  return getFaviconUrl(cleanId);
}
