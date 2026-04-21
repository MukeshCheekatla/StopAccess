export const SELECTORS: Record<string, Record<string, string>> = {
  youtube: {
    hide_home_page:
      "ytd-browse[page-subtype='home'] { display: none !important; }",
    hide_shorts:
      "a[title='Shorts'], ytd-mini-guide-entry-renderer[aria-label='Shorts'], ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer, ytd-tab-renderer:has(tp-yt-paper-tab[aria-label='Shorts']) { display: none !important; }",
    hide_comments:
      '#comments, ytd-comments, ytd-item-section-renderer:has(#comments) { display: none !important; }',
    hide_recommended:
      '#secondary, #secondary-inner, #related, ytd-watch-next-secondary-results-renderer { display: none !important; }',
    hide_subscriptions:
      "a[title='Subscriptions'], ytd-guide-entry-renderer:has(a[title='Subscriptions']) { display: none !important; }",
    hide_explore:
      "a[title='Explore'], ytd-guide-entry-renderer:has(a[title='Explore']) { display: none !important; }",
    hide_top_bar: 'ytd-masthead#masthead { display: none !important; }',
    disable_end_cards: '.ytp-ce-element { display: none !important; }',
    disable_autoplay:
      '.ytp-autonav-toggle-button { display: none !important; }',
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
  tiktok: {
    hide_explore:
      "a[href*='/explore'], [data-e2e='nav-explore'] { display: none !important; }",
    hide_live:
      "a[href*='/live'], [data-e2e='nav-live'] { display: none !important; }",
    hide_comments:
      "[data-e2e='comment-icon'], [class*='DivCommentContainer'], [data-e2e='search-comment-container'] { display: none !important; }",
    hide_search:
      "form[action='/search'], [data-e2e='search-box'] { display: none !important; }",
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
  instagram: {
    hide_stories:
      "[role='menu'] button:has(canvas), [aria-label='Stories'] { display: none !important; }",
    hide_reels:
      "a[href*='/reels/'], [aria-label='Reels'] { display: none !important; }",
    hide_explore:
      "a[href*='/explore/'], [aria-label='Explore'] { display: none !important; }",
    hide_comments:
      "ul[class*='Xp1'], section:has(form[method='POST']) { display: none !important; }",
    hide_suggested:
      "article:has(span:contains('Suggested for you')) { display: none !important; }",
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
  facebook: {
    hide_stories: "[aria-label='Stories'] { display: none !important; }",
    hide_reels: "[aria-label='Reels'] { display: none !important; }",
    hide_marketplace:
      "a[href*='/marketplace/'], [aria-label='Marketplace'] { display: none !important; }",
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
  x: {
    hide_explore: "a[href='/explore'] { display: none !important; }",
    hide_trends:
      "[aria-label='Timeline: Trending now'], section:has([aria-label='Timeline: Trending now']) { display: none !important; }",
    hide_notifications:
      "a[href='/notifications'] { display: none !important; }",
    hide_lists: "a[href*='/lists'] { display: none !important; }",
    hide_communities: "a[href*='/communities'] { display: none !important; }",
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
  snapchat: {
    hide_stories: "a[href*='/stories'] { display: none !important; }",
    hide_spotlight: "a[href*='/spotlight'] { display: none !important; }",
    hide_chat: "a[href*='/chat'] { display: none !important; }",
    black_white: 'html { filter: grayscale(100%) !important; }',
  },
};

let activeStyleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;
let cachedRules: Record<string, string[]> = {};
let currentCss = '';

// Self-initialize: load rules from storage and keep in sync.
// Makes this module fully self-contained regardless of who imports it.
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  chrome.storage.local.get('inAppRules').then((res) => {
    cachedRules = (res.inAppRules as Record<string, string[]>) || {};
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.inAppRules) {
      cachedRules =
        (changes.inAppRules.newValue as Record<string, string[]>) || {};
      // Re-apply immediately — user sees effect without page reload
      const domain = window.location.hostname.replace(/^www\./, '');
      if (domain) {
        checkInAppFeatures(domain);
      }
    }
  });
}

const URL_BLOCK_RULES: Record<string, Record<string, RegExp>> = {
  youtube: {
    hide_shorts: /^\/shorts(\/|$)/,
    hide_home_page: /^\/($|\?)/,
    hide_subscriptions: /^\/feed\/subscriptions/,
    hide_explore: /^\/feed\/explore/,
  },
  instagram: {
    hide_reels: /^\/reels(\/|$)/,
    hide_explore: /^\/explore(\/|$)/,
  },
  tiktok: {
    hide_explore: /^\/explore(\/|$)/,
    hide_live: /^\/live(\/|$)/,
  },
  x: {
    hide_explore: /^\/explore(\/|$)/,
    hide_notifications: /^\/notifications(\/|$)/,
  },
};

export function updateInAppRulesCache(rules: Record<string, string[]>) {
  cachedRules = rules || {};
}

export function checkInAppUrlBlock(
  domain: string,
  pathname: string,
): { blocked: boolean; feature?: string } {
  const platform = Object.keys(URL_BLOCK_RULES).find((k) => domain.includes(k));
  if (!platform) {
    return { blocked: false };
  }

  const activeFeatures = cachedRules[platform] || [];
  const platformUrlRules = URL_BLOCK_RULES[platform] || {};

  for (const feature of activeFeatures) {
    const pattern = platformUrlRules[feature];
    if (pattern && pattern.test(pathname)) {
      return { blocked: true, feature };
    }
  }
  return { blocked: false };
}

export function checkInAppFeatures(domain: string) {
  const platform = Object.keys(SELECTORS).find((k) => domain.includes(k));
  if (!platform) {
    removeStyles();
    return;
  }

  const activeFeatures = cachedRules[platform] || [];

  if (activeFeatures.length === 0) {
    removeStyles();
    return;
  }

  let css = '';
  for (const feature of activeFeatures) {
    if (SELECTORS[platform][feature]) {
      css += SELECTORS[platform][feature] + '\n';
    }
  }

  currentCss = css;
  applyStyles(css);
  startObserver();
}

function applyStyles(css: string) {
  if (!activeStyleEl) {
    activeStyleEl = document.createElement('style');
    activeStyleEl.id = '__stopaccess_inapp_blocking__';
  }

  if (activeStyleEl.textContent !== css) {
    activeStyleEl.textContent = css;
  }

  if (!activeStyleEl.parentNode && document.head) {
    document.head.appendChild(activeStyleEl);
  }
}

function removeStyles() {
  if (activeStyleEl && activeStyleEl.parentNode) {
    activeStyleEl.parentNode.removeChild(activeStyleEl);
  }
  activeStyleEl = null;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function startObserver() {
  if (observer) {
    return;
  }

  observer = new MutationObserver(() => {
    if (activeStyleEl && !activeStyleEl.parentNode && document.head) {
      document.head.appendChild(activeStyleEl);
    }
  });

  if (activeStyleEl) {
    const styleObserver = new MutationObserver(() => {
      if (
        activeStyleEl &&
        currentCss &&
        activeStyleEl.textContent !== currentCss
      ) {
        activeStyleEl.textContent = currentCss;
      }
    });
    styleObserver.observe(activeStyleEl, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
