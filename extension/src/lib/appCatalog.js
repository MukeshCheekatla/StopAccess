const SERVICE_ICON_MAP = {
  amazon: { slug: 'amazon', color: 'FF9900' },
  bereal: { slug: 'bereal', color: '000000' },
  blizzard: { slug: 'blizzard', color: '148EFF' },
  chatgpt: { slug: 'openai', color: '10A37F' },
  dailymotion: { slug: 'dailymotion', color: '0A0A0A' },
  discord: { slug: 'discord', color: '5865F2' },
  'disney+': { slug: 'disneyplus', color: '113CCF' },
  disneyplus: { slug: 'disneyplus', color: '113CCF' },
  ebay: { slug: 'ebay', color: 'E53238' },
  facebook: { slug: 'facebook', color: '1877F2' },
  fortnite: { slug: 'epicgames', color: '313131' },
  hbo: { slug: 'hbo', color: '5A31F4' },
  hbomax: { slug: 'hbomax', color: '5822B4' },
  hulu: { slug: 'hulu', color: '1CE783' },
  imgur: { slug: 'imgur', color: '1BB76E' },
  instagram: { slug: 'instagram', color: 'E4405F' },
  'league of legends': { slug: 'leagueoflegends', color: 'C89B3C' },
  leagueoflegends: { slug: 'leagueoflegends', color: 'C89B3C' },
  mastodon: { slug: 'mastodon', color: '6364FF' },
  messenger: { slug: 'messenger', color: '00B2FF' },
  minecraft: { slug: 'minecraft', color: '62B47A' },
  netflix: { slug: 'netflix', color: 'E50914' },
  pinterest: { slug: 'pinterest', color: 'BD081C' },
  playstation: { slug: 'playstation', color: '003791' },
  'playstation network': { slug: 'playstation', color: '003791' },
  'prime video': { slug: 'primevideo', color: '00A8E1' },
  primevideo: { slug: 'primevideo', color: '00A8E1' },
  reddit: { slug: 'reddit', color: 'FF4500' },
  roblox: { slug: 'roblox', color: '000000' },
  signal: { slug: 'signal', color: '3A76F0' },
  skype: { slug: 'skype', color: '00AFF0' },
  snapchat: { slug: 'snapchat', color: 'FFFC00' },
  spotify: { slug: 'spotify', color: '1DB954' },
  steam: { slug: 'steam', color: '171A21' },
  telegram: { slug: 'telegram', color: '26A5E4' },
  tinder: { slug: 'tinder', color: 'FF6B6B' },
  tiktok: { slug: 'tiktok', color: '000000' },
  tumblr: { slug: 'tumblr', color: '36465D' },
  twitch: { slug: 'twitch', color: '9146FF' },
  twitter: { slug: 'x', color: '111111' },
  vk: { slug: 'vk', color: '0077FF' },
  vimeo: { slug: 'vimeo', color: '1AB7EA' },
  whatsapp: { slug: 'whatsapp', color: '25D366' },
  xbox: { slug: 'xbox', color: '107C10' },
  'xbox live': { slug: 'xbox', color: '107C10' },
  youtube: { slug: 'youtube', color: 'FF0000' },
  zoom: { slug: 'zoom', color: '0B5CFF' },
  '9gag': { slug: '9gag', color: '000000' },
};

const CATEGORY_EMOJI_MAP = {
  games: 'GG',
  gambling: '$$',
  porn: '18',
  'social-networks': 'SN',
  'video-streaming': 'VS',
};

function normalizeKey(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[+]/g, 'plus')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function getServiceIcon(service) {
  const keys = [
    normalizeKey(service?.id),
    normalizeKey(service?.name),
    String(service?.id || '').toLowerCase(),
    String(service?.name || '').toLowerCase(),
  ];

  for (const key of keys) {
    if (SERVICE_ICON_MAP[key]) {
      const { slug, color } = SERVICE_ICON_MAP[key];
      return {
        kind: 'remote',
        url: `https://cdn.simpleicons.org/${slug}/${color}`,
        accent: `#${color}`,
      };
    }
  }

  const fallback = String(service?.name || service?.id || '?')
    .trim()
    .slice(0, 2)
    .toUpperCase();
  return {
    kind: 'fallback',
    label: fallback || '?',
    accent: '#7C6FF7',
  };
}

export function getCategoryBadge(category) {
  const key = String(category?.id || '').toLowerCase();
  return (
    CATEGORY_EMOJI_MAP[key] ||
    String(category?.name || key)
      .slice(0, 2)
      .toUpperCase()
  );
}

export function getDomainIcon(domain) {
  const clean = String(domain || '')
    .trim()
    .toLowerCase();
  if (!clean) {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    clean,
  )}&sz=64`;
}
