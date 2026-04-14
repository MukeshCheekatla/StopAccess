export const UI_EXAMPLES = {
  DOMAIN: 'instagram.com',
  SUBDOMAIN: 'm.facebook.com',
  GENERIC_DOMAIN: 'example.com',
  SERVICE: 'facebook',
  CATEGORY: 'social',
  PROFILE_ID: 'abc1234',
};

export const NEXTDNS_SERVICES = [
  // Social & Messaging
  { id: 'instagram', name: 'Instagram', category: 'Social' },
  { id: 'tiktok', name: 'TikTok', category: 'Social' },
  { id: 'snapchat', name: 'Snapchat', category: 'Social' },
  { id: 'facebook', name: 'Facebook', category: 'Social' },
  { id: 'twitter', name: 'Twitter/X', category: 'Social' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Social' },
  { id: 'discord', name: 'Discord', category: 'Social' },
  { id: 'telegram', name: 'Telegram', category: 'Social' },
  { id: 'signal', name: 'Signal', category: 'Social' },
  { id: 'skype', name: 'Skype', category: 'Social' },
  { id: 'viber', name: 'Viber', category: 'Social' },
  { id: 'mastodon', name: 'Mastodon', category: 'Social' },
  { id: 'tumblr', name: 'Tumblr', category: 'Social' },
  { id: 'reddit', name: 'Reddit', category: 'Social' },

  // Entertainment & Streaming
  { id: 'youtube', name: 'YouTube', category: 'Entertainment' },
  { id: 'netflix', name: 'Netflix', category: 'Entertainment' },
  { id: 'disneyplus', name: 'Disney+', category: 'Entertainment' },
  { id: 'hulu', name: 'Hulu', category: 'Entertainment' },
  { id: 'hbomax', name: 'HBO Max', category: 'Entertainment' },
  { id: 'primevideo', name: 'Prime Video', category: 'Entertainment' },
  { id: 'twitch', name: 'Twitch', category: 'Entertainment' },
  { id: 'spotify', name: 'Spotify', category: 'Entertainment' },
  { id: 'pinterest', name: 'Pinterest', category: 'Entertainment' },

  // Gaming
  { id: 'steam', name: 'Steam', category: 'Gaming' },
  { id: 'roblox', name: 'Roblox', category: 'Gaming' },
  { id: 'fortnite', name: 'Fortnite', category: 'Gaming' },
  { id: 'minecraft', name: 'Minecraft', category: 'Gaming' },
  { id: 'leagueoflegends', name: 'League of Legends', category: 'Gaming' },
  { id: 'blizzard', name: 'Blizzard', category: 'Gaming' },
  { id: 'playstation-network', name: 'PlayStation', category: 'Gaming' },
  { id: 'xboxlive', name: 'Xbox', category: 'Gaming' },

  // Productivity & Work
  { id: 'linkedin', name: 'LinkedIn', category: 'Productivity' },
  { id: 'chatgpt', name: 'ChatGPT', category: 'Productivity' },
  { id: 'notion', name: 'Notion', category: 'Productivity' },
  { id: 'asana', name: 'Asana', category: 'Productivity' },
  { id: 'monday', name: 'Monday', category: 'Productivity' },
  { id: 'slack', name: 'Slack', category: 'Productivity' },
  { id: 'zoom', name: 'Zoom', category: 'Productivity' },
  { id: 'teams', name: 'Teams', category: 'Productivity' },
  { id: 'quora', name: 'Quora', category: 'Productivity' },
  { id: 'medium', name: 'Medium', category: 'Productivity' },

  // Lifestyle & Travel
  { id: 'amazon', name: 'Amazon', category: 'Lifestyle' },
  { id: 'ebay', name: 'eBay', category: 'Lifestyle' },
  { id: 'booking', name: 'Booking.com', category: 'Lifestyle' },
  { id: 'expedia', name: 'Expedia', category: 'Lifestyle' },
  { id: 'tripadvisor', name: 'Tripadvisor', category: 'Lifestyle' },
  { id: 'tinder', name: 'Tinder', category: 'Lifestyle' },
  { id: 'bumble', name: 'Bumble', category: 'Lifestyle' },
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
