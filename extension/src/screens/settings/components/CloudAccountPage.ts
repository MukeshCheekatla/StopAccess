import {
  UI_TOKENS,
  attachGlobalIconListeners,
  renderBrandLogo,
  showConfirmDialog,
} from '../../../lib/ui';
import { toast } from '../../../lib/toast';
import { COLORS } from '../../../lib/designTokens';
import { escapeHtml } from '@stopaccess/core';

export async function renderCloudAccountPage(container: HTMLElement) {
  if (!container) {
    return;
  }

  const {
    loadSettingsData,
    signInWithOtpAction,
    signInWithGoogleAction,
    signOutAction,
  } = await import('../../../../../packages/viewmodels/src/useSettingsVM');

  const { cloudUser: user } = await loadSettingsData();
  const userEmail = String(user?.email || '');
  const userDomain = userEmail.includes('@')
    ? userEmail.split('@').pop() || 'google.com'
    : 'google.com';
  const safeAvatarUrl = escapeHtml(String(user?.avatar_url || ''));
  const safeDisplayName = escapeHtml(
    String(user?.full_name || userEmail || 'Cloud User'),
  );
  const safeEmail = escapeHtml(userEmail);
  const safeInitial = escapeHtml(
    (userEmail || String(user?.full_name || 'C')).charAt(0).toUpperCase(),
  );

  container.innerHTML = `
    <div class="fg-p-10 fg-flex fg-flex-col fg-h-full">
      <div class="fg-flex fg-items-center fg-gap-4 fg-mb-10">
        <button id="backToSettings" class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[${
          COLORS.glassBg
        }] fg-border fg-border-[${COLORS.glassBorder}] fg-text-[${
    COLORS.text
  }] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 style="${
            UI_TOKENS.TEXT.HERO
          }; font-size: 24px; letter-spacing: -0.02em;">Cloud Backup & Sync</h1>
          <p style="${
            UI_TOKENS.TEXT.LABEL
          }; opacity: 0.5;">Secure backup for your rules and stats</p>
        </div>
      </div>
 
      <div class="fg-flex-1 fg-flex fg-items-center fg-justify-center">
        <div class="fg-panel-premium fg-rounded-[32px] fg-max-w-4xl fg-w-full fg-overflow-hidden fg-flex fg-flex-col lg:fg-flex-row">
          
          <!-- Left Side: Info -->
          <div class="fg-flex-1 fg-p-10 lg:fg-p-12 fg-bg-blue-500/[0.03] fg-border-b lg:fg-border-b-0 lg:fg-border-r fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-justify-center">
            <div class="fg-mb-8 fg-text-blue-500">
              ${
                user
                  ? renderBrandLogo(userDomain, 'Email', 48)
                  : renderBrandLogo('google.com', 'Cloud', 48)
              }
            </div>
            <div class="fg-flex fg-items-center fg-gap-3 fg-mb-4">
              <h2 style="${
                UI_TOKENS.TEXT.HEADING
              }; font-size: 24px;">Sync Status</h2>
              ${
                user
                  ? `
                <div class="fg-bg-emerald-500/10 fg-text-emerald-500 fg-px-3 fg-py-1 fg-rounded-full fg-text-[9px] fg-font-black fg-tracking-widest">
                  ACTIVE
                </div>
              `
                  : ''
              }
            </div>
            <p style="${
              UI_TOKENS.TEXT.SUBTEXT
            }; font-size: 14px; line-height: 1.6; max-width: 280px;">
              Your configuration and statistics are automatically backed up to our secure cloud.
            </p>
          </div>

          <!-- Right Side: Auth -->
          <div class="fg-flex-1 fg-p-10 lg:fg-p-12 fg-flex fg-flex-col fg-justify-center fg-gap-8">
            ${
              user
                ? `
              <div class="fg-flex fg-flex-col fg-gap-6">
                <div class="fg-flex fg-items-center fg-gap-5 fg-bg-[var(--fg-surface-hover)] fg-p-6 fg-rounded-2xl fg-border fg-border-[var(--fg-glass-border)]">
                  ${
                    user.avatar_url
                      ? `<img src="${safeAvatarUrl}" class="fg-w-14 fg-h-14 fg-rounded-full fg-border-2 fg-border-[var(--fg-glass-border)]">`
                      : `<div class="fg-w-14 fg-h-14 fg-rounded-full fg-bg-[var(--fg-accent)] fg-flex fg-items-center fg-justify-center fg-text-white fg-font-bold fg-text-xl">${safeInitial}</div>`
                  }
                  <div class="fg-flex-1 fg-min-w-0">
                    <div class="fg-text-lg fg-font-bold fg-truncate">${safeDisplayName}</div>
                    <div class="fg-text-sm fg-opacity-50 fg-truncate">${safeEmail}</div>
                  </div>
                </div>
                
                <button id="btn_cloud_signout" class="btn-secondary-v2 fg-h-12 fg-px-6 fg-rounded-xl fg-text-[11px] fg-font-black fg-tracking-widest hover:fg-text-rose-500">
                  SIGN OUT FROM CLOUD
                </button>
              </div>
            `
                : `
              <div class="fg-flex fg-flex-col fg-gap-5">
                <button id="btn_cloud_google" class="fg-w-full fg-h-14 fg-rounded-2xl fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-glass-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-flex fg-items-center fg-justify-center fg-gap-4 fg-transition-all fg-text-[var(--fg-text)]">
                  ${renderBrandLogo('google.com', 'Google', 24)}
                  <span class="fg-text-[12px] fg-font-black fg-tracking-widest">CONTINUE WITH GOOGLE</span>
                </button>

                <div class="fg-flex fg-items-center fg-gap-4 fg-my-1">
                  <div class="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]"></div>
                  <span class="fg-text-[10px] fg-font-black fg-opacity-30">OR</span>
                  <div class="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]"></div>
                </div>

                <div class="fg-flex fg-flex-col fg-gap-2">
                  <label style="${
                    UI_TOKENS.TEXT.LABEL
                  }; font-size: 11px; opacity: 0.5;">EMAIL ADDRESS</label>
                  <input type="email" id="cloud_email_input" placeholder="user@example.com" 
                    class="input-premium fg-h-12 fg-px-5 fg-text-sm fg-font-bold">
                </div>
                
                <button id="btn_cloud_signin" class="btn-premium fg-w-full fg-justify-center fg-h-14 fg-rounded-2xl fg-text-[12px] fg-font-black fg-tracking-widest" style="background: ${
                  COLORS.inAppActiveBg
                }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
                    COLORS.inAppActiveBorder
                  };">SEND MAGIC LINK</button>
              </div>
            `
            }
          </div>
        </div>
      </div>
    </div>
  `;

  // Listeners
  container.querySelector('#backToSettings')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('sa_navigate', { detail: { tab: 'settings' } }),
    );
  });

  if (user) {
    container
      .querySelector('#btn_cloud_signout')
      ?.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
          title: 'Sign Out',
          body: 'Are you sure you want to sign out? Your settings will no longer be backed up to the cloud.',
          confirmLabel: 'Sign Out',
          cancelLabel: 'Keep Signed In',
          isDestructive: true,
        });

        if (!confirmed) {
          return;
        }

        await signOutAction();
        toast.info('Signed out');
        renderCloudAccountPage(container);
      });
  } else {
    const emailInput = container.querySelector(
      '#cloud_email_input',
    ) as HTMLInputElement;
    container
      .querySelector('#btn_cloud_signin')
      ?.addEventListener('click', async (e) => {
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
          toast.error('Please enter a valid email');
          return;
        }
        const btn = e.currentTarget as HTMLButtonElement;
        btn.disabled = true;
        btn.innerText = 'SENDING...';
        try {
          await signInWithOtpAction(email);
          toast.success('Magic link sent!');
        } catch (err: any) {
          toast.error(err.message);
          btn.disabled = false;
          btn.innerText = 'RETRY';
        }
      });

    container
      .querySelector('#btn_cloud_google')
      ?.addEventListener('click', async () => {
        try {
          await signInWithGoogleAction();
        } catch (err) {
          toast.error('Login failed');
        }
      });
  }

  attachGlobalIconListeners(container);
}
