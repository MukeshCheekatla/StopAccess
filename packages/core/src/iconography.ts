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

type BrandSource = 'simpleicon' | 'favicon';

type BrandDefinition = {
  color: string;
  slug?: string;
  domain?: string;
  source?: BrandSource;
};

const BRAND_DATA: Record<string, BrandDefinition> = {
  '9gag': {
    slug: '9gag',
    color: '#ffffff',
    domain: '9gag.com',
  },
  amazon: {
    source: 'favicon',
    color: '#FF9900',
    domain: 'amazon.com',
  },
  bereal: {
    slug: 'bereal',
    color: '#ffffff',
    domain: 'bere.al',
  },
  blizzard: {
    source: 'favicon',
    color: '#00B4FF',
    domain: 'blizzard.com',
  },
  chatgpt: {
    source: 'favicon',
    color: '#10a37f',
    domain: 'chatgpt.com',
  },
  dailymotion: {
    slug: 'dailymotion',
    color: '#0066DC',
    domain: 'dailymotion.com',
  },
  discord: { slug: 'discord', color: '#5865F2', domain: 'discord.com' },
  disneyplus: {
    source: 'favicon',
    color: '#113CCF',
    domain: 'disneyplus.com',
  },
  ebay: { slug: 'ebay', color: '#E53238', domain: 'ebay.com' },
  facebook: { slug: 'facebook', color: '#1877F2', domain: 'facebook.com' },
  fortnite: {
    source: 'favicon',
    color: '#ffffff',
    domain: 'fortnite.com',
  },
  google: { slug: 'google', color: '#4285F4', domain: 'google.com' },
  googlechat: {
    source: 'favicon',
    color: '#34A853',
    domain: 'chat.google.com',
  },
  hbomax: {
    source: 'favicon',
    color: '#8B5CF6',
    domain: 'max.com',
  },
  hulu: {
    source: 'favicon',
    color: '#1CE783',
    domain: 'hulu.com',
  },
  imgur: { slug: 'imgur', color: '#1BB76E', domain: 'imgur.com' },
  instagram: {
    slug: 'instagram',
    color: '#E4405F',
    domain: 'instagram.com',
  },
  leagueoflegends: {
    source: 'favicon',
    color: '#C89B3C',
    domain: 'leagueoflegends.com',
  },
  linkedin: { slug: 'linkedin', color: '#0077B5', domain: 'linkedin.com' },
  mastodon: {
    slug: 'mastodon',
    color: '#6364FF',
    domain: 'mastodon.social',
  },
  messenger: {
    source: 'favicon',
    color: '#0084FF',
    domain: 'messenger.com',
  },
  minecraft: {
    source: 'favicon',
    color: '#62B74A',
    domain: 'minecraft.net',
  },
  netflix: { slug: 'netflix', color: '#E50914', domain: 'netflix.com' },
  openai: { slug: 'openai', color: '#10a37f', domain: 'openai.com' },
  pinterest: {
    slug: 'pinterest',
    color: '#BD081C',
    domain: 'pinterest.com',
  },
  playstation: {
    slug: 'playstation',
    color: '#003791',
    domain: 'playstation.com',
  },
  'playstation-network': {
    slug: 'playstation',
    color: '#003791',
    domain: 'playstation.com',
  },
  primevideo: {
    source: 'favicon',
    color: '#00A8E1',
    domain: 'primevideo.com',
  },
  reddit: { slug: 'reddit', color: '#FF4500', domain: 'reddit.com' },
  roblox: { slug: 'roblox', color: '#000000', domain: 'roblox.com' },
  signal: { slug: 'signal', color: '#3A76F0', domain: 'signal.org' },
  skype: {
    source: 'favicon',
    color: '#00AFF0',
    domain: 'skype.com',
  },
  slack: { slug: 'slack', color: '#4A154B', domain: 'slack.com' },
  snapchat: {
    source: 'favicon',
    color: '#FFFC00',
    domain: 'snapchat.com',
  },
  spotify: { slug: 'spotify', color: '#1DB954', domain: 'spotify.com' },
  steam: { slug: 'steam', color: '#ffffff', domain: 'steampowered.com' },
  telegram: { slug: 'telegram', color: '#26A5E4', domain: 'telegram.org' },
  teams: {
    slug: 'microsoftteams',
    color: '#6264A7',
    domain: 'teams.microsoft.com',
  },
  tiktok: { slug: 'tiktok', color: '#ffffff', domain: 'tiktok.com' },
  tinder: {
    source: 'favicon',
    color: '#FF4458',
    domain: 'tinder.com',
  },
  tumblr: { slug: 'tumblr', color: '#36465D', domain: 'tumblr.com' },
  twitch: { slug: 'twitch', color: '#9146FF', domain: 'twitch.tv' },
  twitter: { slug: 'x', color: '#ffffff', domain: 'x.com' },
  vimeo: { slug: 'vimeo', color: '#1AB7EA', domain: 'vimeo.com' },
  vk: {
    source: 'favicon',
    color: '#0077FF',
    domain: 'vk.com',
  },
  whatsapp: { slug: 'whatsapp', color: '#25D366', domain: 'whatsapp.com' },
  x: { slug: 'x', color: '#ffffff', domain: 'x.com' },
  xbox: { slug: 'xbox', color: '#107C10', domain: 'xbox.com' },
  xboxlive: { slug: 'xbox', color: '#107C10', domain: 'xbox.com' },
  youtube: { slug: 'youtube', color: '#FF0000', domain: 'youtube.com' },
  zoom: { slug: 'zoom', color: '#2D8CFF', domain: 'zoom.us' },
};

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
      ? `${SERVICE_URLS.SIMPLE_ICONS_CDN}/${match.slug}`
      : fallbackUrl;

  return {
    primaryUrl,
    fallbackUrl,
  };
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
      const { primaryUrl, fallbackUrl } = getBrandAssetUrls(match);

      return {
        kind: 'remote',
        url: primaryUrl,
        fallbackUrl,
        domain: match.domain || null,
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
        fallbackUrl: null,
        domain: domainCandidate,
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
        fallbackUrl: null,
        domain: null,
        accent: '#3b82f6',
        label: (service?.name || service?.id || '?')[0].toUpperCase(),
      };
    }
  }

  return {
    kind: 'fallback',
    label: (service?.name || service?.id || '?').slice(0, 2).toUpperCase(),
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
      return getBrandAssetUrls(BRAND_DATA[norm]).primaryUrl;
    }
  }

  return getFaviconUrl(cleanId);
}
