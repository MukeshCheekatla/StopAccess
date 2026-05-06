import { NEXTDNS_CATEGORIES, escapeHtml } from '@stopaccess/core';
import {
  getCategoryBadge,
  getRuleActiveState,
  UI_TOKENS,
  UI_ICONS,
  renderInfoTooltip,
  renderSectionBadge,
} from '../../../ui/ui';
import {
  CATEGORY_COLORS,
  COLORS,
  DEFAULT_CATEGORY_COLOR,
} from '../../../ui/theme/designTokens';

export function renderCategoryCard(
  category: any,
  rules: any[],
  lockedDomains: string[] = [],
  passes: any = {},
  isConfigured: boolean = false,
) {
  const localRule = rules.find(
    (rule: any) => rule.packageName === category.id && rule.type === 'category',
  );
  // Prioritize NextDNS cloud state if local rule doesn't have a specific override,
  // or if local rule doesn't exist yet.
  const active =
    localRule !== undefined
      ? getRuleActiveState(localRule, passes)
      : category.active || false;
  const badge = getCategoryBadge(category);
  const isLocked = lockedDomains.includes(category.id.toLowerCase());

  const theme = CATEGORY_COLORS[category.id] || DEFAULT_CATEGORY_COLOR;

  const descMap: Record<string, { full: string; short: string }> = {
    porn: {
      full: 'Blocks adult and pornographic content. It includes escort sites, pornhub.com and similar domains.',
      short: 'Blocks adult and pornographic content.',
    },
    gambling: {
      full: 'Blocks gambling content.',
      short: 'Blocks gambling content.',
    },
    dating: {
      full: 'Blocks all dating websites & apps.',
      short: 'Blocks all dating websites & apps.',
    },
    piracy: {
      full: 'Blocks P2P websites, protocols, copyright-infringing streaming websites and generic video hosting websites used mainly for illegally distributing copyrighted content.',
      short: 'Blocks P2P and copyright-infringing sites.',
    },
    'social-networks': {
      full: 'Blocks all social networks sites and apps (Facebook, Instagram, TikTok, Reddit, etc.). Does not block messaging apps.',
      short: 'Blocks social networks and apps (FB, Instagram, TikTok, etc).',
    },
    games: {
      full: 'Blocks online gaming websites, online gaming apps and online gaming networks (Xbox Live, PlayStation Network, etc.).',
      short: 'Blocks online gaming apps and networks (Xbox, PSN, etc).',
    },
    'video-streaming': {
      full: 'Blocks video streaming services (YouTube, Netflix, Disney+, illegal streaming websites, video porn websites, etc.) and video-based social networks (TikTok, etc.). This can also help in reducing bandwidth usage on any network.',
      short: 'Blocks video services (YouTube, Netflix, TikTok, etc).',
    },
  };
  const categoryInfo = descMap[category.id] || {
    full: category.description || '',
    short: category.description || '',
  };

  return `
    <div class="service-card ${active ? 'active' : ''}" style="
      display:flex; flex-direction:column; gap: 0; height: auto; padding: 0; box-shadow: none; scroll-snap-align: start;
    ">
      <div style="display:flex; align-items:center; gap: 10px; justify-content:space-between; width: 100%; padding: 14px 16px;">
        <div style="display:flex; align-items:center; gap: 10px; min-width: 0; flex: 1;">
       <div style="width: 40px; height: 40px; border-radius: 12px; background: color-mix(in srgb, ${theme}, transparent 85%); color: ${theme}; border: 1px solid color-mix(in srgb, ${theme}, transparent 75%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
         ${badge}
       </div>
           <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
              <div style="display: flex; align-items: center; gap: 0;">
                <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${
                  UI_TOKENS.TEXT.CARD_TITLE
                }">${escapeHtml(category.name)}</div>
                ${renderInfoTooltip(categoryInfo.full, 'up', 'left')}
              </div>
              <div style="${
                UI_TOKENS.TEXT.SUBTEXT
              } line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px;">${escapeHtml(
    categoryInfo.short,
  )}</div>
              ${'' /* Blocked badge removed for cleaner UI */}
           </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked || !isConfigured ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}"
  aria-checked="${active}" role="switch">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          ${
            isLocked
              ? `<div style="${UI_TOKENS.TEXT.BADGE} opacity:0.5;">Lock</div>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

export function renderCategoriesTab(
  rules: any[],
  lockedDomains: string[],
  passes: any,
  availableCategories: any[],
  isConfigured: boolean,
) {
  const allCategories = NEXTDNS_CATEGORIES.map((std) => {
    const synced = availableCategories.find((ac: any) => ac.id === std.id);
    return { ...std, active: synced?.active ?? false };
  });
  const visibleCategories = allCategories;
  const activeCount = visibleCategories.filter((c) => c.active).length;
  const disabledWarning = !isConfigured
    ? `<div style="padding: 16px; border-radius: 12px; background: ${
        COLORS.amberSoft
      }; border: 1px solid ${COLORS.amberBorder}; margin-bottom: 24px; color: ${
        COLORS.amberText
      }; ${
        UI_TOKENS.TEXT.CARD_TITLE
      } display: flex; align-items: center; gap: 10px;">
           ${UI_ICONS.ALERT.replace('width="14"', 'width="18"').replace(
             'height="14"',
             'height="18"',
           )}
           DNS profile required to turn on categories.
         </div>`
    : '';

  return `
      ${disabledWarning}
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid ${
        COLORS.glassBorder
      }; padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="${UI_TOKENS.TEXT.HEADING}">Add a Category</div>
            ${
              activeCount > 0 ? renderSectionBadge(`${activeCount} active`) : ''
            }
          </div>
          <div style="${
            UI_TOKENS.TEXT.SUBTEXT
          }; margin-top: 4px;">Profile-wide blocks for social, streaming, gambling, and more.</div>
        </div>
      </div>
      <div class="service-grid">
        ${visibleCategories
          .map((cat) =>
            renderCategoryCard(cat, rules, lockedDomains, passes, isConfigured),
          )
          .join('')}
      </div>
    `;
}
