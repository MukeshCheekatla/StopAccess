import { escapeHtml } from '@stopaccess/core';
import { COLORS } from '../../lib/designTokens';
import { UI_TOKENS, UI_ICONS } from '../tokens';
import { renderBrandLogo } from './icons';

export interface DialogOptions {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  allowHtml?: boolean;
}

/**
 * Show a professional modal dialog.
 * Returns a promise that resolves to true if confirmed, false otherwise.
 */
export async function showConfirmDialog(
  options: DialogOptions,
): Promise<boolean> {
  const {
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    allowHtml = false,
  } = options;
  const safeTitle = escapeHtml(title);
  const safeBody = allowHtml ? body : escapeHtml(body);
  const safeConfirmLabel = escapeHtml(confirmLabel);
  const safeCancelLabel = escapeHtml(cancelLabel);

  return new Promise((resolve) => {
    const dialogId = `__fg_dialog_${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.id = dialogId;
    overlay.className =
      'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay)] fg-backdrop-blur-sm fg-opacity-0 fg-scale-105 fg-transition-all fg-duration-300';

    overlay.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-p-8 fg-max-w-[420px] fg-w-full fg-shadow-2xl">
        <div style="${
          UI_TOKENS.TEXT.HERO
        }; margin-bottom: 12px;">${safeTitle}</div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        }; font-size: 14px; margin-bottom: 32px; opacity: 0.8; line-height: 1.6;">${safeBody}</div>
        
        <div class="fg-flex fg-gap-3 fg-justify-end">
          <button class="dialog-cancel-btn fg-px-6 fg-py-3 fg-rounded-2xl fg-text-sm fg-font-bold fg-text-[var(--fg-muted)] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">${safeCancelLabel}</button>
          <button class="dialog-confirm-btn btn-premium fg-px-6 fg-py-3 fg-rounded-2xl fg-text-sm" 
                  style="font-weight: 800; background: ${
                    isDestructive ? 'var(--fg-red)' : 'var(--fg-text)'
                  }; color: ${isDestructive ? COLORS.onAccent : COLORS.bg};">
            ${safeConfirmLabel}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Force reflow for animation
    setTimeout(() => {
      overlay.classList.remove('fg-opacity-0', 'fg-scale-105');
      overlay.classList.add('fg-opacity-100', 'fg-scale-100');
    }, 10);

    const cleanup = (result: boolean) => {
      overlay.classList.add('fg-opacity-0', 'fg-scale-[0.98]');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay
      .querySelector('.dialog-cancel-btn')
      ?.addEventListener('click', () => {
        cleanup(false);
      });

    overlay
      .querySelector('.dialog-confirm-btn')
      ?.addEventListener('click', () => {
        cleanup(true);
      });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });
  });
}

/**
 * Custom dialog to choose between 40 minutes and Rest of Day.
 */
export async function showUnblockDurationDialog(
  name: string,
): Promise<'40mins' | 'today' | null> {
  return new Promise((resolve) => {
    const dialogId = `__fg_unblock_dialog_${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.id = dialogId;
    overlay.className =
      'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay)] fg-backdrop-blur-sm fg-opacity-0 fg-scale-105 fg-transition-all fg-duration-300';

    overlay.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-p-8 fg-max-w-[420px] fg-w-full fg-shadow-2xl">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
          ${renderBrandLogo(name, name, 48)}
          <div style="${UI_TOKENS.TEXT.HERO}">Unblock</div>
        </div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        }; font-size: 14px; margin-bottom: 32px; opacity: 0.8; line-height: 1.6;">
          How long would you like to disable this block for?
        </div>
        
        <div class="fg-flex fg-flex-col fg-gap-3">
          <button class="choice-40-btn fg-w-full fg-px-6 fg-py-4 fg-rounded-2xl fg-text-sm fg-font-bold fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] hover:fg-bg-[var(--fg-surface-hover)] fg-text-[var(--fg-text)] fg-transition-all fg-flex fg-items-center fg-justify-between">
            <span>40 Minutes</span>
            <span style="opacity: 0.5;">Quick Break</span>
          </button>
          
          <button class="choice-today-btn fg-w-full fg-px-6 fg-py-4 fg-rounded-2xl fg-text-sm fg-font-bold fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] hover:fg-bg-[var(--fg-surface-hover)] fg-text-[var(--fg-text)] fg-transition-all fg-flex fg-items-center fg-justify-between">
            <span>Rest of Today</span>
            <span style="color: var(--fg-red);">Hard Mode</span>
          </button>

          <div style="height: 12px;"></div>
          
          <button class="dialog-cancel-btn fg-w-full fg-px-6 fg-py-3 fg-rounded-2xl fg-text-sm fg-font-bold fg-text-[var(--fg-muted)] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">Keep Blocked</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.remove('fg-opacity-0', 'fg-scale-105');
      overlay.classList.add('fg-opacity-100', 'fg-scale-100');
    }, 10);

    const cleanup = (result: '40mins' | 'today' | null) => {
      overlay.classList.add('fg-opacity-0', 'fg-scale-[0.98]');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay
      .querySelector('.choice-40-btn')
      ?.addEventListener('click', () => cleanup('40mins'));
    overlay
      .querySelector('.choice-today-btn')
      ?.addEventListener('click', () => cleanup('today'));
    overlay
      .querySelector('.dialog-cancel-btn')
      ?.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(null);
      }
    });
  });
}

