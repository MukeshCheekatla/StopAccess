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
  { id: 'games', name: 'Games' },
  { id: 'social-networks', name: 'Social Networks' },
  { id: 'video-streaming', name: 'Video Streaming' },
  { id: 'gambling', name: 'Gambling' },
  { id: 'porn', name: 'Porn' },
  { id: 'dating', name: 'Dating' },
  { id: 'shopping', name: 'Shopping' },
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
