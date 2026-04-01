/**
 * @focusgate/core — App Domain Mapping
 */

import { AppRule, ResolvedTarget } from '@focusgate/types';

const APP_DOMAINS: Record<string, string> = {
  'com.instagram.android': 'instagram.com',
  'com.google.android.youtube': 'youtube.com',
  'com.twitter.android': 'x.com',
  'com.zhiliaoapp.musically': 'tiktok.com',
  'com.facebook.katana': 'facebook.com',
  'com.reddit.frontpage': 'reddit.com',
  'com.snapchat.android': 'snapchat.com',
  'com.netflix.mediaclient': 'netflix.com',
  'com.whatsapp': 'whatsapp.net',
  'org.telegram.messenger': 'telegram.org',
  'com.spotify.music': 'spotify.com',
  'com.amazon.mShop.android.shopping': 'amazon.com',
  'com.pinterest': 'pinterest.com',
  'com.linkedin.android': 'linkedin.com',
  'com.tinder': 'tinder.com',
  'com.bumble.app': 'bumble.com',
  'com.discord': 'discord.com',
  'com.hulu.plus': 'hulu.com',
  'com.disney.disneyplus': 'disneyplus.com',
  'com.google.android.apps.youtube.music': 'youtube.com',
  'com.twitch': 'twitch.tv',
  'com.tumblr': 'tumblr.com',
  'tv.twitch.android.app': 'twitch.tv',
  'com.yahoo.mobile.client.android.mail': 'yahoo.com',
  'com.skype.raider': 'skype.com',
  'com.viber.voip': 'viber.com',
  'com.quora.android': 'quora.com',
  'com.medium.reader': 'medium.com',
  'com.tripadvisor.tripadvisor': 'tripadvisor.com',
  'com.booking': 'booking.com',
  'com.ebay.mobile': 'ebay.com',
  'com.duolingo': 'duolingo.com',
  'com.ted.android': 'ted.com',
};

export const NEXTDNS_SERVICE_IDS = [
  'tiktok',
  'facebook',
  'instagram',
  'snapchat',
  'whatsapp',
  'youtube',
  'netflix',
  'twitter',
  'reddit',
  'linkedin',
  'pinterest',
  'spotify',
  'discord',
  'telegram',
  'twitch',
  'roblox',
  'fortnite',
  'minecraft',
  'tinder',
  'bumble',
  'disneyplus',
  'hulu',
  'primevideo',
  'zoom',
  'skype',
  'teams',
  'slack',
];

const NEXTDNS_SERVICE_DOMAINS: Record<string, string> = {
  '9gag': '9gag.com',
  amazon: 'amazon.com',
  bereal: 'bere.al',
  blizzard: 'blizzard.com',
  chatgpt: 'chat.openai.com',
  dailymotion: 'dailymotion.com',
  bumble: 'bumble.com',
  discord: 'discord.com',
  disneyplus: 'disneyplus.com',
  ebay: 'ebay.com',
  facebook: 'facebook.com',
  fortnite: 'fortnite.com',
  'google-chat': 'chat.google.com',
  hulu: 'hulu.com',
  hbomax: 'max.com',
  imgur: 'imgur.com',
  instagram: 'instagram.com',
  leagueoflegends: 'leagueoflegends.com',
  linkedin: 'linkedin.com',
  mastodon: 'mastodon.social',
  messenger: 'messenger.com',
  minecraft: 'minecraft.net',
  netflix: 'netflix.com',
  pinterest: 'pinterest.com',
  'playstation-network': 'playstation.com',
  primevideo: 'primevideo.com',
  reddit: 'reddit.com',
  roblox: 'roblox.com',
  signal: 'signal.org',
  skype: 'skype.com',
  slack: 'slack.com',
  snapchat: 'snapchat.com',
  spotify: 'spotify.com',
  steam: 'steampowered.com',
  teams: 'teams.microsoft.com',
  telegram: 'telegram.org',
  tiktok: 'tiktok.com',
  tinder: 'tinder.com',
  tumblr: 'tumblr.com',
  twitch: 'twitch.tv',
  vimeo: 'vimeo.com',
  vk: 'vk.com',
  twitter: 'x.com',
  whatsapp: 'whatsapp.net',
  xboxlive: 'xbox.com',
  youtube: 'youtube.com',
  zoom: 'zoom.us',
};