// ─────────────────────────────────────────────
// Info Tooltip — write once, use everywhere
// ─────────────────────────────────────────────

export function showPinModal(
  title: string,
  body: string,
  onVerify: (pin: string) => Promise<boolean>,
  onCancel?: () => void,
) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const overlay = document.createElement('div');
  overlay.className =
    'fg-fixed fg-inset-0 fg-z-[2000] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay-strong)] fg-backdrop-blur-xl fg-transition-all fg-duration-300 fg-opacity-0';

  overlay.innerHTML = `
    <div class="pin-modal-card fg-bg-[var(--fg-surface)] fg-w-[340px] fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-shadow-2xl fg-p-8 fg-text-center fg-transition-transform fg-duration-300">
      <div class="fg-mb-6 fg-mx-auto fg-w-12 fg-h-12 fg-rounded-2xl fg-bg-[var(--fg-accent-soft)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div style="${UI_TOKENS.TEXT.HEADING}; font-size: 18px; margin-bottom: 8px;">${safeTitle}</div>
      <div style="${UI_TOKENS.TEXT.SUBTEXT}; margin-bottom: 24px;">${safeBody}</div>
      
      <div class="fg-flex fg-justify-center fg-gap-3 fg-mb-8">
        <input type="password" maxlength="1" class="pin-digit-input" autofocus>
        <input type="password" maxlength="1" class="pin-digit-input">
        <input type="password" maxlength="1" class="pin-digit-input">
        <input type="password" maxlength="1" class="pin-digit-input">
      </div>

      <style>
        .pin-digit-input {
          width: 50px;
          height: 60px;
          background: var(--fg-surface-hover);
          border: 1px solid var(--fg-glass-border);
          border-radius: 16px;
          text-align: center;
          font-size: 24px;
          font-weight: 800;
          color: var(--fg-text);
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .pin-digit-input:focus {
          border-color: var(--fg-accent);
          background: var(--fg-surface);
          box-shadow: 0 0 0 4px var(--fg-accent-soft);
          transform: translateY(-2px);
        }
        .pin-digit-input.error {
          border-color: var(--fg-red);
          animation: shake 0.4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      </style>

      <div class="fg-flex fg-flex-col fg-gap-3">
        <div class="fg-flex fg-gap-3">
          <button class="fg-flex-1 fg-rounded-2xl fg-py-3.5 fg-text-[13px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-70 hover:fg-bg-[var(--fg-white-wash)] fg-transition-all" id="pin_cancel_btn">Cancel</button>
          <button class="btn-premium fg-flex-1 fg-py-3.5 fg-text-[13px] fg-font-black" id="pin_verify_btn">Verify</button>
        </div>
        <button id="pin_forgot_link" class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-65 hover:fg-opacity-90 fg-transition-all fg-mt-2">Forgot PIN?</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputs = Array.from(
    overlay.querySelectorAll('.pin-digit-input'),
  ) as HTMLInputElement[];

  // Animation
  requestAnimationFrame(() => {
    overlay.classList.remove('fg-opacity-0');
    overlay.classList.add('fg-opacity-100');
    overlay.querySelector('.pin-modal-card')?.classList.remove('fg-scale-105');
    overlay.querySelector('.pin-modal-card')?.classList.add('fg-scale-100');

    // Force focus on first digit for optimal UX
    if (inputs.length > 0) {
      inputs[0].focus();
    }
  });
  const verifyBtn = overlay.querySelector(
    '#pin_verify_btn',
  ) as HTMLButtonElement;
  const cancelBtn = overlay.querySelector('#pin_cancel_btn') as HTMLElement;

  const getPin = () => inputs.map((i) => i.value).join('');

  const close = () => {
    overlay.classList.remove('fg-opacity-100');
    overlay.classList.add('fg-opacity-0');
    overlay.querySelector('.pin-modal-card')?.classList.add('fg-scale-95');
    setTimeout(() => overlay.remove(), 300);
  };

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (val && idx < 3) {
        inputs[idx + 1].focus();
      }
      if (getPin().length === 4) {
        verifyBtn.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
      if (e.key === 'Enter' && getPin().length === 4) {
        verifyBtn.click();
      }
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const pin = getPin();
    if (pin.length < 4) {
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerText = 'Verifying...';

    const ok = await onVerify(pin);
    if (ok) {
      close();
    } else {
      verifyBtn.disabled = false;
      verifyBtn.innerText = 'Verify';
      inputs.forEach((i) => {
        i.value = '';
        i.classList.add('error');
        setTimeout(() => i.classList.remove('error'), 500);
      });
      inputs[0].focus();
    }
  });

  cancelBtn.addEventListener('click', () => {
    close();
    if (onCancel) {
      onCancel();
    }
  });

  overlay
    .querySelector('#pin_forgot_link')
    ?.addEventListener('click', async () => {
      await showConfirmDialog({
        title: 'PIN Recovery',
        body: 'If you have forgotten your PIN, you can initiate a 12-hour delayed reset from the "Guardian PIN" section in Settings. This delay ensures consistency in your focus goals.',
        confirmLabel: 'Understood',
        cancelLabel: '',
      });
    });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });
}

/**
 * Show a 'What's New' discovery modal for recent updates.
 */
export async function showWhatsNew(version: string, features: any[]) {
  const overlay = document.createElement('div');
  overlay.className =
    'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay)] fg-backdrop-blur-[20px] fg-opacity-0 fg-transition-all fg-duration-500';

  const featureList = features
    .map((f) => {
      const iconKey = f.iconId as keyof typeof UI_ICONS;
      const iconSvg = UI_ICONS[iconKey] || f.icon || '';
      return `
    <div class="fg-flex fg-gap-5 fg-p-6 fg-rounded-[32px] fg-bg-[var(--fg-white-wash)] fg-border fg-border-[var(--fg-white-wash)] fg-transition-all hover:fg-bg-[var(--fg-surface-hover)]">
      <div class="fg-text-4xl fg-shrink-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)]" style="width: 48px; height: 48px;">
        <div style="transform: scale(2.5);">${iconSvg}</div>
      </div>
      <div>
        <div class="fg-text-[16px] fg-font-bold fg-text-[var(--fg-text)]">${escapeHtml(
          f.label,
        )}</div>
        <div class="fg-text-[13px] fg-text-[var(--fg-muted)] fg-mt-1 fg-font-medium" style="line-height: 1.5;">${escapeHtml(
          f.desc,
        )}</div>
      </div>
    </div>
  `;
    })
    .join('');

  overlay.innerHTML = `
    <div class="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[48px] fg-p-12 fg-max-w-[1000px] fg-w-[90%] fg-shadow-2xl fg-scale-95 fg-transition-all fg-duration-500 fg-flex fg-flex-col">
      <div class="fg-mb-10 fg-flex fg-items-end fg-justify-between">
        <div>
          <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-accent)] fg-mb-2">${chrome.i18n.getMessage(
            'whats_new_kicker',
          )}</div>
          <h2 class="fg-text-4xl fg-font-black fg-text-[var(--fg-text)]">${chrome.i18n.getMessage(
            'whats_new_title',
            [version],
          )}</h2>
        </div>
        <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)] fg-opacity-70">Build ${version}</div>
      </div>
      
      <div class="fg-grid fg-grid-cols-2 fg-gap-5 fg-mb-12">
        ${featureList}
      </div>
      
      <div class="fg-flex fg-justify-center">
        <button id="btn_close_whats_new" class="btn-premium fg-px-20 fg-h-16 fg-rounded-3xl fg-font-bold fg-text-base">${chrome.i18n.getMessage(
          'whats_new_cta',
        )}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  setTimeout(() => {
    overlay.classList.remove('fg-opacity-0');
    overlay.firstElementChild?.classList.remove('fg-scale-95');
  }, 10);

  return new Promise<void>((resolve) => {
    const close = () => {
      overlay.classList.add('fg-opacity-0');
      overlay.firstElementChild?.classList.add('fg-scale-95');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 500);
    };

    overlay
      .querySelector('#btn_close_whats_new')
      ?.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  });
}

