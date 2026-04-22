import { nextDNSApi } from '../../background/platformAdapter';
import { buildDashboardTabPath } from '@stopaccess/core';
import { toast } from '../../lib/toast';
import { renderCloudBanner, UI_TOKENS, UI_ICONS } from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import type { NextDNSRecreationTime } from '@stopaccess/types';

declare var chrome: any;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export async function renderSchedulePage(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  if (!container) {
    return;
  }

  const [isConfigured, { fg_nextdns_schedule }] = await Promise.all([
    nextDNSApi.isConfigured(),
    chrome.storage.local.get(['fg_nextdns_schedule']),
  ]);

  const isLocalMode = !isConfigured;

  // Guard: only build DOM once — subsequent calls update in-place
  if (!container.querySelector('#scheduleShell')) {
    if (context === 'popup') {
      _renderPopup(container);
      return;
    }

    if (isLocalMode) {
      const mockRecreation = {
        mon: { enabled: true, start: '18:00', end: '21:00' },
        tue: { enabled: true, start: '18:00', end: '21:00' },
        wed: { enabled: true, start: '18:00', end: '21:00' },
        thu: { enabled: true, start: '18:00', end: '21:00' },
        fri: { enabled: true, start: '17:00', end: '23:00' },
        sat: { enabled: true, start: '09:00', end: '23:00' },
        sun: { enabled: true, start: '09:00', end: '21:00' },
      };
      _renderPage(container, mockRecreation, isLocalMode);
      container
        .querySelector('#btn_upgrade_cloud_schedule')
        ?.addEventListener('click', () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
          });
        });
      return;
    }

    // No cache yet — build shell with whatever we have (empty = loading state)
    _renderPage(container, fg_nextdns_schedule || {}, false);
  } else if (context === 'popup') {
    return; // popup already rendered
  }

  // Background sync — update values in-place, no DOM wipe
  if (!isLocalMode) {
    nextDNSApi
      .getSchedules()
      .then((res) => {
        if (res.ok) {
          const recreation = res.data || {};
          const hasChanged =
            JSON.stringify(recreation) !== JSON.stringify(fg_nextdns_schedule);
          if (hasChanged) {
            chrome.storage.local.set({ fg_nextdns_schedule: recreation });
            _patchDaySlots(container, recreation);
          }
        }
      })
      .catch((e) => {
        if (!fg_nextdns_schedule && !container.querySelector('.day-slot')) {
          _renderError(container, e);
        }
      });
  }
}