const SERVICE_DOMAIN_ALIASES: Record<string, string> = {
  '9gag.com': '9gag',
  'amazon.com': 'amazon',
  'amazon.in': 'amazon',
  'amazonvideo.com': 'primevideo',
  'bere.al': 'bereal',
  'blizzard.com': 'blizzard',
  'battle.net': 'blizzard',
  'chat.google.com': 'google-chat',
  'chat.openai.com': 'chatgpt',
  'dailymotion.com': 'dailymotion',
  'discord.com': 'discord',
  'disneyplus.com': 'disneyplus',
  'ebay.com': 'ebay',
  'epicgames.com': 'fortnite',
  'facebook.com': 'facebook',
  'fbcdn.net': 'facebook',
  'fortnite.com': 'fortnite',
  'googlechat.com': 'google-chat',
  'hbo.com': 'hbomax',
  'hbomax.com': 'hbomax',
  'hulu.com': 'hulu',
  'imgur.com': 'imgur',
  'instagram.com': 'instagram',
  'leagueoflegends.com': 'leagueoflegends',
  'mastodon.social': 'mastodon',
  'max.com': 'hbomax',
  'messenger.com': 'messenger',
  'messenger.facebook.com': 'messenger',
  'minecraft.net': 'minecraft',
  'netflix.com': 'netflix',
  'openai.com': 'chatgpt',
  'pinterest.com': 'pinterest',
  'playstation.com': 'playstation-network',
  'primevideo.com': 'primevideo',
  'reddit.com': 'reddit',
  'roblox.com': 'roblox',
  'signal.org': 'signal',
  'skype.com': 'skype',
  'snapchat.com': 'snapchat',
  'spotify.com': 'spotify',
  'steampowered.com': 'steam',
  'telegram.org': 'telegram',
  'teams.microsoft.com': 'teams',
  'tiktok.com': 'tiktok',
  'tumblr.com': 'tumblr',
  'twitch.tv': 'twitch',
  'twitter.com': 'twitter',
  'vimeo.com': 'vimeo',
  'vk.com': 'vk',
  'whatsapp.com': 'whatsapp',
  'whatsapp.net': 'whatsapp',
  'x.com': 'twitter',
  'xbox.com': 'xboxlive',
  'xboxlive.com': 'xboxlive',
  'youtu.be': 'youtube',
  'youtube.com': 'youtube',
  'zoom.us': 'zoom',
};

