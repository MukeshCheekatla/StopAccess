import { UI_TOKENS } from '../../../lib/ui';
import { toast } from '../../../lib/toast';
import { COLORS } from '../../../lib/designTokens';

const iconCloud =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7s.7-1.1.7-1.8c0-1.4-1.1-2.5-2.5-2.5-.1 0-.3 0-.4.1C16.5 10.6 13.5 8 10 8c-3.1 0-5.7 2.1-6.7 5h-.3C1.3 13 0 14.3 0 15.9c0 1.6 1.3 2.9 2.9 2.9h14.6z"/></svg>';
const iconEdit =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="fg-mr-1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
const iconExternal =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="fg-ml-2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

export function renderAccountSection(
  profileId: string,
  apiKey: string,
  syncState: any,
) {
  const isSetupActive = !!profileId && !!apiKey;
  const isOffline = !navigator.onLine;

  const getStatus = () => {
    if (isOffline) {
      return {
        label: 'OFFLINE',
        color: 'fg-text-amber-500',
        bg: 'fg-bg-amber-500/10',
      };
    }
    if (syncState.status === 'syncing') {
      return {
        label: 'SYNCING...',
        color: 'fg-text-blue-500',
        bg: 'fg-bg-blue-500/10',
      };
    }
    if (syncState.status === 'error') {
      return {
        label: 'ERROR',
        color: 'fg-text-rose-500',
        bg: 'fg-bg-rose-500/10',
      };
    }
    return {
      label: 'CONNECTED',
      color: 'fg-text-emerald-500',
      bg: 'fg-bg-emerald-500/10',
    };
  };

  const status = getStatus();

  return `
    <section class="fg-panel-premium fg-p-6 fg-rounded-[28px] fg-flex fg-flex-col fg-h-full">
      <div class="fg-flex fg-items-start fg-justify-between fg-mb-8">
        <div class="fg-flex fg-gap-4">
          <div class="fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[var(--fg-accent)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)]">
            ${iconCloud}
          </div>
          <div>
            <h2 style="${UI_TOKENS.TEXT.HEADING}">NextDNS Profile Sync</h2>
            <p style="${
              UI_TOKENS.TEXT.SUBTEXT
            }; margin-top: 4px;">Sync services, denylist domains, and diagnostics.</p>
          </div>
        </div>
        <div class="fg-flex fg-flex-col fg-items-end fg-gap-2">
          ${
            isSetupActive
              ? `
            <div class="fg-flex fg-items-center fg-gap-2 ${status.bg} ${
                  status.color
                } fg-px-3 fg-py-1 fg-rounded-full fg-text-[9px] fg-font-black fg-tracking-widest">
              <span class="fg-w-1.5 fg-h-1.5 fg-rounded-full ${
                isOffline
                  ? 'fg-bg-amber-500'
                  : syncState.status === 'error'
                  ? 'fg-bg-rose-500'
                  : 'fg-bg-emerald-500'
              }"></span>
              ${status.label}
            </div>
          `
              : ''
          }
          <button id="btn_edit_credentials" class="fg-flex fg-items-center fg-text-[10px] fg-font-bold fg-text-[var(--fg-in-app-active-text)] hover:fg-opacity-80 fg-tracking-wider fg-bg-[var(--fg-in-app-active-bg)] fg-px-3 fg-py-2 fg-rounded-lg fg-transition-all ${
            isSetupActive ? '' : 'fg-hidden'
          }">
            ${iconEdit}
            <span>Modify</span>
          </button>
        </div>
      </div>

      <div class="fg-flex fg-flex-col fg-gap-8 fg-flex-1">
        <div class="fg-flex fg-flex-col fg-gap-2.5">
          <label style="${UI_TOKENS.TEXT.LABEL}">Active Profile</label>
          <div class="fg-flex fg-gap-3">
            <input type="text" id="cfg_profile" value="${profileId}" placeholder="e.g. abc123" 
              class="input-premium fg-flex-1 fg-h-10 fg-px-4 fg-text-sm fg-font-semibold ${
                isSetupActive ? 'readonly-input' : ''
              }" ${isSetupActive ? 'readonly' : ''}>
            <button id="btn_open_nextdns_setup" class="fg-h-10 fg-px-4 fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-flex fg-items-center fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">
              <span>Locate ID</span>
              ${iconExternal}
            </button>
          </div>
        </div>

        <div class="fg-flex fg-flex-col fg-gap-2.5">
          <label style="${UI_TOKENS.TEXT.LABEL}">Dedicated API Token</label>
          <div class="fg-flex fg-gap-3">
            <input type="password" id="cfg_apiKey" value="" 
              placeholder="${
                apiKey ? '••••••••••••••••' : 'Paste your API token'
              }" 
              class="input-premium fg-flex-1 fg-h-10 fg-px-4 fg-text-sm fg-font-semibold ${
                isSetupActive ? 'readonly-input' : ''
              }" ${isSetupActive ? 'readonly' : ''}>
            <button id="btn_open_nextdns_account" class="fg-h-10 fg-px-4 fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-xl fg-flex fg-items-center fg-text-[10px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">
              <span>Generate Token</span>
              ${iconExternal}
            </button>
          </div>
        </div>
      </div>

      <div id="connection_feedback" class="fg-hidden fg-mt-6 fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-text-center"></div>

      <div class="fg-mt-8">
        <button class="btn-premium fg-w-full fg-justify-center fg-h-13 fg-rounded-xl fg-text-sm fg-font-bold fg-tracking-widest ${
          isSetupActive ? 'fg-hidden' : ''
        }" id="btn_save_config" style="background: ${
    COLORS.inAppActiveBg
  }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Verify & Link Account</button>
      </div>
    </section>
  `;
}