function _renderPage(
  container: HTMLElement,
  recreation: any,
  isLocalMode: boolean = false,
): void {
  container.innerHTML = `
    <div id="scheduleShell" class="fg-max-w-[800px] fg-mx-auto fg-pb-20">

      ${isLocalMode ? _renderCloudRequiredBanner() : ''}

      <div class="${isLocalMode ? 'fg-opacity-40 fg-pointer-events-none' : ''}">

      <!-- Card -->
      <div class="glass-card fg-mx-auto fg-mt-4" style="background: ${
        COLORS.surface
      }; border: 1px solid ${
    COLORS.glassBorder
  }; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px ${
    COLORS.shadowSoft
  };">
        
        <!-- Header -->
        <div class="fg-flex fg-items-start fg-justify-between fg-p-5 fg-border-b fg-border-[${
          COLORS.glassBorder
        }]">
           <div>
             <h2 style="${UI_TOKENS.TEXT.HEADING}">Recreation Time</h2>
             <p style="${
               UI_TOKENS.TEXT.SUBTEXT
             }; margin-top: 4px; max-width: 400px;">Schedule your daily "Free Time" when all blocks are automatically paused so you can browse freely.</p>
           </div>
        </div>

        <div class="fg-p-5 fg-flex fg-flex-col fg-gap-3">
           ${DAY_KEYS.map((day, i) => {
             const data = recreation[day] || {
               enabled: false,
               start: '18:00',
               end: '20:30',
             };
             return `
              <div class="day-slot fg-flex fg-items-center fg-justify-between" style="min-height:46px;">
                <div class="fg-flex fg-items-center fg-gap-4 fg-w-[160px]">
                   <input type="checkbox" class="day-check custom-check" ${
                     data.enabled ? 'checked' : ''
                   } data-day="${day}">
                   <span style="${UI_TOKENS.TEXT.CARD_TITLE}">${
               DAY_LABELS[i]
             }</span>
                 </div>

                <div class="fg-flex fg-items-center fg-gap-4 ${
                  !data.enabled ? 'fg-opacity-60 fg-pointer-events-none' : ''
                } slot-inputs">
                   <input type="time" class="time-input fg-px-3" value="${
                     data.start
                   }" data-day="${day}" data-type="start"
                          style="background: ${
                            COLORS.glassBg
                          }; border: 1px solid ${
               COLORS.glassBorder
             }; border-radius: 8px; color: ${
               COLORS.text
             }; height: 42px; width: 120px; ${UI_TOKENS.TEXT.CARD_TITLE}">
                   
                   <span class="fg-text-[${
                     COLORS.muted
                   }] fg-opacity-30 fg-font-light fg-text-xl fg-flex fg-items-center">${
               UI_ICONS.ARROW_RIGHT
             }</span>
 
                   <input type="time" class="time-input fg-px-3" value="${
                     data.end
                   }" data-day="${day}" data-type="end"
                          style="background: ${
                            COLORS.glassBg
                          }; border: 1px solid ${
               COLORS.glassBorder
             }; border-radius: 8px; color: ${
               COLORS.text
             }; height: 42px; width: 120px; ${UI_TOKENS.TEXT.CARD_TITLE}">
                 </div>
              </div>
             `;
           }).join('')}
        </div>

        <!-- Footer -->
        <div class="fg-p-6 fg-border-t fg-border-[var(--fg-white-wash)] fg-flex fg-justify-end fg-gap-3">
           <button id="btnSaveMaster" class="fg-px-8 fg-py-2 fg-rounded-md fg-text-[14px] fg-font-bold fg-text-[${
             COLORS.onAccent
           }] fg-transition-all" style="background: ${
    COLORS.accent
  }; height: 42px;">Save</button>
        </div>
      </div>

       <div class="fg-mt-4 fg-px-4 fg-text-center">
         <p style="${
           UI_TOKENS.TEXT.FOOTNOTE
         }; max-width: 500px; margin: 0 auto;">
           Synchronizing these settings will update your NextDNS profile in the cloud. Changes might take a few minutes to reflect across all devices.
         </p>
       </div>

      </div>
    </div>

    <style>
      .custom-check {
        appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid ${COLORS.glassBorder};
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
      }
      .custom-check:checked {
        background: ${COLORS.accent};
        border-color: ${COLORS.accent};
      }
      .custom-check:checked::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: ${COLORS.onAccent};
        font-weight: 900;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .custom-check:checked {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
        background-size: 14px;
        background-position: center;
        background-repeat: no-repeat;
      }
      
      .time-input {
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s;
      }
      .time-input:hover { border-color: var(--fg-white-wash-strong) !important; }
      .time-input:focus { border-color: ${COLORS.accent} !important; }
    </style>
  `;

  _attachHandlers(container);
}

function _patchDaySlots(container: HTMLElement, recreation: any): void {
  container.querySelectorAll('.day-slot').forEach((slot) => {
    const checkbox = slot.querySelector('.day-check') as HTMLInputElement;
    const day = checkbox.dataset.day!;
    const data = recreation[day] || {
      start: '18:00',
      end: '20:30',
    };
    checkbox.checked = !!recreation[day];
    const inputs = slot.querySelector('.slot-inputs') as HTMLElement;
    inputs.classList.toggle('fg-opacity-60', !checkbox.checked);
    inputs.classList.toggle('fg-pointer-events-none', !checkbox.checked);

    const startInput = slot.querySelector(
      '.time-input[data-type="start"]',
    ) as HTMLInputElement;
    const endInput = slot.querySelector(
      '.time-input[data-type="end"]',
    ) as HTMLInputElement;
    startInput.value = data.start;
    endInput.value = data.end;
  });
}