export function getDomainForRule(rule: Partial<AppRule>): string | null {
  if (rule.customDomain && rule.customDomain.trim().length > 0) {
    return rule.customDomain.trim().toLowerCase();
  }

  // If the rule IS a domain (added directly as x.com, reddit.com, etc.)
  // packageName holds the domain itself — return it immediately.
  if (rule.type === 'domain' && rule.packageName) {
    return sanitizeDomain(rule.packageName) || rule.packageName.toLowerCase();
  }

  if (rule.packageName && APP_DOMAINS[rule.packageName]) {
    return APP_DOMAINS[rule.packageName];
  }

  if (
    rule.type === 'service' &&
    rule.packageName &&
    NEXTDNS_SERVICE_DOMAINS[rule.packageName]
  ) {
    return NEXTDNS_SERVICE_DOMAINS[rule.packageName];
  }

  // Fallback: packageName itself looks like a domain (e.g. "x.com")
  // Previously BROKEN — it parsed parts in reverse, treating first segment as TLD.
  if (rule.packageName && rule.packageName.includes('.')) {
    const cleaned = sanitizeDomain(rule.packageName);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

export function getNextDNSServiceId(rule: Partial<AppRule>): string | null {
  if (rule.type === 'service' && rule.packageName) {
    return rule.packageName;
  }

  const candidate = rule.customDomain || APP_DOMAINS[rule.packageName || ''];
  if (!candidate) {
    return null;
  }

  const resolved = resolveTargetInput(candidate);
  if (resolved.kind === 'service') {
    return resolved.normalizedId;
  }

  return null;
}

export const POPULAR_DISTRACTIONS = [
  { id: 'facebook.com', name: 'Facebook', packageId: 'com.facebook.katana' },
  {
    id: 'instagram.com',
    name: 'Instagram',
    packageId: 'com.instagram.android',
  },
  { id: 'reddit.com', name: 'Reddit', packageId: 'com.reddit.frontpage' },
  {
    id: 'youtube.com',
    name: 'YouTube',
    packageId: 'com.google.android.youtube',
  },
  { id: 'x.com', name: 'X / Twitter', packageId: 'com.twitter.android' },
  { id: 'tiktok.com', name: 'TikTok', packageId: 'com.zhiliaoapp.musically' },
  { id: 'netflix.com', name: 'Netflix', packageId: 'com.netflix.mediaclient' },
  { id: 'twitch.tv', name: 'Twitch', packageId: 'tv.twitch.android.app' },
  { id: 'discord.com', name: 'Discord', packageId: 'com.discord' },
  {
    id: 'amazon.com',
    name: 'Amazon',
    packageId: 'com.amazon.mShop.android.shopping',
  },
];

export function sanitizeDomain(value: string): string {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return clean.includes('.') ? clean : '';
}

export function getNextDNSServiceDomain(serviceId: string): string | null {
  return NEXTDNS_SERVICE_DOMAINS[serviceId] || null;
}

export function findServiceIdByDomain(domain: string): string | null {
  const normalized = sanitizeDomain(domain);
  if (!normalized) {
    return null;
  }

  const exactMatch = SERVICE_DOMAIN_ALIASES[normalized];
  if (exactMatch) {
    return exactMatch;
  }

  const sortedAliasDomains = Object.keys(SERVICE_DOMAIN_ALIASES).sort(
    (a, b) => b.length - a.length,
  );

  for (const candidate of sortedAliasDomains) {
    if (normalized === candidate || normalized.endsWith(`.${candidate}`)) {
      return SERVICE_DOMAIN_ALIASES[candidate];
    }
  }

  const sortedServiceDomains = Object.entries(NEXTDNS_SERVICE_DOMAINS).sort(
    (a, b) => b[1].length - a[1].length,
  );
  for (const [serviceId, serviceDomain] of sortedServiceDomains) {
    if (
      normalized === serviceDomain ||
      normalized.endsWith(`.${serviceDomain}`)
    ) {
      return serviceId;
    }
  }

  return null;
}

export function resolveTargetInput(input: string): ResolvedTarget {
  const normalized = sanitizeDomain(input) || String(input || '').trim();
  const serviceId = findServiceIdByDomain(normalized);

  if (serviceId) {
    const service = NEXTDNS_SERVICES.find((item) => item.id === serviceId);
    return {
      kind: 'service',
      normalizedId: serviceId,
      displayName: service?.name || serviceId,
      input,
      matchedServiceId: serviceId,
      matchedDomain: getNextDNSServiceDomain(serviceId) || normalized,
    };
  }

  return {
    kind: 'domain',
    normalizedId: normalized,
    displayName: normalized,
    input,
    matchedDomain: normalized,
  };
}

export const UI_EXAMPLES = {
  DOMAIN: 'facebook.com',
  INSTAGRAM: 'instagram.com',
  GENERIC_DOMAIN: 'example.com',
  SUBDOMAIN: 'reddit.com',
  PROFILE_ID: 'abc123',
  API_KEY: 'your-64-character-nextdns-api-key',
};

export const FALLBACK_DOMAINS: Record<string, string> = {
  tiktok: 'tiktok.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  youtube: 'youtube.com',
  netflix: 'netflix.com',
  twitter: 'x.com',
  reddit: 'reddit.com',
  discord: 'discord.com',
  whatsapp: 'whatsapp.com',
};

export const NEXTDNS_CATEGORIES = [
  { id: 'gambling', name: 'Gambling' },
  { id: 'dating', name: 'Dating' },
  { id: 'porn', name: 'Adult Content' },
  { id: 'social-networks', name: 'Social Networks' },
  { id: 'video-streaming', name: 'Video Streaming' },
  { id: 'games', name: 'Games' },
  { id: 'shopping', name: 'Shopping' },
];

export const NEXTDNS_SERVICES = [
  { id: '9gag', name: '9GAG' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'bereal', name: 'BeReal' },
  { id: 'blizzard', name: 'Blizzard' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'dailymotion', name: 'Dailymotion' },
  { id: 'discord', name: 'Discord' },
  { id: 'disneyplus', name: 'Disney+' },
  { id: 'ebay', name: 'eBay' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'fortnite', name: 'Fortnite' },
  { id: 'google-chat', name: 'Google Chat' },
  { id: 'hbomax', name: 'HBO Max' },
  { id: 'hulu', name: 'Hulu' },
  { id: 'imgur', name: 'Imgur' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'leagueoflegends', name: 'League of Legends' },
  { id: 'mastodon', name: 'Mastodon' },
  { id: 'messenger', name: 'Messenger' },
  { id: 'minecraft', name: 'Minecraft' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'playstation-network', name: 'Playstation Network' },
  { id: 'primevideo', name: 'Prime Video' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'roblox', name: 'Roblox' },
  { id: 'signal', name: 'Signal' },
  { id: 'skype', name: 'Skype' },
  { id: 'snapchat', name: 'Snapchat' },
  { id: 'spotify', name: 'Spotify' },
  { id: 'steam', name: 'Steam' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'tinder', name: 'Tinder' },
  { id: 'tumblr', name: 'Tumblr' },
  { id: 'twitch', name: 'Twitch' },
  { id: 'twitter', name: 'X (Twitter)' },
  { id: 'vimeo', name: 'Vimeo' },
  { id: 'vk', name: 'VK' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'xboxlive', name: 'Xbox Live' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'zoom', name: 'Zoom' },
];
