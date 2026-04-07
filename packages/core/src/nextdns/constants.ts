export const UI_EXAMPLES = {
  DOMAIN: 'instagram.com',
  SUBDOMAIN: 'm.facebook.com',
  GENERIC_DOMAIN: 'example.com',
  SERVICE: 'facebook',
  CATEGORY: 'social',
  PROFILE_ID: 'abc1234',
};

export const NEXTDNS_SERVICES = [
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'Twitter/X' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'disneyplus', name: 'Disney+' },
  { id: 'twitch', name: 'Twitch' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'snapchat', name: 'Snapchat' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'discord', name: 'Discord' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'steam', name: 'Steam' },
  { id: 'roblox', name: 'Roblox' },
  { id: 'fortnite', name: 'Fortnite' },
  { id: 'minecraft', name: 'Minecraft' },
  { id: 'leagueoflegends', name: 'League of Legends' },
  { id: 'tinder', name: 'Tinder' },
  { id: 'bumble', name: 'Bumble' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'spotify', name: 'Spotify' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'quora', name: 'Quora' },
  { id: 'medium', name: 'Medium' },
  { id: 'chatgpt', name: 'ChatGPT' },
  { id: 'notion', name: 'Notion' },
  { id: 'asana', name: 'Asana' },
  { id: 'monday', name: 'Monday' },
  { id: 'slack', name: 'Slack' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'teams', name: 'Teams' },
  { id: 'ebay', name: 'eBay' },
  { id: 'hulu', name: 'Hulu' },
  { id: 'hbomax', name: 'HBO Max' },
  { id: 'primevideo', name: 'Prime Video' },
  { id: 'booking', name: 'Booking.com' },
  { id: 'expedia', name: 'Expedia' },
  { id: 'tripadvisor', name: 'Tripadvisor' },
  { id: 'blizzard', name: 'Blizzard' },
  { id: 'playstation-network', name: 'PlayStation' },
  { id: 'xboxlive', name: 'Xbox' },
  { id: 'signal', name: 'Signal' },
  { id: 'skype', name: 'Skype' },
  { id: 'viber', name: 'Viber' },
  { id: 'mastodon', name: 'Mastodon' },
  { id: 'tumblr', name: 'Tumblr' },
];

export const NEXTDNS_CATEGORIES = [
  {
    id: 'porn',
    name: 'Porn',
    description:
      'Blocks adult and pornographic content. It includes escort sites, pornhub.com and similar domains.',
  },
  { id: 'gambling', name: 'Gambling', description: 'Blocks gambling content.' },
  {
    id: 'dating',
    name: 'Dating',
    description: 'Blocks all dating websites & apps.',
  },
  {
    id: 'piracy',
    name: 'Piracy',
    description:
      'Blocks P2P websites, protocols, copyright-infringing streaming websites and generic video hosting websites used mainly for illegally distributing copyrighted content.',
  },
  {
    id: 'social-networks',
    name: 'Social Networks',
    description:
      'Blocks all social networks sites and apps (Facebook, Instagram, TikTok, Reddit, etc.). Does not block messaging apps.',
  },
  {
    id: 'games',
    name: 'Online Gaming',
    description:
      'Blocks online gaming websites, online gaming apps and online gaming networks (Xbox Live, PlayStation Network, etc.).',
  },
  {
    id: 'video-streaming',
    name: 'Video Streaming',
    description:
      'Blocks video streaming services (YouTube, Netflix, Disney+, illegal streaming websites, video porn websites, etc.) and video-based social networks (TikTok, etc.).',
  },
];

export const POPULAR_DISTRACTIONS = [
  {
    id: 'facebook',
    name: 'Facebook',
    domain: 'facebook.com',
    packageId: 'com.facebook.katana',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    domain: 'instagram.com',
    packageId: 'com.instagram.android',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    domain: 'youtube.com',
    packageId: 'com.google.android.youtube',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    domain: 'tiktok.com',
    packageId: 'com.zhiliaoapp.musically',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    domain: 'twitter.com',
    packageId: 'com.twitter.android',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    domain: 'reddit.com',
    packageId: 'com.reddit.frontpage',
  },
];

export const PACKAGE_SERVICE_MAP: Record<string, string> = {
  'com.facebook.katana': 'facebook',
  'com.instagram.android': 'instagram',
  'com.zhiliaoapp.musically': 'tiktok',
  'com.twitter.android': 'twitter',
  'com.google.android.youtube': 'youtube',
  'com.reddit.frontpage': 'reddit',
  'com.netflix.mediaclient': 'netflix',
  'com.disney.disneyplus': 'disneyplus',
  'tv.twitch.android.app': 'twitch',
};

export function getNextDNSServiceId({
  packageName,
}: {
  packageName: string;
}): string | null {
  return PACKAGE_SERVICE_MAP[packageName] || null;
}
