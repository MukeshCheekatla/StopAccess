export const SELECTORS: Record<string, Record<string, string>> = {
  youtube: {
    hide_home_page: "ytd-browse[page-subtype='home']",
    hide_shorts:
      "a[title='Shorts'], ytd-mini-guide-entry-renderer[aria-label='Shorts'], ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer, ytd-tab-renderer:has(tp-yt-paper-tab[aria-label='Shorts'])",
    hide_comments:
      '#comments, ytd-comments, ytd-item-section-renderer:has(#comments)',
    hide_recommended:
      '#secondary, #secondary-inner, #related, ytd-watch-next-secondary-results-renderer',
    hide_subscriptions:
      "a[title='Subscriptions'], ytd-guide-entry-renderer:has(a[title='Subscriptions'])",
    hide_explore:
      "a[title='Explore'], ytd-guide-entry-renderer:has(a[title='Explore'])",
    hide_top_bar: 'ytd-masthead#masthead',
    disable_end_cards: '.ytp-ce-element',
    black_white: 'self',
  },
  tiktok: {
    hide_explore: "a[href*='/explore'], [data-e2e='nav-explore']",
    hide_live: "a[href*='/live'], [data-e2e='nav-live']",
    hide_comments:
      "[data-e2e='comment-icon'], [class*='DivCommentContainer'], [data-e2e='search-comment-container']",
    hide_search: "form[action='/search'], [data-e2e='search-box']",
    black_white: 'self',
  },
  instagram: {
    hide_stories: "[role='menu'] button:has(canvas), [aria-label='Stories']",
    hide_reels: "a[href*='/reels/'], [aria-label='Reels']",
    hide_explore: "a[href*='/explore/'], [aria-label='Explore']",
    hide_comments: "ul[class*='Xp1'], section:has(form[method='POST'])",
    black_white: 'self',
  },
  facebook: {
    hide_stories: "[aria-label='Stories']",
    hide_reels: "[aria-label='Reels']",
    hide_marketplace: "a[href*='/marketplace/'], [aria-label='Marketplace']",
    black_white: 'self',
  },
  x: {
    hide_explore: "a[href='/explore']",
    hide_trends:
      "[aria-label='Timeline: Trending now'], section:has([aria-label='Timeline: Trending now'])",
    hide_notifications: "a[href='/notifications']",
    hide_lists: "a[href*='/lists']",
    hide_communities: "a[href*='/communities']",
    black_white: 'self',
  },
  snapchat: {
    hide_stories: "a[href*='/stories']",
    hide_spotlight: "a[href*='/spotlight']",
    hide_chat: "a[href*='/chat']",
    black_white: 'self',
  },
};

let activeStyleEl: HTMLStyleElement | null = null;
let attributeObserver: MutationObserver | null = null;
let cachedRules: Record<string, string[]> = {};

// Self-initialize: load rules from storage and keep in sync.
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  chrome.storage.local.get('inAppRules').then((res) => {
    cachedRules = (res.inAppRules as Record<string, string[]>) || {};
    const domain = window.location.hostname.replace(/^www\./, '');
    if (domain) {
      checkInAppFeatures(domain);
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (!chrome.runtime?.id) {
      return;
    }
    if (changes.inAppRules) {
      cachedRules =
        (changes.inAppRules.newValue as Record<string, string[]>) || {};
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

function getStaticCss() {
  let css = '';
  // Collect all unique features across all platforms to generate comprehensive static rules
  const allFeatures = new Set<string>();
  Object.values(SELECTORS).forEach((platform) => {
    Object.keys(platform).forEach((f) => allFeatures.add(f));
  });

  for (const feature of allFeatures) {
    const attr = `stopaccess-hide-${feature.replace(/_/g, '-')}`;
    if (feature === 'black_white') {
      css += `html[${attr}="true"] { filter: grayscale(100%) !important; }\n`;
      continue;
    }

    // Find all selectors for this feature across all platforms
    const combinedSelectors: string[] = [];
    Object.values(SELECTORS).forEach((platform) => {
      if (platform[feature] && platform[feature] !== 'self') {
        platform[feature]
          .split(',')
          .forEach((s) => combinedSelectors.push(s.trim()));
      }
    });

    if (combinedSelectors.length > 0) {
      const rules = combinedSelectors
        .map((s) => `html[${attr}="true"] ${s}`)
        .join(',\n');
      css += `${rules} { display: none !important; }\n`;
    }
  }
  return css;
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
  if (!chrome.runtime?.id) {
    return;
  }

  // 1. Ensure static CSS is injected exactly once
  if (!activeStyleEl) {
    activeStyleEl = document.createElement('style');
    activeStyleEl.id = '__stopaccess_inapp_selectors__';
    activeStyleEl.textContent = getStaticCss();
    (document.head || document.documentElement).appendChild(activeStyleEl);
  }

  // 2. Derive which features should be active for this domain
  const platform = Object.keys(SELECTORS).find((k) => domain.includes(k));
  const activeFeatures = platform ? cachedRules[platform] || [] : [];

  // 3. Update attributes on <html> tag
  const html = document.documentElement;
  const currentActiveAttrs = new Set(
    activeFeatures.map((f) => `stopaccess-hide-${f.replace(/_/g, '-')}`),
  );

  // Remove any stale stopaccess attributes that shouldn't be here
  const allPossibleAttrs = new Set<string>();
  Object.values(SELECTORS).forEach((p) => {
    Object.keys(p).forEach((f) =>
      allPossibleAttrs.add(`stopaccess-hide-${f.replace(/_/g, '-')}`),
    );
  });

  allPossibleAttrs.forEach((attr) => {
    if (currentActiveAttrs.has(attr)) {
      if (html.getAttribute(attr) !== 'true') {
        html.setAttribute(attr, 'true');
      }
    } else {
      if (html.hasAttribute(attr)) {
        html.removeAttribute(attr);
      }
    }
  });

  startAttributeObserver();
}

/**
 * Ensures our attributes and style tag remain in place.
 * Much lighter than a full subtree observer.
 */
function startAttributeObserver() {
  if (attributeObserver || !chrome.runtime?.id) {
    return;
  }

  attributeObserver = new MutationObserver((mutations) => {
    if (!chrome.runtime?.id) {
      attributeObserver?.disconnect();
      return;
    }

    let needsRecheck = false;
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName?.startsWith('stopaccess-hide-')
      ) {
        // If someone else (site script) tried to change our attribute, we might need to fix it.
        // But to avoid loops, we only trigger a re-check if the value doesn't match our cache.
        needsRecheck = true;
        break;
      }
      if (mutation.type === 'childList') {
        // Ensure our style tag is still there
        if (activeStyleEl && !activeStyleEl.parentNode) {
          (document.head || document.documentElement).appendChild(
            activeStyleEl,
          );
        }
      }
    }

    if (needsRecheck) {
      const domain = window.location.hostname.replace(/^www\./, '');
      checkInAppFeatures(domain);
    }
  });

  attributeObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: false, // ONLY watch the <html> tag itself
  });
  if (document.head) {
    attributeObserver.observe(document.head, {
      childList: true,
      subtree: false,
    });
  }
}
