import {
  UI_TOKENS,
  attachGlobalIconListeners,
  renderBrandLogo,
  showConfirmDialog,
} from '../../../ui/ui';
import { toast } from '../../../ui/toast';
import { COLORS } from '../../../ui/theme/designTokens';
import { escapeHtml } from '@stopaccess/core';

const GOOGLE_GLYPH = `
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
`;

export async function renderCloudAccountPage(container: HTMLElement) {
  if (!container) {
    return;
  }

  const { extensionVMDeps } = await import('../../../lib/vmDeps');

  const {
    loadSettingsData,
    signInWithOtpAction,
    signInWithGoogleAction,
    signOutAction,
    forcePushCloudAction,
  } = await import('@stopaccess/viewmodels/useSettingsVM');

  const { cloudUser: user } = await loadSettingsData(extensionVMDeps);
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
          <div class="fg-flex-1 fg-p-10 lg:fg-p-12 fg-bg-[var(--fg-blue-soft)] fg-border-b lg:fg-border-b-0 lg:fg-border-r fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-justify-center">
            <div class="fg-mb-8 fg-text-[var(--fg-blue)]">
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
                <div class="fg-bg-[var(--fg-emerald-soft)] fg-text-[var(--fg-green)] fg-px-3 fg-py-1 fg-rounded-full fg-text-[9px] fg-font-black fg-tracking-widest">
                  Active
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
                
                <button id="btn_cloud_signout" class="btn-secondary-v2 fg-h-12 fg-px-6 fg-rounded-xl fg-text-[11px] fg-font-black fg-tracking-widest hover:fg-text-[var(--fg-red)]">
                  Sign Out From Cloud
                </button>

                <button id="btn_cloud_push_now" class="btn-premium fg-h-12 fg-px-6 fg-rounded-xl fg-text-[11px] fg-font-black fg-tracking-widest" style="background: ${
                  COLORS.inAppActiveBg
                }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
                    COLORS.inAppActiveBorder
                  };">
                  Push Backup Now
                </button>

                <p class="fg-text-[11px] fg-leading-relaxed fg-opacity-45">
                  Pushes current NextDNS ID, API key, rules, schedules, focus and usage to Supabase immediately.
                </p>
              </div>
            `
                : `
              <div class="fg-flex fg-flex-col fg-gap-5">
                <div class="fg-flex fg-flex-col fg-gap-2">
                  <label style="${
                    UI_TOKENS.TEXT.LABEL
                  }; font-size: 11px; opacity: 0.5;">Email Address</label>
                  <div class="fg-flex fg-items-center fg-gap-3 fg-h-12 fg-px-4 fg-rounded-[14px] fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-bg)]">
                    <div class="fg-w-8 fg-h-8 fg-rounded-[10px] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-muted)] fg-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>
                    </div>
                    <input type="email" id="cloud_email_input" placeholder="user@example.com" 
                      class="fg-flex-1 fg-h-full fg-bg-transparent fg-border-0 fg-outline-none fg-text-[14px] fg-font-semibold fg-text-[var(--fg-text)] placeholder:fg-text-[var(--fg-muted)]">
                  </div>
                </div>
                
                <button id="btn_cloud_signin" class="btn-premium fg-w-full fg-justify-center fg-h-14 fg-rounded-2xl fg-text-[12px] fg-font-black fg-tracking-widest" style="background: ${
                  COLORS.inAppActiveBg
                }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
                    COLORS.inAppActiveBorder
                  };">Send Magic Link</button>

                <div class="fg-flex fg-items-center fg-gap-4 fg-my-1">
                  <div class="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]"></div>
                  <span class="fg-text-[10px] fg-font-black fg-opacity-30">Or</span>
                  <div class="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]"></div>
                </div>

                <button id="btn_cloud_google" class="fg-w-full fg-h-14 fg-rounded-2xl fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-flex fg-items-center fg-justify-center fg-gap-4 fg-transition-all fg-text-[var(--fg-text)]">
                  <span class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-[12px] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-shrink-0">
                    ${GOOGLE_GLYPH}
                  </span>
                  <span class="fg-text-[12px] fg-font-black fg-tracking-wide">Continue with Google</span>
                </button>
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
      .querySelector('#btn_cloud_push_now')
      ?.addEventListener('click', async (e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        const original = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Pushing...';
        try {
          await forcePushCloudAction(extensionVMDeps);
          toast.success('Cloud backup pushed');
        } catch (err: any) {
          toast.show(err?.message || 'Cloud push failed', 'error', 9000);
        } finally {
          btn.disabled = false;
          btn.innerText = original;
        }
      });

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

        await signOutAction(extensionVMDeps);
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
        btn.innerText = 'Sending...';
        try {
          await signInWithOtpAction(extensionVMDeps, email);
          toast.success('Magic link sent!');
        } catch (err: any) {
          toast.error(err.message);
          btn.disabled = false;
          btn.innerText = 'Retry';
        }
      });

    container
      .querySelector('#btn_cloud_google')
      ?.addEventListener('click', async () => {
        try {
          await signInWithGoogleAction(extensionVMDeps);
        } catch (err) {
          toast.error('Login failed');
        }
      });
  }

  attachGlobalIconListeners(container);
}
