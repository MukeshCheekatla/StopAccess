import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SELECTORS } from '../../background/inAppBlocking';
import { resolveFaviconUrl } from '@stopaccess/core';
import { UI_TOKENS } from '../../lib/ui';

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com' },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com' },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com' },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com' },
  { id: 'x', name: 'X', domain: 'x.com' },
  { id: 'snapchat', name: 'Snapchat', domain: 'snapchat.com' },
];

// App-specific SVG icons
const ICONS = {
  HOME: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ),
  SHORTS: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-8 3.58-8 8s3.58 8,8 8c3.17 0 5.87-1.84 7.15-4.5L15.5 14l-4.5 2.5L11 11l4.5 2.5 L17.65 6.35z" />
    </svg>
  ),
  COMMENTS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  EYE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  BELL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  COMPASS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  SEARCH: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  PLAY: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="m7 4 12 8-12 8V4z" />
    </svg>
  ),
  PALETTE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.76-.31 2.42-.84.6-.48.78-1.2.53-1.91l-.22-.62c-.22-.6.04-1.28.6-1.63.8-.5 1.8-.46 2.67-.09 1.13.48 2.5-.1 3.03-1.2C21.73 14.39 22 13.23 22 12c0-5.5-4.5-10-10-10Z" />
    </svg>
  ),
  LIVE: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.48m2.12 2.12a9 9 0 0 0 0-12.72M7.76 7.76a6 6 0 0 0 0 8.48m-2.12 2.12a9 9 0 0 1 0-12.72" />
    </svg>
  ),
  REELS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 3v18M3 7.5h4M3 12h4M3 16.5h4M17 3v18M17 7.5h4M17 12h4M17 16.5h4" />
    </svg>
  ),
  STORIES: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 4" />
    </svg>
  ),
  USER: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  CART: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.56-8.43h-16.3" />
    </svg>
  ),
  TRENDS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m19 20-4-4-3 3-4-4-3 3" />
      <path d="M12 3v11" />
      <path d="M16 7l-4-4-4 4" />
    </svg>
  ),
  LIST: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  USERS: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

// Per-platform feature metadata: description + icon
type FeatureMeta = { desc: string; icon: React.ReactNode };
const FEATURE_META: Record<string, Record<string, FeatureMeta>> = {
  youtube: {
    hide_home_page: {
      icon: ICONS.HOME,
      desc: 'Hides the home feed so you can only search for what you came for.',
    },
    hide_shorts: {
      icon: ICONS.SHORTS,
      desc: 'Removes Shorts from sidebar, feed, and search results.',
    },
    hide_comments: {
      icon: ICONS.COMMENTS,
      desc: 'Removes the comment section under every video.',
    },
    hide_recommended: {
      icon: ICONS.EYE,
      desc: 'Hides "Up next" and related video sidebar.',
    },
    hide_subscriptions: {
      icon: ICONS.BELL,
      desc: 'Removes your subscriptions tab from the sidebar.',
    },
    hide_explore: {
      icon: ICONS.COMPASS,
      desc: 'Removes the Explore/Trending tab from the sidebar.',
    },
    hide_top_bar: {
      icon: ICONS.SEARCH,
      desc: 'Hides the entire top navigation bar including search.',
    },
    disable_end_cards: {
      icon: ICONS.PLAY,
      desc: 'Removes clickable cards that appear at the end of videos.',
    },
    disable_autoplay: {
      icon: ICONS.PLAY,
      desc: 'Stops videos from auto-playing after one finishes.',
    },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire site in greyscale to reduce appeal.',
    },
  },
  tiktok: {
    hide_explore: {
      icon: ICONS.COMPASS,
      desc: 'Removes the "Discover" or "Explore" tab completely.',
    },
    hide_live: {
      icon: ICONS.LIVE,
      desc: "Removes LIVE tab so you can't stumble into live streams.",
    },
    hide_comments: {
      icon: ICONS.COMMENTS,
      desc: 'Hides comments on all video posts.',
    },
    hide_search: {
      icon: ICONS.SEARCH,
      desc: 'Removes the search bar to prevent browsing rabbit holes.',
    },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire site in greyscale to reduce appeal.',
    },
  },
  instagram: {
    hide_stories: {
      icon: ICONS.STORIES,
      desc: 'Removes the story bubbles at the top of your feed.',
    },
    hide_reels: {
      icon: ICONS.REELS,
      desc: 'Removes the Reels tab from navigation.',
    },
    hide_explore: {
      icon: ICONS.COMPASS,
      desc: "Hides the Explore page so you can't get lost in new content.",
    },
    hide_comments: {
      icon: ICONS.COMMENTS,
      desc: 'Hides the comments section on all posts.',
    },
    hide_suggested: {
      icon: ICONS.USER,
      desc: 'Removes "Suggested for you" posts from your feed.',
    },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire site in greyscale to reduce appeal.',
    },
  },
  facebook: {
    hide_stories: {
      icon: ICONS.STORIES,
      desc: 'Removes the stories carousel from the top of your feed.',
    },
    hide_reels: {
      icon: ICONS.REELS,
      desc: 'Removes Reels from your news feed.',
    },
    hide_marketplace: {
      icon: ICONS.CART,
      desc: 'Removes the Marketplace tab from the sidebar.',
    },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire site in greyscale to reduce appeal.',
    },
  },
  x: {
    hide_explore: {
      icon: ICONS.COMPASS,
      desc: 'Removes the Explore / Trending tab from the sidebar.',
    },
    hide_trends: {
      icon: ICONS.TRENDS,
      desc: 'Hides the "What\'s happening" trending section.',
    },
    hide_notifications: {
      icon: ICONS.BELL,
      desc: 'Hides the Notifications tab to prevent compulsive checking.',
    },
    hide_lists: { icon: ICONS.LIST, desc: 'Removes your Lists tab.' },
    hide_communities: {
      icon: ICONS.USERS,
      desc: 'Removes the Communities tab from navigation.',
    },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire site in greyscale to reduce appeal.',
    },
  },
  snapchat: {
    hide_stories: {
      icon: ICONS.STORIES,
      desc: "Removes your friends' Stories from the feed.",
    },
    hide_spotlight: {
      icon: ICONS.PLAY,
      desc: "Removes Spotlight, Snapchat's TikTok-like short-video tab.",
    },
    hide_chat: { icon: ICONS.COMMENTS, desc: 'Hides your Chat list.' },
    black_white: {
      icon: ICONS.PALETTE,
      desc: 'Renders the entire app in greyscale to reduce appeal.',
    },
  },
};