function _attachHandlers(container: HTMLElement): void {
  // Checkbox interactions
  container.querySelectorAll('.day-check').forEach((check) => {
    check.addEventListener('change', () => {
      const slot = check.closest('.day-slot');
      const inputs = slot?.querySelector('.slot-inputs');
      if (inputs) {
        inputs.classList.toggle(
          'fg-opacity-30',
          !(check as HTMLInputElement).checked,
        );
        inputs.classList.toggle(
          'fg-pointer-events-none',
          !(check as HTMLInputElement).checked,
        );
      }
    });
  });

  // Master Save
  container
    .querySelector('#btnSaveMaster')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btnSaveMaster',
      ) as HTMLButtonElement;
      const originalText = btn.innerText;

      const payload: NextDNSRecreationTime = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      container.querySelectorAll('.day-slot').forEach((slot) => {
        const checkbox = slot.querySelector('.day-check') as HTMLInputElement;
        const day = checkbox.dataset.day!;
        if (checkbox.checked) {
          const start = (
            slot.querySelector(
              '.time-input[data-type="start"]',
            ) as HTMLInputElement
          ).value;
          const end = (
            slot.querySelector(
              '.time-input[data-type="end"]',
            ) as HTMLInputElement
          ).value;

          const dayKey = day as keyof NextDNSRecreationTime;
          if (dayKey !== 'timezone') {
            payload[dayKey] = {
              start,
              end,
            };
          }
        } else {
          // Explicitly null or omitted. Usually, omitting is better.
          // But some APIs prefer null to clear. Let's follow the 'omit' pattern.
        }
      });

      btn.innerText = 'Syncing...';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      try {
        const res = await nextDNSApi.updateSchedules(payload);
        if (res.ok) {
          toast.success('NextDNS Synchronized');
          chrome.storage.local.set({ fg_nextdns_schedule: payload });
          btn.innerHTML = `Saved <span style="display:inline-flex; vertical-align:middle; margin-left:4px; transform:scale(1.2);">${UI_ICONS.CHECK}</span>`;
          setTimeout(() => {
            btn.innerText = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
          }, 1500);
        } else {
          throw new Error(res.error?.message || 'Sync failed');
        }
      } catch (e: any) {
        toast.error(e.message || 'Push failed');
        btn.innerText = originalText;
        btn.style.opacity = '1';
        btn.disabled = false;
      }
    });
}

function _renderCloudRequiredBanner(): string {
  return renderCloudBanner(
    'StopAccess Control Hub',
    'Schedules are synchronized across all your devices via NextDNS. Link your profile to activate automation.',
    'btn_upgrade_cloud_schedule',
    'Sync Cloud',
  );
}

function _renderError(container: HTMLElement, e: any): void {
  container.innerHTML = `
    <div class="glass-card fg-p-12 fg-text-center fg-mx-auto fg-mt-12" style="max-width: 440px; background: ${
      COLORS.surface
    }; border: 1px solid var(--fg-danger-border); border-radius: 20px;">
      <div class="fg-text-lg fg-font-black fg-mb-2">Access Denied</div>
      <div class="fg-text-xs fg-text-[${COLORS.muted}] fg-mb-8">${
    e.message || 'Identity verification failed'
  }</div>
      <button id="btn_retry_access" class="btn-premium fg-mx-auto fg-w-full" style="height: 56px; border-radius: 12px; background: ${
        COLORS.accent
      }; color: ${COLORS.onAccent}; font-weight: 900;">Retry Access</button>
    </div>
  `;

  container
    .querySelector('#btn_retry_access')
    ?.addEventListener('click', () => {
      window.location.reload();
    });
}

function _renderPopup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="fg-flex fg-justify-between fg-items-center fg-mb-4 fg-px-1">
       <div class="fg-text-[10px] fg-font-black fg-text-[${COLORS.muted}]  fg-tracking-[1.5px]">Recreation</div>
    </div>
    <div class="glass-card fg-p-5 fg-text-center" style="border: 1px solid var(--fg-white-wash); border-radius: 12px; background: ${COLORS.surface};">
       <div class="fg-text-xs fg-font-bold fg-text-[${COLORS.text}] fg-opacity-80">Independent Cloud Scheduling</div>
    </div>
    <button class="btn-premium fg-w-full fg-mt-6 fg-text-[11px]" id="btn_full_schedule" style="height: 48px; border-radius: 12px; background: ${COLORS.overlaySubtle}; border: 1px solid var(--fg-white-wash-strong); color: ${COLORS.onAccent}; font-weight: 800;">Open Cloud Hub</button>
  `;
  container
    .querySelector('#btn_full_schedule')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('schedule')),
      });
    });
}
