import { UI_TOKENS, attachGlobalIconListeners, renderByteFace } from '@/ui/ui';
import { COLORS } from '@/ui/theme/designTokens';
import { toast } from '@/ui/toast';
import { type CompanionMood } from '@/ui/companion/types';
import { ICONS } from '@/ui/svgicons';

const MOODS: Array<{
  id: CompanionMood;
  label: string;
}> = [
  { id: 'happy', label: 'Happy' },
  { id: 'focused', label: 'Focused' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'judging', label: 'Judging' },
  { id: 'annoyed', label: 'Annoyed' },
  { id: 'angry', label: 'Angry' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'scared', label: 'Scared' },
  { id: 'sad', label: 'Sad' },
  { id: 'shame', label: 'Shame' },
  { id: 'victory', label: 'Victory' },
  { id: 'excited', label: 'Excited' },
  { id: 'laughing', label: 'Laughing' },
  { id: 'aiming', label: 'Aiming' },
];

export async function renderByteSettingsPage(container: HTMLElement) {
  if (!container) {
    return;
  }

  const { extensionVMDeps } = await import('@/lib/vmDeps');
  const { loadSettingsData, updateByteSettingsAction } = await import(
    '@stopaccess/viewmodels/useSettingsVM'
  );

  const { byteSettings } = await loadSettingsData(extensionVMDeps);

  container.innerHTML = `
    <div class="fg-p-10 fg-flex fg-flex-col fg-h-full">
      <div class="fg-flex fg-items-center fg-gap-4 fg-mb-10">
        <button id="backToSettings" class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[${
          COLORS.glassBg
        }] fg-border fg-border-[${COLORS.glassBorder}] fg-text-[${
    COLORS.text
  }] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all">
          ${ICONS.BACK}
        </button>
        <div>
          <div class="fg-flex fg-items-center fg-gap-3">
            <h1 style="${
              UI_TOKENS.TEXT.HERO
            }; font-size: 24px; letter-spacing: -0.02em;">Byte Companion</h1>
            ${renderByteFace('happy', 32)}
          </div>
          <p style="${
            UI_TOKENS.TEXT.LABEL
          }; opacity: 0.5;">Mood and night mode behavior</p>
        </div>
      </div>

      <div class="fg-grid fg-grid-cols-1 lg:fg-grid-cols-[300px_1fr] fg-gap-8 fg-min-h-0 fg-max-w-5xl">
        
        <!-- Left Column: Info & Save -->
        <div class="fg-flex fg-flex-col fg-gap-6">
          <section class="fg-panel-premium fg-rounded-[28px] fg-p-7 fg-flex fg-flex-col fg-gap-6">
            <div>
              <div style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 18px;">Live Preview</div>
              <p style="${
                UI_TOKENS.TEXT.SUBTEXT
              }; margin-top: 4px;">Click any mood to watch the main Byte companion react instantly.</p>
            </div>
            
            <button id="btn_save_byte_settings" class="btn-premium fg-w-full fg-h-12 fg-rounded-xl fg-text-[12px] fg-font-black fg-tracking-widest" style="background: ${
              COLORS.inAppActiveBg
            }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">
              Save Default
            </button>
          </section>
        </div>

        <!-- Right Column: Settings -->
        <div class="fg-flex fg-flex-col fg-gap-8">
          <section class="fg-panel-premium fg-rounded-[28px] fg-p-7 fg-flex fg-flex-col fg-gap-6">
            <div>
              <div style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 18px;">Default Mood</div>
              <p style="${
                UI_TOKENS.TEXT.SUBTEXT
              }; margin-top: 4px;">Pick the baseline face. Overridden by focus or warnings.</p>
            </div>

            <div class="fg-flex fg-flex-wrap fg-gap-3">
              ${MOODS.map(
                (mood) => `
                  <button class="byte-mood-card fg-px-5 fg-py-2.5 fg-rounded-[14px] fg-transition-all fg-text-[12px] fg-font-bold ${
                    byteSettings.defaultMood === mood.id
                      ? 'fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-accent)] fg-text-[var(--fg-text)]'
                      : 'fg-bg-[var(--fg-glass-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-glass-border)] fg-text-[var(--fg-muted)]'
                  }" data-mood="${mood.id}">
                    ${mood.label}
                  </button>
                `,
              ).join('')}
            </div>
          </section>

          <section class="fg-panel-premium fg-rounded-[28px] fg-p-7 fg-flex fg-flex-col fg-gap-6">
            <div>
              <div style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 18px;">Night Rest</div>
              <p style="${
                UI_TOKENS.TEXT.SUBTEXT
              }; margin-top: 4px;">Byte gets sleepy automatically during these hours.</p>
            </div>
            <div class="fg-grid fg-grid-cols-2 fg-gap-6 fg-max-w-md">
              <div>
                <div style="${
                  UI_TOKENS.TEXT.LABEL
                }; margin-bottom: 8px;">Night Start</div>
                <button id="btn_night_start" class="input-premium fg-h-12 fg-text-[14px] fg-w-full fg-text-left fg-flex fg-items-center fg-justify-between hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">
                  <span id="display_night_start">${String(
                    byteSettings.nightStart,
                  ).padStart(2, '0')}:00</span>
                  ${ICONS.CLOCK}
                </button>
              </div>
              <div>
                <div style="${
                  UI_TOKENS.TEXT.LABEL
                }; margin-bottom: 8px;">Night End</div>
                <button id="btn_night_end" class="input-premium fg-h-12 fg-text-[14px] fg-w-full fg-text-left fg-flex fg-items-center fg-justify-between hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">
                  <span id="display_night_end">${String(
                    byteSettings.nightEnd,
                  ).padStart(2, '0')}:00</span>
                  ${ICONS.CLOCK}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- Circular Time Picker Modal -->
      <div id="time_picker_modal" class="fg-fixed fg-inset-0 fg-z-50 fg-hidden fg-items-center fg-justify-center fg-opacity-0 fg-transition-opacity fg-duration-300">
        <div class="fg-absolute fg-inset-0 fg-backdrop-blur-sm" id="time_picker_backdrop" style="background: ${
          COLORS.overlay
        }"></div>
        <div class="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[36px] fg-p-8 fg-w-[340px] fg-flex fg-flex-col fg-items-center fg-transform fg-scale-95 fg-transition-transform fg-duration-300" id="time_picker_panel" style="box-shadow: 0 20px 60px ${
          COLORS.overlaySubtle
        }">
          <div id="time_picker_title" class="fg-text-[20px] fg-font-bold fg-mb-8 fg-text-center fg-text-[var(--fg-text)] fg-tracking-tight">Select Time</div>
          
          <div id="time_picker_dial" class="fg-relative fg-w-[260px] fg-h-[260px] fg-rounded-full fg-bg-[var(--fg-glass-bg)] fg-shadow-inner fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-items-center fg-justify-center">
            <!-- Center dot -->
            <div class="fg-w-2.5 fg-h-2.5 fg-rounded-full fg-bg-[var(--fg-accent)] fg-absolute"></div>
          </div>
        </div>
      </div>

      <style>
        .fg-panel-premium { background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); }
        .input-premium { background: var(--fg-bg) !important; border: 1px solid var(--fg-glass-border) !important; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: var(--fg-text); width: 100%; outline: none; cursor: pointer; }
        .input-premium:focus { border-color: var(--fg-accent) !important; }
      </style>
    </div>
  `;

  let selectedMood = byteSettings.defaultMood as CompanionMood;
  let currentStart = byteSettings.nightStart;
  let currentEnd = byteSettings.nightEnd;
  let activePickerField: 'nightStart' | 'nightEnd' | null = null;

  const modal = container.querySelector('#time_picker_modal') as HTMLElement;
  const panel = container.querySelector('#time_picker_panel') as HTMLElement;
  const dial = container.querySelector('#time_picker_dial') as HTMLElement;
  const title = container.querySelector('#time_picker_title') as HTMLElement;
  const backdrop = container.querySelector(
    '#time_picker_backdrop',
  ) as HTMLElement;

  function updateTimeDisplay() {
    container.querySelector('#display_night_start')!.innerHTML = `${String(
      currentStart,
    ).padStart(2, '0')}:00`;
    container.querySelector('#display_night_end')!.innerHTML = `${String(
      currentEnd,
    ).padStart(2, '0')}:00`;
  }

  function closePicker() {
    modal.classList.replace('fg-opacity-100', 'fg-opacity-0');
    panel.classList.replace('fg-scale-100', 'fg-scale-95');
    setTimeout(() => {
      modal.classList.add('fg-hidden');
      modal.classList.remove('fg-flex');
      activePickerField = null;
    }, 300);
  }

  function openPicker(field: 'nightStart' | 'nightEnd') {
    activePickerField = field;
    title.innerText =
      field === 'nightStart' ? 'Set Night Start' : 'Set Night End';

    const selectedValue = field === 'nightStart' ? currentStart : currentEnd;

    // Clear and generate dial
    dial.innerHTML =
      '<div class="fg-w-2.5 fg-h-2.5 fg-rounded-full fg-bg-[var(--fg-accent)] fg-absolute"></div>';

    const cx = 130; // half of 260
    const cy = 130;

    for (let i = 0; i < 24; i++) {
      // 0 to 11 on outer circle, 12 to 23 on inner circle
      const isInner = i >= 12;
      const r = isInner ? 70 : 106;

      const angleDeg = (i % 12) * 30 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = cx + r * Math.cos(angleRad);
      const y = cy + r * Math.sin(angleRad);

      const isSelected = i === selectedValue;

      const btn = document.createElement('button');
      btn.className = `fg-absolute fg-w-10 fg-h-10 fg-rounded-full fg-flex fg-items-center fg-justify-center fg-text-[14px] fg-font-semibold fg-transition-all fg-transform -fg-translate-x-1/2 -fg-translate-y-1/2 ${
        isSelected
          ? 'fg-bg-[var(--fg-accent)] fg-text-[var(--fg-bg)] fg-shadow-[0_0_16px_var(--fg-accent)] fg-scale-110 fg-z-10'
          : 'fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-surface-hover)] hover:fg-scale-110 fg-z-0'
      }`;
      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;
      btn.innerText = String(i);

      btn.onclick = () => {
        if (activePickerField === 'nightStart') {
          currentStart = i;
        } else if (activePickerField === 'nightEnd') {
          currentEnd = i;
        }

        updateTimeDisplay();
        closePicker();
      };

      dial.appendChild(btn);
    }

    modal.classList.remove('fg-hidden');
    modal.classList.add('fg-flex');

    // Trigger reflow for transition
    modal.offsetWidth;

    modal.classList.replace('fg-opacity-0', 'fg-opacity-100');
    panel.classList.replace('fg-scale-95', 'fg-scale-100');
  }

  backdrop.addEventListener('click', closePicker);

  container
    .querySelector('#btn_night_start')
    ?.addEventListener('click', () => openPicker('nightStart'));
  container
    .querySelector('#btn_night_end')
    ?.addEventListener('click', () => openPicker('nightEnd'));

  container.querySelector('#backToSettings')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('sa_navigate', { detail: { tab: 'settings' } }),
    );
  });

  const saveButton = container.querySelector(
    '#btn_save_byte_settings',
  ) as HTMLButtonElement;

  container.querySelectorAll('.byte-mood-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedMood = (card as HTMLElement).dataset.mood as CompanionMood;
      container.querySelectorAll('.byte-mood-card').forEach((item) => {
        (item as HTMLElement).className = (
          item as HTMLElement
        ).className.replace(
          'fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-accent)] fg-text-[var(--fg-text)]',
          'fg-bg-[var(--fg-glass-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-glass-border)] fg-text-[var(--fg-muted)]',
        );
      });
      (card as HTMLElement).className = (card as HTMLElement).className.replace(
        'fg-bg-[var(--fg-glass-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-glass-border)] fg-text-[var(--fg-muted)]',
        'fg-bg-[var(--fg-surface-hover)] fg-ring-1 fg-ring-[var(--fg-accent)] fg-text-[var(--fg-text)]',
      );
      window.dispatchEvent(
        new CustomEvent('sa_preview_mood', { detail: { mood: selectedMood } }),
      );
    });
  });

  saveButton.addEventListener('click', async () => {
    await updateByteSettingsAction(extensionVMDeps, {
      defaultMood: selectedMood,
      nightStart: currentStart,
      nightEnd: currentEnd,
    });
    toast.success('Byte settings saved');
  });

  attachGlobalIconListeners(container);
}
