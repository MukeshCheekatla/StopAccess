/**
 * @focusgate/core — App Domain Mapping
 */

import { AppRule } from '@focusgate/types';

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
  bumble: 'bumble.com',
  discord: 'discord.com',
  disneyplus: 'disneyplus.com',
  facebook: 'facebook.com',
  fortnite: 'fortnite.com',
  hulu: 'hulu.com',
  instagram: 'instagram.com',
  linkedin: 'linkedin.com',
  minecraft: 'minecraft.net',
  netflix: 'netflix.com',
  pinterest: 'pinterest.com',
  primevideo: 'primevideo.com',
  reddit: 'reddit.com',
  roblox: 'roblox.com',
  skype: 'skype.com',
  slack: 'slack.com',
  snapchat: 'snapchat.com',
  spotify: 'spotify.com',
  teams: 'teams.microsoft.com',
  telegram: 'telegram.org',
  tiktok: 'tiktok.com',
  tinder: 'tinder.com',
  twitch: 'twitch.tv',
  twitter: 'x.com',
  whatsapp: 'whatsapp.net',
  youtube: 'youtube.com',
  zoom: 'zoom.us',
};

export function getDomainForRule(rule: Partial<AppRule>): string | null {
  if (rule.customDomain && rule.customDomain.trim().length > 0) {
    return rule.customDomain.trim().toLowerCase();
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

  if (rule.packageName) {
    const parts = rule.packageName.toLowerCase().split('.');
    if (parts.length >= 2) {
      const tld = parts[0];
      const name = parts[1];
      if (
        ['com', 'org', 'net', 'io', 'co', 'tv'].includes(tld) &&
        name.length > 2
      ) {
        return `${name}.${tld}`;
      }
    }
  }

  return null;
}

export function getNextDNSServiceId(rule: Partial<AppRule>): string | null {
  const domain = getDomainForRule(rule);
  if (!domain) {
    return null;
  }

  const name = domain.split('.')[0].toLowerCase();
  if (NEXTDNS_SERVICE_IDS.includes(name)) {
    return name;
  }
  if (name === 'x') {
    return 'twitter';
  }
  if (name === 'primevideo') {
    return 'primevideo';
  }

  return null;
}
