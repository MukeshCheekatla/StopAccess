import { nextDNSApi } from '../../background/platformAdapter';
import { buildDashboardTabPath } from '@stopaccess/core';
import { toast } from '../../lib/toast';
import { renderCloudBanner, renderLoader, UI_TOKENS } from '../../lib/ui';

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

  const isConfigured = await nextDNSApi.isConfigured();
  const isLocalMode = !isConfigured;

  // Render the skeleton first
  container.innerHTML = `
    <div class="fg-max-w-[760px] fg-mx-auto fg-animate-fade-in" style="min-height: calc(100vh - 180px); display:flex; flex-direction:column; justify-content:center;">
      ${isLocalMode ? _renderCloudRequiredBanner() : ''}
      <div id="schedule_content_container" class="${
        isLocalMode ? 'fg-opacity-40 fg-pointer-events-none' : ''
      }">
        <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-mt-24">
          ${renderLoader('Contacting Control Hub', 'fg-mt-24')}
        </div>
      </div>
    </div>
  `;

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
    const content = container.querySelector('#schedule_content_container');
    if (content) {
      _renderPage(content as HTMLElement, mockRecreation);
    }

    container
      .querySelector('#btn_upgrade_cloud_schedule')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
    return;
  }

  try {
    const res = await nextDNSApi.getSchedules();
    if (!res.ok) {
      throw res.error;
    }

    const recreation = res.data || {};

    if (context === 'popup') {
      _renderPopup(container);
    } else {
      _renderPage(container, recreation);
    }
  } catch (e: any) {
    _renderError(container, e);
  }
}

function _renderPage(container: HTMLElement, recreation: any): void {
  container.innerHTML = `
    <div class="fg-max-w-[800px] fg-mx-auto fg-animate-fade-in fg-pb-20">
      
      <!-- User Screenshot Fidelity Modal -->
      <div class="glass-card fg-mx-auto fg-mt-4" style="background: var(--fg-surface); border: 1px solid var(--fg-glass-border); border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,23,42,0.12);">
        
        <!-- Header -->
        <div class="fg-flex fg-items-start fg-justify-between fg-p-5 fg-border-b fg-border-white/[0.08]">
           <div>
             <h2 style="${UI_TOKENS.TEXT.HEADING}">Recreation Time</h2>
             <p style="${
               UI_TOKENS.TEXT.SUBTEXT
             }; margin-top: 4px; max-width: 400px;">Schedule your daily "Free Time" when all blocks are automatically paused so you can browse freely.</p>
           </div>
           <button class="fg-text-white/40 hover:fg-text-white/80 fg-transition-colors fg-mt-1">✕</button>
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
                          style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 8px; color: var(--fg-text); height: 42px; width: 120px; ${
                            UI_TOKENS.TEXT.CARD_TITLE
                          }">
                   
                   <span class="fg-text-white/30 fg-font-light fg-text-xl">→</span>
 
                   <input type="time" class="time-input fg-px-3" value="${
                     data.end
                   }" data-day="${day}" data-type="end"
                          style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 8px; color: var(--fg-text); height: 42px; width: 120px; ${
                            UI_TOKENS.TEXT.CARD_TITLE
                          }">
                 </div>
              </div>
             `;
           }).join('')}
        </div>

        <!-- Footer -->
        <div class="fg-p-6 fg-border-t fg-border-white/[0.05] fg-flex fg-justify-end fg-gap-3">
           <button class="fg-px-6 fg-py-2 fg-rounded-md fg-text-[14px] fg-font-semibold fg-text-white/60 hover:fg-bg-white/5 fg-border fg-border-white/10 fg-transition-all" style="height: 42px;">Cancel</button>
           <button id="btnSaveMaster" class="fg-px-8 fg-py-2 fg-rounded-md fg-text-[14px] fg-font-bold fg-text-white fg-transition-all" style="background: var(--fg-accent); height: 42px;">Save</button>
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

    <style>
      .custom-check {
        appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid var(--fg-glass-border);
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
      }
      .custom-check:checked {
        background: var(--fg-accent);
        border-color: var(--fg-accent);
      }
      .custom-check:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-weight: 900;
        font-size: 12px;
      }
      
      .time-input {
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s;
      }
      .time-input:hover { border-color: rgba(255,255,255,0.2) !important; }
      .time-input:focus { border-color: var(--fg-accent) !important; }

      @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .fg-animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
    </style>
  `;

  _attachHandlers(container);
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

      const payload: any = {};
      container.querySelectorAll('.day-slot').forEach((slot) => {
        const checkbox = slot.querySelector('.day-check') as HTMLInputElement;
        const day = checkbox.dataset.day!;
        const start = (
          slot.querySelector(
            '.time-input[data-type="start"]',
          ) as HTMLInputElement
        ).value;
        const end = (
          slot.querySelector('.time-input[data-type="end"]') as HTMLInputElement
        ).value;

        payload[day] = {
          enabled: checkbox.checked,
          start,
          end,
        };
      });

      btn.innerText = 'Syncing...';
      btn.style.opacity = '0.7';
      btn.disabled = true;

      try {
        const res = await nextDNSApi.updateSchedules(payload);
        if (res.ok) {
          toast.success('NextDNS Synchronized');
          setTimeout(() => renderSchedulePage(container, 'page'), 800);
        } else {
          throw new Error(res.error?.message);
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
    <div class="glass-card fg-p-12 fg-text-center fg-mx-auto fg-mt-12" style="max-width: 440px; background: #1a1c1e; border: 1px solid rgba(255,100,100,0.2); border-radius: 20px;">
      <div class="fg-text-lg fg-font-black fg-mb-2">ACCESS DENIED</div>
      <div class="fg-text-xs fg-text-[var(--fg-muted)] fg-mb-8">${
        e.message || 'Identity verification failed'
      }</div>
      <button class="btn-premium fg-mx-auto fg-w-full" onclick="location.reload()" style="height: 56px; border-radius: 12px; background: var(--fg-accent); color: white; font-weight: 900;">RETRY ACCESS</button>
    </div>
  `;
}

function _renderPopup(container: HTMLElement): void {
  container.innerHTML = `
    <div class="fg-flex fg-justify-between fg-items-center fg-mb-4 fg-px-1">
       <div class="fg-text-[10px] fg-font-black fg-text-[var(--fg-muted)] fg-uppercase fg-tracking-[1.5px]">RECREATION</div>
    </div>
    <div class="glass-card fg-p-5 fg-text-center" style="border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; background: #1a1c1e;">
       <div class="fg-text-xs fg-font-bold fg-text-white/80">Independent Cloud Scheduling</div>
    </div>
    <button class="btn-premium fg-w-full fg-mt-6 fg-text-[11px]" id="btn_full_schedule" style="height: 48px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 800;">OPEN CLOUD HUB</button>
  `;
  container
    .querySelector('#btn_full_schedule')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('schedule')),
      });
    });
}