function getFeatureMeta(platform: string, feature: string): FeatureMeta {
  return (
    FEATURE_META[platform]?.[feature] ?? {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      desc: 'Hide this element from the page.',
    }
  );
}

function toLabel(feature: string) {
  return feature
    .replace(/_/g, ' ')
    .replace(/\b(hide|disable)\b /gi, '')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function InAppBlockingView() {
  const [rules, setRules] = useState<Record<string, string[]>>({});
  const [activePlatform, setActivePlatform] = useState('youtube');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chrome.storage.local.get('inAppRules').then((res) => {
      setRules((res.inAppRules as Record<string, string[]>) || {});
    });
  }, []);

  const persist = (nextRules: Record<string, string[]>) => {
    // Debounce: coalesce rapid toggles into one write
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      chrome.storage.local.set({ inAppRules: nextRules }).then(() => {});
    }, 400);
  };

  const toggleFeature = (platform: string, feature: string) => {
    setRules((prev) => {
      const pRules = prev[platform] || [];
      const nextP = pRules.includes(feature)
        ? pRules.filter((f) => f !== feature)
        : [...pRules, feature];
      const next = { ...prev, [platform]: nextP };
      persist(next);
      return next;
    });
  };

  const toggleAll = () => {
    setRules((prev) => {
      const pRules = prev[activePlatform] || [];
      const all = Object.keys(SELECTORS[activePlatform] || {});
      const nextP = pRules.length === all.length ? [] : all;
      const next = { ...prev, [activePlatform]: nextP };
      persist(next);
      return next;
    });
  };

  const currentRules = rules[activePlatform] || [];
  const currentFeatures = Object.keys(SELECTORS[activePlatform] || {});
  const allActive =
    currentRules.length === currentFeatures.length &&
    currentFeatures.length > 0;
  const activePlatformMeta = PLATFORMS.find((p) => p.id === activePlatform)!;

  return (
    <div className="fg-flex fg-flex-col fg-gap-8 fg-p-10 fg-w-full">
      {/* ── Header ── */}
      <div className="fg-flex fg-items-start fg-justify-between fg-gap-4">
        <div className="fg-flex fg-flex-col fg-gap-1">
          <h1 style={UI_TOKENS.TEXT.R.HERO}>In-App Blocking</h1>
          <p
            style={{
              ...UI_TOKENS.TEXT.R.SUBTEXT,
              fontSize: '13px',
              maxWidth: '440px',
            }}
          >
            Remove addictive UI elements while keeping the parts you actually
            need. Changes apply immediately — no page reload required.
          </p>
        </div>
      </div>

      <div className="fg-flex fg-items-start fg-gap-10">
        {/* ── Platform Sidebar ── */}
        <div className="fg-flex fg-flex-col fg-gap-2 fg-w-56 fg-shrink-0 fg-sticky fg-top-10">
          {PLATFORMS.map((p) => {
            const isActive = activePlatform === p.id;
            const count = rules[p.id]?.length || 0;
            return (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={`fg-relative fg-flex fg-items-center fg-gap-3 fg-px-4 fg-py-3.5 fg-rounded-2xl fg-border fg-transition-all fg-duration-200 active:fg-scale-95 ${
                  isActive
                    ? 'fg-bg-[var(--fg-in-app-active-bg)] fg-border-[var(--fg-in-app-active-border)] fg-shadow-md'
                    : 'fg-bg-[var(--fg-glass-bg)] fg-border-[var(--fg-glass-border)] hover:fg-bg-[var(--fg-surface-hover)]'
                }`}
              >
                <img
                  src={resolveFaviconUrl(p.domain)}
                  alt={p.name}
                  className="fg-w-5 fg-h-5 fg-rounded-md fg-flex-shrink-0"
                />
                <span
                  style={{
                    ...UI_TOKENS.TEXT.R.LABEL,
                    fontSize: '13px',
                    flex: 1,
                    textAlign: 'left',
                    color: isActive
                      ? 'var(--fg-in-app-active-text)'
                      : 'var(--fg-text)',
                  }}
                >
                  {p.name}
                </span>
                {count > 0 && (
                  <span
                    className="fg-flex fg-items-center fg-justify-center fg-min-w-[18px] fg-h-[18px] fg-px-1 fg-rounded-full fg-text-[9px] fg-font-black fg-transition-colors"
                    style={{
                      background: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : 'var(--fg-glass-border)',
                      color: isActive
                        ? 'var(--fg-in-app-active-text)'
                        : 'var(--fg-muted)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="fg-flex fg-flex-col fg-gap-6 fg-flex-1 fg-min-h-0">
          {/* ── Feature Panel ── */}
          <div
            className="fg-flex fg-flex-col fg-gap-0 fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[28px] fg-overflow-hidden fg-max-h-[calc(100vh-280px)]"
            style={{ boxShadow: '0 8px 32px var(--fg-shadow-soft)' }}
          >
            {/* Panel header - Fixed */}
            <div className="fg-flex fg-items-center fg-justify-between fg-px-6 fg-py-5 fg-border-b fg-border-[var(--fg-glass-border)] fg-shrink-0">
              <div className="fg-flex fg-items-center fg-gap-3">
                <img
                  src={resolveFaviconUrl(activePlatformMeta.domain)}
                  className="fg-w-8 fg-h-8 fg-rounded-lg"
                  alt=""
                />
                <div>
                  <h2
                    style={{ ...UI_TOKENS.TEXT.R.HEADING, marginBottom: '2px' }}
                  >
                    {activePlatformMeta.name}
                  </h2>
                  <div
                    style={{ ...UI_TOKENS.TEXT.R.SUBTEXT, fontSize: '12px' }}
                  >
                    {currentRules.length}/{currentFeatures.length} features
                    hidden
                  </div>
                </div>
              </div>

              <div className="fg-flex fg-items-center fg-gap-3">
                <button
                  onClick={toggleAll}
                  className="fg-px-3 fg-py-1.5 fg-rounded-xl fg-border fg-text-[11px] fg-font-black fg-tracking-wider fg-transition-all hover:fg-opacity-80 active:fg-scale-95"
                  style={{
                    background: allActive
                      ? 'var(--fg-in-app-active-bg)'
                      : 'var(--fg-glass-bg)',
                    borderColor: allActive
                      ? 'var(--fg-in-app-active-border)'
                      : 'var(--fg-glass-border)',
                    color: allActive
                      ? 'var(--fg-in-app-active-text)'
                      : 'var(--fg-muted)',
                  }}
                >
                  {allActive ? 'Clear All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Feature rows - Scrollable */}
            <div className="fg-divide-y fg-divide-[var(--fg-glass-border)] fg-overflow-y-auto fg-no-scrollbar">
              {currentFeatures.map((f) => {
                const meta = getFeatureMeta(activePlatform, f);
                const active = currentRules.includes(f);

                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(activePlatform, f)}
                    className="fg-w-full fg-flex fg-items-center fg-gap-4 fg-px-6 fg-py-4 fg-text-left fg-transition-all fg-duration-150 hover:fg-bg-[var(--fg-surface-hover)] active:fg-scale-[0.99]"
                    style={{
                      background: active ? 'var(--fg-surface)' : 'transparent',
                    }}
                  >
                    {/* Emoji icon */}
                    <div
                      className="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-2xl fg-shrink-0 fg-text-xl fg-transition-all"
                      style={{
                        background: active
                          ? 'var(--fg-in-app-active-bg)'
                          : 'var(--fg-glass-bg)',
                        color: active
                          ? 'var(--fg-in-app-active-text)'
                          : 'var(--fg-text)',
                      }}
                    >
                      <div className="fg-w-5 fg-h-5">{meta.icon}</div>
                    </div>

                    {/* Label + description */}
                    <div className="fg-flex fg-flex-col fg-gap-0.5 fg-flex-1 fg-min-w-0">
                      <span
                        style={{
                          ...UI_TOKENS.TEXT.R.CARD_TITLE,
                          color: active ? 'var(--fg-text)' : 'var(--fg-text)',
                        }}
                      >
                        {toLabel(f)}
                      </span>
                      <span
                        style={{
                          ...UI_TOKENS.TEXT.R.SUBTEXT,
                          fontSize: '12px',
                          lineHeight: '1.45',
                        }}
                      >
                        {meta.desc}
                      </span>
                    </div>

                    {/* Toggle */}
                    <div
                      className={`fg-relative fg-flex-shrink-0 fg-w-11 fg-h-6 fg-rounded-full fg-transition-colors fg-duration-200 ${
                        active
                          ? 'fg-bg-[var(--green)]'
                          : 'fg-bg-[var(--fg-glass-border)]'
                      }`}
                    >
                      <div
                        className={`fg-absolute fg-top-[4px] fg-left-[4px] fg-w-4 fg-h-4 fg-rounded-full fg-bg-white fg-shadow-sm fg-transition-transform fg-duration-200 ${
                          active ? 'fg-translate-x-[20px]' : ''
                        }`}
                      />
                    </div>
                  </button>
                );
              })}

              {currentFeatures.length === 0 && (
                <div className="fg-flex fg-flex-col fg-items-center fg-gap-2 fg-py-16 fg-text-center">
                  <div className="fg-w-12 fg-h-12 fg-opacity-40">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m14.7 6.08 1.13 1.12c.1.1.1.26 0 .35l-1.07 1.07c-.1.1-.25.1-.35 0l-1.12-1.13M14.7 6.08a2.5 2.5 0 0 0-3.53 0l-3.32 3.32-3.41 3.41c-.4.4-.62.94-.62 1.5l.02 4.41c.01.6.48 1.08 1.08 1.09l4.41.02c.56 0 1.1-.22 1.5-.62l3.41-3.41 3.32-3.32a2.5 2.5 0 0 0 0-3.53l-1.13-1.12ZM14.7 6.08c-.1-.1-.1-.26 0-.35l1.07-1.07a1 1 0 0 1 1.42 0l1.13 1.13c.4.39.4 1.03 0 1.42l-1.07 1.07c-.1.1-.26.1-.35 0l-1.13-1.12ZM12.7 15l-3 3M15 15l-3 3" />
                    </svg>
                  </div>
                  <div style={{ ...UI_TOKENS.TEXT.R.LABEL, marginTop: '8px' }}>
                    No features configured yet
                  </div>
                  <div
                    style={{ ...UI_TOKENS.TEXT.R.SUBTEXT, fontSize: '12px' }}
                  >
                    Check back — platform support is added regularly.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="fg-flex fg-gap-4 fg-items-start fg-p-5 fg-rounded-2xl fg-border"
            style={{
              background: 'var(--fg-glass-bg)',
              borderColor: 'var(--fg-glass-border)',
            }}
          >
            <div
              className="fg-p-2 fg-rounded-lg fg-shrink-0"
              style={{
                background: 'var(--fg-in-app-active-bg)',
                opacity: 0.85,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p
              style={{
                ...UI_TOKENS.TEXT.R.SUBTEXT,
                fontSize: '12px',
                lineHeight: '1.6',
              }}
            >
              <strong style={{ color: 'var(--fg-text)' }}>
                Zero compromise.
              </strong>{' '}
              These rules use CSS injection — only the selected elements are
              hidden. Everything else (DMs, search, your account) stays fully
              working. Changes take effect on the next page load.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderInAppBlockingPage(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<InAppBlockingView />);
}