const CHALLENGE_PRESETS = [
  'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.',
  'Self-discipline is the ability to make yourself do what you should do, when you should do it, whether you feel like it or not. I control my actions, and I choose to spend my time on meaningful work that brings me closer to my future self.',
  "The more you think you know, the more you realize you don't. Stay humble, stay hungry, and most importantly, stay focused on the task at hand. Do not let the digital noise pull you away from what truly matters in your life today.",
  'Focus on what you can control, and let go of what you cannot. Your attention is your most valuable resource; do not squander it on distractions that offer no real value to your life or your goals.',
];

/**
 * Show a 'Patience Challenge' typing modal.
 * User must type the target text perfectly to proceed.
 */
export async function showTypingChallenge(
  initialText: string = CHALLENGE_PRESETS[0],
): Promise<boolean> {
  return new Promise((resolve) => {
    let targetText = initialText;
    const overlay = document.createElement('div');
    overlay.className =
      'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay-strong)] fg-backdrop-blur-2xl fg-opacity-0 fg-transition-all fg-duration-500';

    const renderModal = () => {
      overlay.innerHTML = `
        <div class="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-white-wash)] fg-rounded-[48px] fg-p-14 fg-max-w-[750px] fg-w-full fg-shadow-2xl fg-transition-all fg-duration-500">
          <button id="btn_shuffle_challenge" class="fg-absolute fg-top-10 fg-right-10 fg-w-10 fg-h-10 fg-rounded-full fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all" title="Shuffle paragraph">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          </button>
          
          <div class="fg-text-center fg-mb-10">
            <div class="fg-text-[13px] fg-font-bold fg-text-[var(--fg-accent)] fg-mb-2">Mastery Challenge</div>
            <h2 class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">Unblock Challenge</h2>
            <p class="fg-text-[13px] fg-text-[var(--fg-muted)] fg-mt-1">Prove your focus by typing the paragraph below.</p>
          </div>
          
      <div id="challenge_display" class="fg-text-[26px] fg-mb-12 fg-text-left fg-select-none" style="font-family: 'JetBrains Mono', monospace; word-break: break-word; white-space: pre-wrap; letter-spacing: 0; line-height: 1.6;">
            ${targetText
              .split('')
              .map(
                (char) => `<span class="char-unit">${escapeHtml(char)}</span>`,
              )
              .join('')}
          </div>
          
          <input type="text" id="challenge_input" class="fg-absolute fg-opacity-0 fg-pointer-events-none" />
          
          <div class="fg-flex fg-gap-6 fg-items-center">
            <button id="btn_cancel_challenge" class="fg-px-8 fg-h-16 fg-rounded-[24px] fg-text-[13px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-40 hover:fg-bg-[var(--fg-surface-hover)] hover:fg-opacity-100 fg-transition-all">I'll Wait</button>
            
            <div class="fg-flex-1 fg-relative fg-h-16 fg-rounded-[24px] fg-bg-[var(--fg-surface-hover)] fg-flex fg-items-center fg-justify-center fg-px-10">
              <div id="challenge_progress_bar" class="fg-absolute fg-inset-0 fg-bg-[var(--fg-accent)]/10 fg-rounded-[24px] fg-w-0 fg-transition-all"></div>
              
              <div class="fg-relative fg-flex fg-items-center fg-justify-center fg-gap-8 fg-text-[14px] fg-font-bold fg-select-none">
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Progress</span>
                  <span class="fg-text-[var(--fg-text)]"><span id="progress_percent">0</span>%</span>
                </div>
                
                <div class="fg-w-1.5 fg-h-1.5 fg-rounded-full fg-bg-[var(--fg-text)] fg-opacity-10"></div>
                
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Mistakes</span>
                  <span id="mistake_count" class="fg-text-[var(--fg-text)]">0</span>
                </div>
                
                <div class="fg-w-1.5 fg-h-1.5 fg-rounded-full fg-bg-[var(--fg-text)] fg-opacity-10"></div>
                
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Time</span>
                  <span id="challenge_timer" class="fg-text-[var(--fg-text)]" style="font-family: 'JetBrains Mono', monospace; min-width: 60px; text-align: left;">0.0s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          .char-unit {
            color: var(--fg-text);
            opacity: 0.15;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-bottom: 2px solid transparent;
          }
          .char-unit.current { 
            opacity: 1; 
            color: var(--fg-text); 
            border-bottom: 2px solid var(--fg-accent);
          }
          .char-unit.typed { 
            color: var(--fg-green); 
            opacity: 1; 
          }
          .char-unit.error { 
            color: var(--fg-red); 
            opacity: 1; 
            border-bottom: 2px solid var(--fg-red);
          }
        </style>
      `;
    };

    renderModal();
    document.body.appendChild(overlay);

    let currentIndex = 0;
    let mistakeCount = 0;
    let startTime: number | null = null;
    let timerInterval: any = null;

    let input = overlay.querySelector('#challenge_input') as HTMLInputElement;
    let chars = overlay.querySelectorAll('.char-unit');
    let progressBar = overlay.querySelector(
      '#challenge_progress_bar',
    ) as HTMLElement;
    let progressText = overlay.querySelector(
      '#progress_percent',
    ) as HTMLElement;
    let mistakeText = overlay.querySelector('#mistake_count') as HTMLElement;
    let timerText = overlay.querySelector('#challenge_timer') as HTMLElement;

    const resetState = () => {
      currentIndex = 0;
      mistakeCount = 0;
      startTime = null;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      timerText.textContent = '0.0s';

      // Refresh references
      input = overlay.querySelector('#challenge_input') as HTMLInputElement;
      chars = overlay.querySelectorAll('.char-unit');
      progressBar = overlay.querySelector(
        '#challenge_progress_bar',
      ) as HTMLElement;
      progressText = overlay.querySelector('#progress_percent') as HTMLElement;
      mistakeText = overlay.querySelector('#mistake_count') as HTMLElement;
      timerText = overlay.querySelector('#challenge_timer') as HTMLElement;

      updateUI();
      input.focus();
    };

    const setupListeners = () => {
      overlay
        .querySelector('#btn_shuffle_challenge')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          const filtered = CHALLENGE_PRESETS.filter((p) => p !== targetText);
          targetText = filtered[Math.floor(Math.random() * filtered.length)];
          renderModal();
          resetState();
          setupListeners(); // Re-bind listeners for new DOM
        });

      overlay
        .querySelector('#btn_cancel_challenge')
        ?.addEventListener('click', () => {
          if (timerInterval) {
            clearInterval(timerInterval);
          }
          overlay.classList.add('fg-opacity-0');
          setTimeout(() => {
            overlay.remove();
            resolve(false);
          }, 500);
        });

      overlay.addEventListener('click', () => input.focus());

      input.addEventListener('input', () => {
        if (!startTime) {
          startTime = Date.now();
          timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime!) / 1000);
            const m = Math.floor(elapsed / 60);
            const s = elapsed % 60;
            timerText.textContent =
              m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${elapsed}s`;
          }, 500);
        }

        const val = input.value;
        if (!val) {
          return;
        }

        const typedChar = val[val.length - 1];
        const targetChar = targetText[currentIndex];

        if (typedChar === targetChar) {
          chars[currentIndex].classList.remove('error');
          chars[currentIndex].classList.add('typed');
          currentIndex++;
          updateUI();

          if (currentIndex === targetText.length) {
            if (timerInterval) {
              clearInterval(timerInterval);
            }

            // Record Performance
            const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
            if (elapsed > 0) {
              import('../../lib/typingHistory').then(
                ({ saveTypingSession }) => {
                  const timeMinutes = elapsed / 60;
                  const grossWPM = targetText.length / 5 / timeMinutes;
                  const accuracy =
                    ((targetText.length - mistakeCount) / targetText.length) *
                    100;
                  const netWPM = grossWPM - mistakeCount / timeMinutes;

                  saveTypingSession({
                    timestamp: Date.now(),
                    duration: elapsed,
                    wpm: Math.round(grossWPM),
                    netWpm: Math.max(0, Math.round(netWPM)),
                    accuracy: Math.round(accuracy),
                    textLength: targetText.length,
                    mistakes: mistakeCount,
                  });
                },
              );
            }

            overlay.classList.add('fg-opacity-0');
            setTimeout(() => {
              overlay.remove();
              resolve(true);
            }, 500);
          }
        } else {
          mistakeCount++;
          updateUI();
          chars[currentIndex].classList.add('error');
          overlay.firstElementChild?.animate(
            [
              { transform: 'translateX(-1px)' },
              { transform: 'translateX(1px)' },
              { transform: 'translateX(0)' },
            ],
            { duration: 50, iterations: 3 },
          );
        }
        input.value = '';
      });
    };

    const updateUI = () => {
      chars.forEach((c, i) => {
        c.classList.remove('current');
        if (i === currentIndex) {
          c.classList.add('current');
        }
      });
      const percent = Math.floor((currentIndex / targetText.length) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = percent.toString();
      mistakeText.textContent = mistakeCount.toString();
    };

    updateUI();
    setupListeners();

    // Animate in
    setTimeout(() => {
      overlay.classList.remove('fg-opacity-0');
      input.focus();
    }, 10);
  });
}

/**
 * Unified verification wrapper for sensitive actions.
 * Chains all enabled protections (PIN & Patience Challenge).
 */
export async function confirmGuardianAction(options: {
  title: string;
  body: string;
  isDestructive?: boolean;
  skipSimpleConfirm?: boolean;
  action?:
    | 'remove_app'
    | 'disable_blocking'
    | 'modify_blocklist'
    | 'change_settings';
}): Promise<boolean> {
  const { extensionAdapter: storage } = await import(
    '../../background/platformAdapter'
  );
  const { checkGuard } = await import('../../background/sessionGuard');
  const { toast } = (await import('../../lib/toast')) as any;

  // 1. System Lock Check (Focus Session / Strict Mode)
  // We check this FIRST so we don't annoy the user with a challenge that won't work.
  const action =
    options.action ||
    (options.isDestructive ? 'remove_app' : 'modify_blocklist');
  const guard = await checkGuard(action);
  if (!guard.allowed) {
    toast.error((guard as any).reason);
    return false;
  }

  const challengeEnabled = await storage.getBoolean('challenge_enabled');
  const currentPin = await storage.getString('guardian_pin');

  // 0. Environment Check for Popup
  // Typing inside a tiny extension popup is terrible UX.
  // If a lock is triggered, move them to the full dashboard.
  if (
    (challengeEnabled || currentPin) &&
    window.location.pathname.includes('popup.html')
  ) {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html?tab=apps'),
    });
    window.close();
    return false;
  }

  if (challengeEnabled) {
    const challengeText =
      (await storage.getString('challenge_text')) ||
      'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions.';
    const passed = await showTypingChallenge(challengeText);
    if (!passed) {
      return false;
    }
  }

  // 2. PIN Lock
  if (currentPin) {
    return new Promise((resolve) => {
      showPinModal(
        options.title,
        options.body,
        async (entered) => {
          if (entered === currentPin) {
            resolve(true);
            return true;
          } else {
            toast.error('Incorrect PIN');
            return false;
          }
        },
        () => resolve(false),
      );
    });
  }

  // 3. Fallback to Simple Confirm if no advanced security is set
  if (options.skipSimpleConfirm) {
    return true;
  }

  return await showConfirmDialog({
    title: options.title,
    body: options.body,
    confirmLabel: options.isDestructive ? 'Delete' : 'Confirm',
    isDestructive: options.isDestructive,
  });
}
