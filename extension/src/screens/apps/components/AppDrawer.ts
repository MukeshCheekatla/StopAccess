import { COLORS } from '@/ui/theme/designTokens';
import { UI_TOKENS, UI_ICONS } from '@/ui/theme/uiTokens';
import { renderBrandLogo } from '@/ui/components/icons';
import { NEXTDNS_SERVICES } from '@stopaccess/core';

/**
 * Discovery Drawer - Companion Integrated Edition
 * Features smooth item removal and live mascot interaction.
 */
export function renderDiscoveryDrawer(): string {
  return `
    <style>
      @keyframes fg-aura-in {
        from { opacity: 0; backdrop-filter: blur(0px); }
        to { opacity: 1; backdrop-filter: blur(32px); }
      }
      @keyframes fg-aura-out {
        from { opacity: 1; backdrop-filter: blur(32px); }
        to { opacity: 0; backdrop-filter: blur(0px); }
      }
      @keyframes fg-panel-slide {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fg-panel-out {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.95); opacity: 0; }
      }
      @keyframes fg-grid-fade {
        from { transform: translateY(15px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fg-card-disappear {
        to { transform: scale(0.8) translateY(-10px); opacity: 0; filter: blur(4px); }
      }

      .fg-aura-overlay.closing {
        animation: fg-aura-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }
      .fg-aura-drawer-root.closing #targetDrawer {
        animation: fg-panel-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }

      .fg-aura-overlay {
        animation: fg-aura-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .fg-aura-sidebar {
        animation: fg-panel-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
      }
      .fg-aura-grid-container {
        animation: fg-grid-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
      }

      .aura-card.disappearing {
        animation: fg-card-disappear 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: none;
      }

      /* Integrated Theme Variables */
      :host, .fg-aura-drawer-root {
        --drawer-bg: ${COLORS.surface};
        --drawer-sidebar-bg: ${COLORS.sidebarBg};
        --drawer-card-hover: ${COLORS.surfaceHover};
        --drawer-border: ${COLORS.glassBorder};
        --drawer-shadow: ${COLORS.shadowStrong};
      }

      .aura-search-capsule {
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        background: var(--drawer-card-hover);
        backdrop-filter: blur(12px);
        border: 1px solid var(--drawer-border);
        width: 100%;
        max-width: 600px;
      }
      .aura-search-capsule:focus-within {
        background: var(--drawer-bg);
        border-color: ${COLORS.muted};
        box-shadow: 0 0 0 4px ${
          COLORS.muted
        }10, 0 12px 40px -12px var(--drawer-shadow);
        max-width: 640px;
      }

      .aura-nav-item {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        opacity: 0.6;
        padding: 12px 20px;
        margin: 2px 0;
        color: ${COLORS.text};
      }
      .aura-nav-item:hover {
        opacity: 1;
        background: var(--drawer-card-hover);
      }
      .aura-nav-item.active {
        color: ${COLORS.accent};
        background: ${COLORS.accentSoft};
        opacity: 1;
        font-weight: 600;
        transform: translateX(4px);
      }

      #auraNavIndicator {
        position: absolute;
        right: 0;
        width: 3px;
        background: ${COLORS.accent};
        border-radius: 4px 0 0 4px;
        pointer-events: none;
        z-index: 10;
      }

      .aura-card {
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        background: transparent;
        border: 1px solid transparent;
      }
      .aura-card:not(.disappearing):hover {
        background: var(--drawer-card-hover);
        border-color: var(--drawer-border);
        transform: translateY(-2px);
      }
      .aura-card:active {
        transform: scale(0.97);
      }

      #drawerGrid::-webkit-scrollbar {
        width: 4px;
      }
      #drawerGrid::-webkit-scrollbar-track {
        background: transparent;
      }
      #drawerGrid::-webkit-scrollbar-thumb {
        background: var(--drawer-border);
        border-radius: 10px;
      }

      .aura-corner-close {
        position: absolute;
        top: 28px;
        right: 28px;
        z-index: 10;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--drawer-card-hover);
        border: 1px solid var(--drawer-border);
        color: ${COLORS.muted};
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .aura-corner-close:hover {
        background: ${COLORS.accentSoft};
        color: ${COLORS.accent};
        border-color: ${COLORS.accent}40;
        transform: scale(1.1);
      }
    </style>

    <div id="targetDrawerOverlay" class="fg-aura-overlay fg-fixed fg-inset-0 fg-z-[1000] fg-flex fg-items-center fg-justify-center fg-aura-drawer-root" 
      style="display: none; background: ${COLORS.overlayStrong};">
      
      <div id="targetDrawer" class="fg-relative fg-w-[1150px] fg-h-[88vh] fg-flex fg-overflow-hidden fg-shadow-2xl" 
        style="background: var(--drawer-bg); border: 1px solid var(--drawer-border); border-radius: 48px;">
        
        <button id="btnCloseTargetDrawer" class="aura-corner-close">
           ${UI_ICONS.CLOSE.replace('width="14"', 'width="20"').replace(
             'height="14"',
             'height="20"',
           )}
        </button>

        <!-- Sidebar Navigation -->
        <div class="fg-aura-sidebar fg-w-72 fg-flex fg-flex-col" 
          style="background: var(--drawer-sidebar-bg); border-right: 1px solid var(--drawer-border);">
           
           <!-- Title in Sidebar -->
           <div class="fg-px-8 fg-pt-12 fg-pb-8">
              <h1 style="${
                UI_TOKENS.TEXT.HERO
              }; font-weight: 700; font-size: 24px; letter-spacing: -0.02em; color: ${
    COLORS.text
  };">Discovery</h1>
              <div style="${
                UI_TOKENS.TEXT.FOOTNOTE
              }; opacity: 0.4; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em; color: ${
    COLORS.text
  };">Catalog Browser</div>
           </div>

           <!-- Nav Items - Pushed up for Bot -->
           <div id="auraNavContainer" class="fg-flex-1 fg-flex fg-flex-col fg-justify-start fg-pt-10 fg-px-4 fg-space-y-1 fg-relative">
                <div id="auraNavIndicator" style="transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);"></div>
                <div class="aura-nav-item active fg-flex fg-items-center fg-gap-4 fg-rounded-2xl fg-cursor-pointer" data-target="Social">
                  <div class="aura-nav-icon">
                    ${UI_ICONS.SOCIAL.replace(
                      'width="14"',
                      'width="18"',
                    ).replace('height="14"', 'height="18"')}
                  </div>
                  <span style="${UI_TOKENS.TEXT.NAV_ITEM}">Social</span>
                </div>

                <div class="aura-nav-item fg-flex fg-items-center fg-gap-4 fg-rounded-2xl fg-cursor-pointer" data-target="Entertainment">
                  <div class="aura-nav-icon">
                    ${UI_ICONS.VIDEO.replace(
                      'width="14"',
                      'width="18"',
                    ).replace('height="14"', 'height="18"')}
                  </div>
                  <span style="${UI_TOKENS.TEXT.NAV_ITEM}">Entertainment</span>
                </div>

                <div class="aura-nav-item fg-flex fg-items-center fg-gap-4 fg-rounded-2xl fg-cursor-pointer" data-target="Gaming">
                  <div class="aura-nav-icon">
                    ${UI_ICONS.GAMES.replace(
                      'width="14"',
                      'width="18"',
                    ).replace('height="14"', 'height="18"')}
                  </div>
                  <span style="${UI_TOKENS.TEXT.NAV_ITEM}">Gaming</span>
                </div>

                <div class="aura-nav-item fg-flex fg-items-center fg-gap-4 fg-rounded-2xl fg-cursor-pointer" data-target="Productivity">
                  <div class="aura-nav-icon">
                    ${UI_ICONS.ZAP.replace('width="14"', 'width="18"').replace(
                      'height="14"',
                      'height="18"',
                    )}
                  </div>
                  <span style="${UI_TOKENS.TEXT.NAV_ITEM}">Productivity</span>
                </div>

                <div class="aura-nav-item fg-flex fg-items-center fg-gap-4 fg-rounded-2xl fg-cursor-pointer" data-target="Lifestyle">
                  <div class="aura-nav-icon">
                    ${UI_ICONS.PALETTE.replace(
                      'width="14"',
                      'width="18"',
                    ).replace('height="14"', 'height="18"')}
                  </div>
                  <span style="${UI_TOKENS.TEXT.NAV_ITEM}">Lifestyle</span>
                </div>
           </div>

           <!-- Bot Mount Point in Sidebar Footer -->
           <div class="fg-p-6 fg-mb-4">
              <div id="auraBotMount" style="width: 100%; min-height: 140px; border-radius: 24px; overflow: visible;">
                 <!-- Byte Mascot will be rendered here via React -->
              </div>
              <div id="drawerFooterText" style="${
                UI_TOKENS.TEXT.FOOTNOTE
              }; font-size: 10px; text-align: center; font-weight: 700; color: ${
    COLORS.muted
  }; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin-top: 12px;">
                 SCANNING...
              </div>
           </div>
        </div>

        <!-- Main Content Area -->
        <div class="fg-flex-1 fg-flex fg-flex-col">
           
           <div class="fg-px-10 fg-pt-8 fg-pb-6 fg-flex fg-items-center fg-gap-6">
              <div class="aura-search-capsule fg-flex-1 fg-flex fg-items-center fg-rounded-full">
                 <div class="fg-pl-6 fg-text-[${COLORS.muted}]">
                   ${UI_ICONS.SEARCH.replace(
                     'width="14"',
                     'width="18"',
                   ).replace('height="14"', 'height="18"')}
                 </div>
                 <input type="text" id="drawerSearch" placeholder="Search apps or domains..." 
                   class="fg-w-full fg-h-12 fg-bg-transparent fg-border-none fg-rounded-full fg-pl-4 fg-pr-6 fg-text-[15px] fg-font-medium fg-text-[${
                     COLORS.text
                   }] fg-outline-none fg-placeholder-[${COLORS.muted}]/40"
                   style="border: none; outline: none; box-shadow: none;">
              </div>
           </div>

           <!-- Scrollable Grid -->
           <div id="drawerGrid" class="fg-aura-grid-container fg-flex-1 fg-overflow-y-auto fg-px-10 fg-pb-10 fg-grid fg-grid-cols-5 fg-gap-4 fg-scroll-smooth">
              <!-- Content -->
           </div>

           <div class="fg-px-10 fg-py-4 fg-flex fg-justify-end">
              <div style="${
                UI_TOKENS.TEXT.FOOTNOTE
              }; opacity: 0.3; font-weight: 600; color: ${
    COLORS.text
  };">ESC TO CLOSE</div>
           </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Discovery Card
 */
export function renderDiscoveryCard(
  id: string,
  name: string,
  isActive: boolean,
  staggerIndex: number,
): string {
  const delay = staggerIndex * 0.008;
  return `
    <div class="aura-card fg-flex fg-flex-col fg-items-center fg-justify-center fg-p-4 fg-rounded-[32px] fg-cursor-pointer fg-relative"
         data-id="${id}" data-name="${name}"
         style="animation: fg-grid-fade 0.4s ease-out ${delay}s both;">
      
      <div class="fg-relative fg-mb-3">
        ${renderBrandLogo(id, name, 40)}
        
        ${
          isActive
            ? `
          <div class="fg-absolute fg--top-1 fg--right-1 fg-bg-[${
            COLORS.green
          }] fg-text-[${
                COLORS.onAccent
              }] fg-rounded-full fg-p-1 fg-border-2" style="border-color: var(--drawer-bg);">
            ${UI_ICONS.CHECK.replace('width="14"', 'width="10"').replace(
              'height="14"',
              'height="10"',
            )}
          </div>
        `
            : ''
        }
      </div>

      <div style="${
        UI_TOKENS.TEXT.CARD_TITLE
      }; font-size: 13px; font-weight: 500; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.8; color: ${
    COLORS.text
  };">
        ${name}
      </div>
    </div>
  `;
}

/**
 * Centralized Drawer Grid Logic
 */
export function renderDrawerGridInternal(
  container: HTMLElement,
  footerText: HTMLElement | null,
  rules: any[],
  search: string = '',
  onAddDomain?: (domain: string) => void,
) {
  const drawerServices = NEXTDNS_SERVICES.filter(
    (s) =>
      !rules.some((r: any) => (r.customDomain || r.packageName) === s.id) &&
      (s.name.toLowerCase().includes(search) ||
        s.id.toLowerCase().includes(search)),
  );

  let html = '';
  const searchTrimmed = search.trim().toLowerCase();

  // Custom Domain Card - UX Optimized Edition
  if (
    searchTrimmed.length > 2 &&
    (searchTrimmed.includes('.') || searchTrimmed.length > 3)
  ) {
    let resolvedDomain = searchTrimmed;
    if (!searchTrimmed.includes('.')) {
      const domainMap: Record<string, string> = {
        google: 'google.com',
        youtube: 'youtube.com',
        facebook: 'facebook.com',
        twitter: 'x.com',
        x: 'x.com',
        insta: 'instagram.com',
        instagram: 'instagram.com',
        tiktok: 'tiktok.com',
        netflix: 'netflix.com',
        amazon: 'amazon.com',
        apple: 'apple.com',
        microsoft: 'microsoft.com',
      };
      resolvedDomain = domainMap[searchTrimmed] || searchTrimmed;
    }

    const alreadyBlocked = rules.some(
      (r: any) =>
        (r.customDomain || r.packageName || '').toLowerCase() ===
        resolvedDomain,
    );

    if (!alreadyBlocked) {
      const iconHtml = renderBrandLogo(resolvedDomain, resolvedDomain, 32);

      html += `
        <div class="fg-col-span-5 fg-mb-10 aura-custom-block-row">
          <div class="fg-p-8 fg-rounded-[40px] fg-bg-[var(--drawer-sidebar-bg)] fg-border fg-border-[var(--drawer-border)] fg-flex fg-items-center fg-justify-between fg-shadow-xl">
            <div class="fg-flex fg-items-center fg-gap-6">
              <div class="fg-w-16 fg-h-16 fg-flex fg-items-center fg-justify-center fg-relative fg-overflow-hidden">
                <div class="fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[${
                  COLORS.text
                }] fg-opacity-20">
                    ${UI_ICONS.GLOBE.replace(
                      'width="14"',
                      'width="28"',
                    ).replace('height="14"', 'height="28"')}
                </div>
                <div class="fg-relative fg-z-10">
                   ${iconHtml}
                </div>
              </div>
              <div>
                <div style="${
                  UI_TOKENS.TEXT.CARD_TITLE
                }; font-size: 18px; font-weight: 700; color: ${
        COLORS.text
      };">Block "${resolvedDomain}"</div>
                <div style="${UI_TOKENS.TEXT.FOOTNOTE}; color: ${
        COLORS.muted
      }; font-size: 13px; margin-top: 4px;">
                  Press <strong style="color: ${
                    COLORS.text
                  };">Enter</strong> to add this domain immediately
                </div>
              </div>
            </div>
            <button class="fg-h-14 fg-px-8 fg-rounded-2xl fg-flex fg-items-center fg-gap-3 fg-font-bold fg-transition-all hover:fg-scale-105 active:fg-scale-95" 
              style="background: ${COLORS.accentSoft}; color: ${COLORS.text};"
              id="btnAddDomainDrawer" data-domain="${resolvedDomain}">
              Add Block
            </button>
          </div>
        </div>`;
    }
  }

  // Grouping
  const groups: Record<string, typeof drawerServices> = {};
  drawerServices.forEach((s) => {
    const cat = s.category || 'Other';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(s);
  });

  const order = [
    'Social',
    'Entertainment',
    'Gaming',
    'Productivity',
    'Lifestyle',
    'Other',
  ];
  const sortedCategories = Object.keys(groups).sort(
    (a, b) =>
      (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
      (order.indexOf(b) === -1 ? 99 : order.indexOf(b)),
  );

  html += sortedCategories
    .map((category) => {
      const items = groups[category];
      return `
      <div class="fg-col-span-5 ${
        category === sortedCategories[0] ? 'fg-mt-4' : 'fg-mt-10'
      } fg-mb-4 drawer-category-group" data-cat="${category}">
        <div class="fg-flex fg-items-center fg-gap-4">
          <div style="${
            UI_TOKENS.TEXT.BADGE
          }; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: ${
        COLORS.muted
      }; font-weight: 800; background: var(--drawer-card-hover); border: 1px solid var(--drawer-border); padding: 5px 14px; border-radius: 10px;">${category}</div>
          <div class="fg-flex-1 fg-h-px" style="background: var(--drawer-border);"></div>
        </div>
      </div>
      ${items
        .map((s, idx) => {
          const isBlocked = rules.some(
            (r: any) => (r.customDomain || r.packageName) === s.id,
          );
          return renderDiscoveryCard(s.id, s.name, isBlocked, idx);
        })
        .join('')}`;
    })
    .join('');

  if (drawerServices.length === 0 && !html) {
    const isShort = searchTrimmed.length > 0 && searchTrimmed.length < 3;
    html = `
      <div class="fg-col-span-5 fg-py-20 fg-flex fg-flex-col fg-items-center fg-justify-center fg-text-center">
        <div style="${UI_TOKENS.TEXT.SUBTEXT}; opacity: 0.5;">
          ${
            isShort
              ? 'Type a full domain to add a custom block...'
              : 'No results found. Try typing a specific domain.'
          }
        </div>
      </div>`;
  }

  container.innerHTML = html;

  // Attach Add Domain listener
  const addBtn = container.querySelector('#btnAddDomainDrawer');
  if (addBtn && onAddDomain) {
    addBtn.addEventListener('click', () => {
      const domain = addBtn.getAttribute('data-domain');
      if (domain) {
        onAddDomain(domain);
      }
    });
  }

  if (footerText) {
    footerText.innerHTML = `${drawerServices.length} SERVICES AVAILABLE`;
  }
}
