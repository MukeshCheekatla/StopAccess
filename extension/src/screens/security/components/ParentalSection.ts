import type { NextDNSParentalControlSettings } from '@stopaccess/types';

const iconSearch =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const iconYoutube =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 11.72 1 11.72s0 3.58.46 5.3a2.78 2.78 0 0 0 1.94 2C5.12 19.44 12 19.44 12 19.44s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.3 23 11.72 23 11.72s0-3.58-.46-5.3z"/><polygon points="9.75 15.02 15.5 11.72 9.75 8.42 9.75 15.02"/></svg>';
const iconShield =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

export function renderParentalSection(
  parental: NextDNSParentalControlSettings | null,
): string {
  if (!parental) {
    return '';
  }

  const controls = [
    {
      key: 'safeSearch',
      label: 'SafeSearch',
      tooltip:
        'Forces "SafeSearch" across search engines like Google, Bing, and DuckDuckGo to filter out explicit content.',
      desc: 'Filter explicit results on search engines.',
      icon: iconSearch,
      active: parental.safeSearch,
    },
    {
      key: 'youtubeRestrictedMode',
      label: 'YouTube Restricted Mode',
      tooltip:
        "Enables YouTube's restricted mode to hide potentially mature videos and comments.",
      desc: 'Filter out mature videos on YouTube.',
      icon: iconYoutube,
      active: parental.youtubeRestrictedMode,
    },
    {
      key: 'blockBypass',
      label: 'Block Bypass Methods',
      tooltip:
        'Prevents the use of tunnels like VPNs, Tor, and proxies that users might use to circumvent your DNS policies.',
      desc: 'Block VPNs, proxies, and Tor.',
      icon: iconShield,
      active: parental.blockBypass,
    },
  ];

  const activeCount = controls.filter((c) => c.active).length;

  return `
    <div class="app-card fg-mb-4 fg-p-5 fg-rounded-3xl">
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
        <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
          <span class="fg-text-[#3b82f6]">${iconShield}</span> Parental Control
        </div>
        <span class="fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.8px] fg-py-[3px] fg-px-[10px] fg-rounded-full" style="background: var(--fg-glass-bg); color: var(--fg-text); opacity: 0.8; border: 1px solid var(--fg-glass-border);">
          ${activeCount} ACTIVE
        </span>
      </div>

      <div class="fg-grid fg-grid-cols-3 fg-gap-2">
        ${controls
          .map(
            (ctrl) => `
          <div class="security-toggle-row fg-flex fg-items-center fg-gap-4 fg-p-5 fg-rounded-3xl fg-cursor-pointer fg-transition-all fg-duration-150"
            data-key="${ctrl.key}"
            style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"
            onmouseenter="this.style.transform='translateY(-2px)';this.style.opacity='0.8'"
            onmouseleave="this.style.transform='';this.style.opacity='1'"
          >
            <div class="fg-relative fg-shrink-0">
              <span class="fg-text-[var(--muted)]">${ctrl.icon}</span>
            </div>

            <div class="fg-flex-1 fg-min-w-0">
              <div class="fg-flex fg-items-center fg-gap-2 fg-mb-[2px]">
                <div class="fg-text-sm fg-font-bold fg-leading-[1.3] fg-text-[var(--text)]">
                  ${ctrl.label}
                </div>
                <div
                  class="fg-tooltip fg-info-icon"
                  data-tooltip="${ctrl.tooltip || ''}"
                >
                  i
                </div>
              </div>
              <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-leading-snug">
                ${ctrl.desc}
              </div>
            </div>

            <div class="fg-shrink-0">
              <button
                class="security-toggle-btn fg-relative fg-shrink-0 fg-cursor-pointer ${
                  ctrl.active ? 'active' : ''
                }"
                data-key="${ctrl.key}"
                aria-checked="${ctrl.active}"
                role="switch"
                style="width: 32px; height: 18px; border-radius: 9px; border: none;
                  background: ${
                    ctrl.active ? 'var(--green)' : 'var(--fg-glass-bg)'
                  };
                  border: 1px solid ${
                    ctrl.active ? 'var(--green)' : 'var(--fg-glass-border)'
                  };
                  transition: background 0.2s ease; outline: none;"
              >
                <span style="position: absolute; top: 2px; left: ${
                  ctrl.active ? '16px' : '2px'
                };
                  width: 14px; height: 14px; border-radius: 50%;
                  background: white; transition: left 0.2s ease;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
              </button>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}