export function attachAccountListeners(
  container: HTMLElement,
  profileId: string,
  apiKey: string,
  connectNextDNSAction: (
    pid: string,
    key: string,
  ) => Promise<{ ok: boolean; error?: string }>,
  onSuccess: () => void,
) {
  const editBtn = container.querySelector(
    '#btn_edit_credentials',
  ) as HTMLElement;
  const saveBtn = container.querySelector('#btn_save_config') as HTMLElement;
  const editLabel = editBtn?.querySelector('span');
  const profileInput = container.querySelector(
    '#cfg_profile',
  ) as HTMLInputElement;
  const apiKeyInput = container.querySelector(
    '#cfg_apiKey',
  ) as HTMLInputElement;
  const feedback = container.querySelector(
    '#connection_feedback',
  ) as HTMLElement;

  const openExternal = (url: string) => {
    chrome.tabs.create({ url });
  };

  editBtn?.addEventListener('click', () => {
    const isEditing = editBtn.classList.contains('active-edit');
    if (isEditing) {
      editBtn.classList.remove('active-edit');
      if (editLabel) {
        editLabel.innerText = 'Modify';
      }
      saveBtn?.classList.add('fg-hidden');
      profileInput.readOnly = true;
      profileInput.classList.add('readonly-input');
      apiKeyInput.readOnly = true;
      apiKeyInput.classList.add('readonly-input');
    } else {
      editBtn.classList.add('active-edit');
      if (editLabel) {
        editLabel.innerText = 'Cancel';
      }
      saveBtn?.classList.remove('fg-hidden');
      profileInput.readOnly = false;
      profileInput.classList.remove('readonly-input');
      apiKeyInput.readOnly = false;
      apiKeyInput.classList.remove('readonly-input');
      apiKeyInput.focus();
    }
  });

  container
    .querySelector('#btn_open_nextdns_setup')
    ?.addEventListener('click', () => {
      openExternal('https://my.nextdns.io/setup');
    });

  container
    .querySelector('#btn_open_nextdns_account')
    ?.addEventListener('click', () => {
      openExternal('https://my.nextdns.io/account');
    });

  saveBtn?.addEventListener('click', async () => {
    // ─── SANITIZATION ───
    // Strip non-ISO-8859-1 characters to prevent browser fetch crashes.
    // Also trim whitespace/invisible characters.
    // eslint-disable-next-line no-control-regex
    const sanitize = (val: string) => val.trim().replace(/[^\x00-\xFF]/g, '');

    const pid = sanitize(profileInput.value);
    const enteredKey = sanitize(apiKeyInput.value);
    const finalKey = enteredKey || apiKey;

    if (!pid || !finalKey) {
      toast.error('Profile ID and API Key are required');
      return;
    }

    saveBtn.innerText = 'VERIFYING...';
    (saveBtn as any).disabled = true;
    feedback.classList.remove('fg-hidden');
    feedback.className =
      'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-[var(--fg-glass-bg)] fg-text-[var(--fg-muted)]';
    feedback.innerText = 'Connecting to NextDNS...';

    try {
      const result = await connectNextDNSAction(pid, finalKey);
      if (result.ok) {
        feedback.className =
          'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-green-500/10 fg-text-green-500';
        feedback.innerText = 'Account Linked Successfully';
        saveBtn.innerText = 'SUCCESS';
        toast.success('NextDNS account linked');
        setTimeout(onSuccess, 1000);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (err: any) {
      feedback.className =
        'fg-p-4 fg-rounded-2xl fg-text-xs fg-font-bold fg-bg-red-500/10 fg-text-red-500';

      // Better error handling for the "non ISO-8859-1" edge case
      if (err.message?.includes('ISO-8859-1')) {
        feedback.innerText =
          'Error: Invalid characters in token. Please re-copy properly.';
      } else {
        feedback.innerText = err.message;
      }

      saveBtn.innerText = 'RETRY';
      (saveBtn as any).disabled = false;
    }
  });
}
