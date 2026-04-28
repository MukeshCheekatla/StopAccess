const iconLock =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const iconShield =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

import { toast } from '../../lib/toast';
import { checkGuard } from '../../background/sessionGuard';
import { UI_TOKENS, renderInfoTooltip, renderBrandLogo } from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import { escapeHtml } from '@stopaccess/core';

export async function renderSettingsPage(container) {
  if (!container) {
    return;
  }

  const {
    loadSettingsData,
    setStrictModeAction,
    setGuardianPinAction,
    requestPinResetAction,
    cancelPinResetAction,
    checkPinResetStatus,
    toggleChallengeAction,
    updateChallengeTextAction,
  } = await import('../../../../packages/viewmodels/src/useSettingsVM');

  const {
    profileId,
    apiKey,
    strict,
    challengeEnabled,
    challengeText,
    cloudUser: user,
  } = await loadSettingsData();
  const userEmail = String(user?.email || '');
  const userDomain = userEmail.includes('@')
    ? userEmail.split('@').pop() || 'google.com'
    : 'google.com';
  const safeAvatarUrl = escapeHtml(String(user?.avatar_url || ''));
  const safeDisplayName = escapeHtml(
    String(user?.full_name || userEmail || 'Cloud User'),
  );
  const safeChallengeText = escapeHtml(String(challengeText || ''));

  // Clear any existing intervals to prevent 'increasing' accumulation
  if ((window as any).__pinResetInterval) {
    clearInterval((window as any).__pinResetInterval);
  }

  container.innerHTML = `
    <div class="fg-h-full" style="min-height: calc(100vh - 40px);">
      <main class="fg-overflow-y-auto fg-px-8 fg-pt-12 fg-pb-16 fg-max-w-5xl fg-mx-auto fg-flex fg-flex-col fg-min-h-full">

        <!-- Top Gateway Cards -->
        <div class="fg-grid fg-grid-cols-2 fg-gap-5 fg-mb-8">

          <!-- Cloud Sync Card -->
          <button id="gate_google" class="fg-panel-premium fg-p-5 fg-rounded-[24px] fg-text-left hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all fg-group fg-flex fg-items-center fg-gap-4">
            <div class="fg-shrink-0">
              ${
                user
                  ? renderBrandLogo(userDomain, 'Email', 40)
                  : renderBrandLogo('google.com', 'Cloud', 40)
              }
            </div>
            <div class="fg-flex-1 fg-min-w-0">
              <h2 style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 16px;">Cloud Backup & Sync</h2>
              <div class="fg-mt-1 fg-flex fg-items-center fg-gap-2">
                ${
                  user
                    ? `
                  <img src="${safeAvatarUrl}" class="fg-w-4 fg-h-4 fg-rounded-full">
                  <span style="${UI_TOKENS.TEXT.LABEL}; font-size: 12px; opacity: 0.6;" class="fg-truncate">${safeDisplayName}</span>
                `
                    : '<span class="fg-text-[10px] fg-font-bold fg-opacity-40 fg-tracking-wider">Offline</span>'
                }
              </div>
            </div>
            <div class="fg-opacity-0 group-hover:fg-opacity-100 fg-transition-all fg-text-[var(--fg-muted)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>

          <!-- NextDNS Card -->
          <button id="gate_nextdns" class="fg-panel-premium fg-p-5 fg-rounded-[24px] fg-text-left hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all fg-group fg-flex fg-items-center fg-gap-4">
            <div class="fg-shrink-0">
              ${renderBrandLogo('nextdns.io', 'NextDNS', 40)}
            </div>
            <div class="fg-flex-1 fg-min-w-0">
              <h2 style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 16px;">NextDNS Profile</h2>
              <div class="fg-mt-1 fg-flex fg-items-center fg-gap-2">
                ${
                  profileId && apiKey
                    ? '<span class="fg-text-[var(--fg-green)] fg-text-[10px] fg-font-black fg-tracking-wider">Connected</span>'
                    : '<span class="fg-text-[var(--fg-red)] fg-text-[10px] fg-font-black fg-tracking-wider">Not Linked</span>'
                }
              </div>
            </div>
            <div class="fg-opacity-0 group-hover:fg-opacity-100 fg-transition-all fg-text-[var(--fg-muted)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        </div>

        <!-- Other Settings Grid -->
        <div class="fg-grid fg-grid-cols-2 fg-gap-6 settings-dual-grid">

          <!-- Friction Challenge -->
          <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-flex-col fg-gap-6 fg-h-full">
            <div class="fg-flex fg-items-center fg-justify-between">
              <div class="fg-flex fg-gap-3">
                <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-[var(--fg-amber-soft)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-amber-text)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <div class="fg-flex fg-items-center fg-gap-2">
                    <h2 style="${UI_TOKENS.TEXT.HEADING}">Unblock Challenge</h2>
                    <span class="fg-text-[8px] fg-font-black fg-bg-[var(--fg-emerald-soft)] fg-text-[var(--fg-green)] fg-px-1.5 fg-py-0.5 fg-rounded-md fg-tracking-widest">Recommended</span>
                    ${renderInfoTooltip(
                      'Requires you to type a specific paragraph perfectly before settings can be unlocked.',
                    )}
                  </div>
                  <p style="${
                    UI_TOKENS.TEXT.SUBTEXT
                  }; margin-top: 2px;">Type a paragraph perfectly to unlock settings.</p>
                </div>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="chk_patience_challenge" ${
                  challengeEnabled ? 'checked' : ''
                }>
                <span class="slider-toggle"></span>
              </label>
            </div>

            <div id="challenge_settings_box" class="fg-flex-1 fg-flex fg-flex-col">
              <div style="${
                UI_TOKENS.TEXT.LABEL
              }; font-size: 11px; color: var(--fg-muted); letter-spacing: 0.1em; margin-bottom: 8px;">Target Paragraph</div>
              <textarea id="txt_challenge_body" class="fg-flex-1 fg-w-full fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-2xl fg-p-4 fg-text-[13px] fg-text-[var(--fg-text)] fg-min-h-[120px] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all" placeholder="Enter custom text...">${safeChallengeText}</textarea>

              <div class="fg-mt-4">
                <div class="fg-flex fg-flex-wrap fg-gap-2">
                   <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.">Default</button>
                   <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="Self-discipline is the ability to make yourself do what you should do, when you should do it, whether you feel like it or not. I control my actions, and I choose to spend my time on meaningful work that brings me closer to my future self.">Discipline</button>
                   <button class="preset-para-btn fg-px-3 fg-py-1.5 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-lg fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-border-[var(--fg-accent)] hover:fg-text-[var(--fg-accent)] fg-transition-all" data-text="The more you think you know, the more you realize you don't. Stay humble, stay hungry, and most importantly, stay focused on the task at hand. Do not let the digital noise pull you away from what truly matters in your life today.">Humble</button>
                </div>
              </div>

              <div class="fg-flex fg-justify-between fg-mt-6 fg-items-center">
                <button id="btn_reset_challenge_text" class="fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]">Restore Default</button>
                <button id="btn_save_challenge_text" class="btn-premium fg-px-6 fg-py-2.5 fg-rounded-xl fg-text-[10px] fg-font-black" style="background: ${
                  COLORS.inAppActiveBg
                }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Update Challenge</button>
              </div>
            </div>
          </section>

          <!-- Security Section -->
          <div class="fg-flex fg-flex-col fg-gap-6">
            <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-items-center fg-justify-between">
              <div class="fg-flex fg-gap-3">
                <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-[var(--fg-amber-soft)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-amber-text)]">
                  ${iconLock}
                </div>
                <div>
                  <h2 style="${
                    UI_TOKENS.TEXT.HEADING
                  }">Strict Mode ${renderInfoTooltip(
    'Prevents disabling rules while a focus session is active.',
  )}</h2>
                  <p style="${
                    UI_TOKENS.TEXT.SUBTEXT
                  }; margin-top: 2px;">Immutable during active focus.</p>
                </div>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="chk_strict_toggle" ${
                  strict ? 'checked' : ''
                }>
                <span class="slider-toggle"></span>
              </label>
            </section>

            <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-flex-col fg-gap-4">
              <div class="fg-flex fg-items-center fg-justify-between">
                <div class="fg-flex fg-gap-3">
                  <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-[var(--fg-emerald-soft)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-green)]">
                    ${iconShield}
                  </div>
                  <div>
                    <h2 style="${
                      UI_TOKENS.TEXT.HEADING
                    }">Lock PIN ${renderInfoTooltip(
    'Requires a 4-digit code to access settings.',
  )}</h2>
                    <p style="${
                      UI_TOKENS.TEXT.SUBTEXT
                    }; margin-top: 2px;">Require a code to change settings.</p>
                  </div>
                </div>
                <label class="switch-toggle" id="guard_toggle_label">
                  <input type="checkbox" id="chk_guardian_pin">
                  <span class="slider-toggle"></span>
                </label>
              </div>
              <div id="pin_setup_container"></div>
              <div id="pin_reset_container"></div>
            </section>
          </div>

        </div>
      </main>
    </div>

    <style>
      .fg-panel-premium { background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); }
      .input-premium { background: var(--fg-bg) !important; border: 1px solid var(--fg-glass-border) !important; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: var(--fg-text); width: 100%; }
      .btn-secondary-v2 { background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text); border-radius: 12px; font-size: 11px; font-weight: 600; }
      .switch-toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
      .switch-toggle input { opacity: 0; width: 0; height: 0; }
      .slider-toggle { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--fg-toggle-bg); transition: .4s; border-radius: 34px; border: 1px solid var(--fg-glass-border); }
      .slider-toggle:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: ${
        COLORS.white
      }; transition: .4s; border-radius: 50%; }
      input:checked + .slider-toggle { background-color: var(--fg-accent); border-color: var(--fg-accent); }
      input:checked + .slider-toggle:before { transform: translateX(20px); }
      @media (max-width: 1100px) { .settings-dual-grid { grid-template-columns: 1fr; } }
      .readonly-input { cursor: not-allowed; }
    </style>
  `;

  // Navigation Listeners
  container.querySelector('#gate_google')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('sa_navigate', { detail: { tab: 'cloud_account' } }),
    );
  });
  container.querySelector('#gate_nextdns')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('sa_navigate', { detail: { tab: 'nextdns_account' } }),
    );
  });

  // Strict Mode Listener
  container
    .querySelector('#chk_strict_toggle')
    ?.addEventListener('change', async (e) => {
      const checkbox = e.target as HTMLInputElement;
      const isChecked = checkbox.checked;
      const guard = await checkGuard('change_settings');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        checkbox.checked = !isChecked;
        return;
      }
      if (!isChecked) {
        checkbox.checked = true;
        const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Disable Strict Mode',
          body: 'Verify your security to weaken protection.',
          action: 'change_settings',
        });
        if (confirmed) {
          await setStrictModeAction(false);
          checkbox.checked = false;
        }
      } else {
        await setStrictModeAction(true);
        toast.info('Strict Mode Enabled');
      }
    });

  // PIN Listener
  const { extensionAdapter: storage } = await import(
    '../../background/platformAdapter'
  );
  const chkGuardian = container.querySelector(
    '#chk_guardian_pin',
  ) as HTMLInputElement;

  const updateGuardianCheck = async () => {
    const pin = await storage.getString('guardian_pin');
    chkGuardian.checked = !!pin;

    const setupContainer = container.querySelector('#pin_setup_container');
    if (setupContainer) {
      if (!pin) {
        setupContainer.innerHTML = `
          <div class="fg-flex fg-flex-col fg-gap-3 fg-mt-2">
            <div class="fg-text-[10px] fg-font-black fg-text-[var(--fg-muted)] fg-uppercase fg-tracking-widest fg-opacity-50">Enter 4-Digit PIN to enable</div>
            <div class="fg-flex fg-gap-2.5">
              <input type="password" maxlength="1" class="pin-digit-setup fg-w-10 fg-h-12 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-text-center fg-text-lg fg-font-black fg-text-[var(--fg-text)] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all">
              <input type="password" maxlength="1" class="pin-digit-setup fg-w-10 fg-h-12 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-text-center fg-text-lg fg-font-black fg-text-[var(--fg-text)] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all">
              <input type="password" maxlength="1" class="pin-digit-setup fg-w-10 fg-h-12 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-text-center fg-text-lg fg-font-black fg-text-[var(--fg-text)] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all">
              <input type="password" maxlength="1" class="pin-digit-setup fg-w-10 fg-h-12 fg-bg-[var(--fg-surface-hover)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-text-center fg-text-lg fg-font-black fg-text-[var(--fg-text)] fg-outline-none focus:fg-border-[var(--fg-accent)] fg-transition-all">
            </div>
          </div>
        `;
        const inputs = Array.from(
          setupContainer.querySelectorAll('.pin-digit-setup'),
        ) as HTMLInputElement[];
        inputs.forEach((input, idx) => {
          input.addEventListener('input', async () => {
            if (input.value && idx < 3) {
              inputs[idx + 1].focus();
            }
            const fullPin = inputs.map((i) => i.value).join('');
            if (fullPin.length === 4) {
              await setGuardianPinAction(fullPin);
              toast.success('PIN Enabled');
              updateGuardianCheck();
            }
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
              inputs[idx - 1].focus();
            }
          });
        });
      } else {
        setupContainer.innerHTML = '';
      }
    }

    const resetContainer = container.querySelector('#pin_reset_container');
    if (resetContainer) {
      const status = await checkPinResetStatus();
      if (status.pending) {
        const { fmtTime } = await import(
          '../../../../packages/core/src/utils/time'
        );
        resetContainer.innerHTML = `<div class="fg-bg-[var(--fg-danger-soft)] fg-border fg-border-[var(--fg-danger-border)] fg-rounded-2xl fg-px-4 fg-py-3 fg-flex fg-items-center fg-justify-between">
          <div class="fg-flex fg-items-center fg-gap-4">
            <div class="fg-text-[10px] fg-font-black fg-text-[var(--fg-red)] fg-uppercase fg-tracking-widest">Active Recovery</div>
            <div class="fg-text-[12px] fg-font-bold countdown-timer">${fmtTime(
              status.remainingMs!,
            )}</div>
          </div>
          <button id="btn_cancel_pin_reset" class="fg-text-[9px] fg-font-black fg-opacity-40 hover:fg-opacity-100 fg-uppercase fg-tracking-widest">Cancel</button>
        </div>`;
        resetContainer
          .querySelector('#btn_cancel_pin_reset')
          ?.addEventListener('click', async () => {
            await cancelPinResetAction();
            renderSettingsPage(container);
          });
      } else if (pin) {
        resetContainer.innerHTML =
          '<button id="btn_request_pin_reset" class="fg-text-[10px] fg-font-black fg-opacity-30 hover:fg-opacity-100 fg-uppercase fg-tracking-widest">Forgot PIN?</button>';
        resetContainer
          .querySelector('#btn_request_pin_reset')
          ?.addEventListener('click', async () => {
            const { showConfirmDialog: showConfirm } = (await import(
              '../../lib/ui'
            )) as any;
            if (
              await showConfirm({
                title: 'Reset PIN',
                body: 'Start a 12-hour reset timer?',
                confirmLabel: 'Start Timer',
                isDestructive: true,
              })
            ) {
              await requestPinResetAction();
              renderSettingsPage(container);
            }
          });
      } else {
        resetContainer.innerHTML = '';
      }
    }
  };
  updateGuardianCheck();

  chkGuardian.addEventListener('change', async () => {
    const existingPin = await storage.getString('guardian_pin');
    const { confirmGuardianAction } = (await import('../../lib/ui')) as any;
    if (chkGuardian.checked) {
      if (!existingPin) {
        // Just focus the first inline input if they try to toggle it on manually
        const firstInput = container.querySelector(
          '.pin-digit-setup',
        ) as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
          chkGuardian.checked = false;
          toast.info('Enter a 4-digit PIN to enable');
        }
      }
    } else {
      chkGuardian.checked = true;
      if (
        await confirmGuardianAction({
          title: 'Disable PIN',
          body: 'Verify to remove protection.',
          action: 'change_settings',
        })
      ) {
        const { removeGuardianPinAction } = await import(
          '../../../../packages/viewmodels/src/useSettingsVM'
        );
        await removeGuardianPinAction();
        toast.info('PIN Removed');
        updateGuardianCheck();
      }
    }
  });

  // Challenge Listener
  const chkChallenge = container.querySelector(
    '#chk_patience_challenge',
  ) as HTMLInputElement;
  const txtChallenge = container.querySelector(
    '#txt_challenge_body',
  ) as HTMLTextAreaElement;
  chkChallenge?.addEventListener('change', async () => {
    await toggleChallengeAction(chkChallenge.checked);
  });
  container
    .querySelector('#btn_save_challenge_text')
    ?.addEventListener('click', async () => {
      const text = txtChallenge.value.trim();
      if (text.length < 50) {
        toast.error('Min. 50 characters required');
        return;
      }
      await updateChallengeTextAction(text);
      toast.success('Updated');
    });
  container
    .querySelector('#btn_reset_challenge_text')
    ?.addEventListener('click', async () => {
      const defaultText =
        'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.';
      txtChallenge.value = defaultText;
      await updateChallengeTextAction(defaultText);
    });
  container.querySelectorAll('.preset-para-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = (btn as HTMLElement).dataset.text || '';
      txtChallenge.value = text;
      await updateChallengeTextAction(text);
    });
  });
}
