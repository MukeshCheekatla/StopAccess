import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SELECTORS } from '@/background/inAppBlocking';
import { resolveFaviconUrl } from '@stopaccess/core';
import { UI_ICONS, UI_TOKENS } from '@/ui/ui';
import { COLORS } from '@/ui/theme/designTokens';

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', domain: 'youtube.com' },
  { id: 'tiktok', name: 'TikTok', domain: 'tiktok.com' },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com' },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com' },
  { id: 'x', name: 'X', domain: 'x.com' },
  { id: 'snapchat', name: 'Snapchat', domain: 'snapchat.com' },
];

// App-specific icon strings from the central library
const ICONS = {
  HOME: UI_ICONS.HOME,
  SHORTS: UI_ICONS.SHORTS,
  COMMENTS: UI_ICONS.COMMENTS,
  EYE: UI_ICONS.EYE,
  BELL: UI_ICONS.BELL,
  COMPASS: UI_ICONS.COMPASS,
  SEARCH: UI_ICONS.SEARCH,
  PLAY: UI_ICONS.PLAY,
  PALETTE: UI_ICONS.PALETTE,
  LIVE: UI_ICONS.LIVE,
  REELS: UI_ICONS.REELS,
  STORIES: UI_ICONS.STORIES,
  USER: UI_ICONS.USER,
  CART: UI_ICONS.CART,
  TRENDS: UI_ICONS.TRENDING_UP,
  LIST: UI_ICONS.LIST,
  USERS: UI_ICONS.USERS,
};

// Per-platform feature metadata: description + icon
type FeatureMeta = { desc: string; icon: string };
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
      icon: UI_ICONS.LOCK,
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

function normalizeRules(rules: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(rules).map(([platform, features]) => {
      const supported = new Set(Object.keys(SELECTORS[platform] || {}));
      return [platform, features.filter((feature) => supported.has(feature))];
    }),
  );
}

export function InAppBlockingView() {
  const [rules, setRules] = useState<Record<string, string[]>>({});
  const [activePlatform, setActivePlatform] = useState('youtube');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chrome.storage.local.get('inAppRules').then((res) => {
      const normalized = normalizeRules(
        (res.inAppRules as Record<string, string[]>) || {},
      );
      setRules(normalized);
      chrome.storage.local.set({ inAppRules: normalized });
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
      const next = normalizeRules({ ...prev, [platform]: nextP });
      persist(next);
      return next;
    });
  };

  const toggleAll = () => {
    setRules((prev) => {
      const pRules = prev[activePlatform] || [];
      const all = Object.keys(SELECTORS[activePlatform] || {});
      const nextP = pRules.length === all.length ? [] : all;
      const next = normalizeRules({ ...prev, [activePlatform]: nextP });
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
                        ? COLORS.whiteWashStrong
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
                      <div
                        className="fg-w-5 fg-h-5"
                        dangerouslySetInnerHTML={{ __html: meta.icon }}
                      />
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
                          ? 'fg-bg-[var(--fg-green)]'
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
                  <div
                    className="fg-w-12 fg-h-12 fg-opacity-40 fg-flex fg-items-center fg-justify-center"
                    dangerouslySetInnerHTML={{ __html: UI_ICONS.WRENCH }}
                  />
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
              className="fg-p-2 fg-rounded-lg fg-shrink-0 fg-flex fg-items-center fg-justify-center"
              style={{
                background: 'var(--fg-in-app-active-bg)',
                opacity: 0.85,
                width: 32,
                height: 32,
                color: 'white',
              }}
              dangerouslySetInnerHTML={{ __html: UI_ICONS.INFO }}
            />
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
              Element rules hide matching page areas with CSS. Route rules, like
              Shorts or Explore pages, show the StopAccess block overlay
              instead. Open pages update after storage sync or navigation.
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
