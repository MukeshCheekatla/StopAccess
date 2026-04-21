import { UI_TOKENS } from '../../../lib/ui';
import { toast } from '../../../lib/toast';
import { COLORS } from '../../../lib/designTokens';

const iconSearch =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const iconActivity =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';

export function renderDiagnosticsSection(syncState: any) {
  return `
    <div class="fg-grid fg-grid-cols-2 fg-gap-6">
      <section class="fg-panel-premium fg-p-6 fg-rounded-[28px]">
        <div class="fg-mb-6 fg-flex fg-gap-3">
          <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-blue-500/10 fg-flex fg-items-center fg-justify-center fg-text-blue-500">
            ${iconSearch}
          </div>
          <div>
            <h2 style="${UI_TOKENS.TEXT.HEADING}">Coverage Test</h2>
            <p style="${
              UI_TOKENS.TEXT.SUBTEXT
            }; margin-top: 2px;">Check if a host is covered by active rules.</p>
          </div>
        </div>
        <div class="fg-flex fg-gap-3">
          <input type="text" id="test_domain" placeholder="domain.com" class="input-premium fg-flex-1 fg-h-11 fg-text-sm fg-font-medium fg-text-[var(--fg-text)]">
          <button class="btn-premium fg-px-6 fg-h-11 fg-text-[10px] fg-tracking-widest" id="btn_test_domain" style="background: ${
            COLORS.inAppActiveBg
          }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
    COLORS.inAppActiveBorder
  };">Run Scan</button>
        </div>
        <div id="test_result" class="fg-hidden fg-mt-4 fg-p-4 fg-rounded-2xl fg-text-center fg-text-[10px] fg-font-bold fg-tracking-widest"></div>
      </section>

      <section class="fg-panel-premium fg-p-6 fg-rounded-[28px]">
        <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
          <div class="fg-flex fg-gap-3">
            <div class="fg-w-9 fg-h-9 fg-rounded-xl fg-bg-rose-500/10 fg-flex fg-items-center fg-justify-center fg-text-rose-500">
              ${iconActivity}
            </div>
            <div>
              <h2 style="${UI_TOKENS.TEXT.HEADING}">Maintenance</h2>
              <p style="${
                UI_TOKENS.TEXT.SUBTEXT
              }; margin-top: 2px;">Sync health and rule persistence.</p>
            </div>
          </div>
          <button class="fg-text-[9px] fg-font-black fg-text-[var(--fg-in-app-active-text)] fg-bg-[var(--fg-in-app-active-bg)] fg-px-3 fg-py-1.5 fg-rounded-lg hover:fg-opacity-70" id="btn_force_sync">Push</button>
        </div>
        <div id="sync_stats" class="fg-text-[10px] fg-font-mono fg-space-y-2 fg-text-[var(--fg-text)] fg-mb-5">
           <div class="fg-flex fg-justify-between fg-opacity-70"><span>Engine Health</span> <span class="${
             syncState.status === 'error'
               ? 'fg-text-[var(--fg-red)]'
               : 'fg-text-[var(--fg-green)]'
           } fg-font-black">${syncState.status.toUpperCase()}</span></div>
           <div class="fg-flex fg-justify-between fg-opacity-70"><span>Telemetry Cycle</span> <span class="fg-font-black">${
             syncState.lastSyncAt
               ? new Date(syncState.lastSyncAt).toLocaleTimeString()
               : 'INACTIVE'
           }</span></div>
           <div class="fg-flex fg-justify-between fg-opacity-70"><span>Pending Blobs</span> <span class="fg-text-[var(--fg-accent)] fg-font-black">${
             syncState.pendingOps || 0
           } UNITS</span></div>
        </div>
        <div class="fg-grid fg-grid-cols-3 fg-gap-3 fg-pt-4 fg-border-t fg-border-[var(--fg-glass-border)]">
          <button class="btn-secondary-v2 fg-py-3 fg-text-[9px] fg-tracking-widest" id="btn_view_logs">History</button>
          <button class="btn-secondary-v2 fg-py-3 fg-text-[9px] fg-tracking-widest" id="btn_export_rules">Export</button>
          <button class="btn-secondary-v2 fg-py-3 fg-text-[9px] fg-tracking-widest" id="btn_import_rules">Import</button>
        </div>
      </section>
    </div>
  `;
}

export function attachDiagnosticsListeners(
  container: HTMLElement,
  dnrRules: any[],
  vm: {
    testDomainCoverageAction: any;
    exportRulesAction: any;
    importRulesAction: any;
    renderSettingsPage: any;
  },
) {
  // Force Sync
  container.querySelector('#btn_force_sync')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'manualSync' });
    toast.info('Manual push sequence active');
  });

  // Coverage Test
  container
    .querySelector('#btn_test_domain')
    ?.addEventListener('click', async () => {
      const input = container.querySelector('#test_domain') as HTMLInputElement;
      const domain = input.value.trim().toLowerCase();
      const resultDiv = container.querySelector('#test_result') as HTMLElement;
      if (!domain) {
        return;
      }

      resultDiv.classList.remove('fg-hidden');
      resultDiv.innerText = 'SCANNING...';
      const { localMatch, dnrMatch } = await vm.testDomainCoverageAction(
        domain,
        dnrRules,
      );

      if (localMatch || dnrMatch) {
        resultDiv.className =
          'fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-green)]/20 fg-text-[var(--fg-green)] fg-border fg-border-[var(--fg-green)]/20';
        resultDiv.innerText = localMatch
          ? 'Block EVENT: PERSISTENT'
          : 'Block EVENT: VIRTUAL';
      } else {
        resultDiv.className =
          'fg-p-4 fg-rounded-2xl fg-text-center fg-text-xs fg-font-black fg-bg-[var(--fg-red)]/20 fg-text-[var(--fg-red)] fg-border fg-border-[var(--fg-red)]/20';
        resultDiv.innerText = 'TRAFFIC CLEAN';
      }
    });

  // Export
  container
    .querySelector('#btn_export_rules')
    ?.addEventListener('click', async () => {
      const rules = await vm.exportRulesAction();
      const blob = new Blob([rules], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StopAccess_state.json';
      a.click();
      toast.success('State Archived');
    });

  // Import
  container
    .querySelector('#btn_import_rules')
    ?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          return;
        }
        try {
          const text = await file.text();
          await vm.importRulesAction(text);
          toast.success('State Restored');
          vm.renderSettingsPage(container);
        } catch (err) {
          toast.error('State Corruption');
        }
      };
      input.click();
    });

  // History / Logs
  container
    .querySelector('#btn_view_logs')
    ?.addEventListener('click', async () => {
      const { extensionAdapter: logStorage, STORAGE_KEYS } = await import(
        '../../../background/platformAdapter'
      );
      const logs = JSON.parse(
        (await logStorage.getString(STORAGE_KEYS.LOGS)) || '[]',
      ).reverse();

      const modal = document.createElement('div');
      modal.className =
        'fg-fixed fg-inset-0 fg-bg-[var(--fg-overlay)] fg-backdrop-blur-xl fg-flex fg-items-center fg-justify-center fg-z-50 fg-p-8';
      modal.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-w-full fg-max-w-xl fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-flex-col fg-max-h-[85vh] fg-shadow-2xl">
        <div class="fg-p-8 fg-border-b fg-border-[var(--fg-glass-border)] fg-flex fg-justify-between fg-items-center">
          <div class="fg-font-black fg-tracking-widest fg-text-xs fg-opacity-50">Audit Trail History</div>
          <button id="close_logs" class="fg-opacity-40 hover:fg-opacity-100 transition text-2xl">×</button>
        </div>
        <div class="fg-flex-1 fg-overflow-y-auto fg-p-6 fg-space-y-4">
          ${
            logs
              .map(
                (l: any) => `
            <div class="fg-p-4 fg-bg-[var(--fg-white-wash)] fg-rounded-2xl fg-text-[11px] fg-font-mono fg-flex fg-gap-4">
              <span class="fg-opacity-30">${new Date(
                l.timestamp,
              ).toLocaleTimeString()}</span>
              <span class="${
                l.level === 'error'
                  ? 'fg-text-[var(--fg-red)]'
                  : 'fg-text-[var(--fg-green)]'
              } fg-font-black">[${l.level.toUpperCase()}]</span>
              <span class="fg-opacity-80">${l.message}</span>
            </div>
          `,
              )
              .join('') ||
            '<div class="fg-text-center fg-opacity-30 fg-py-20 fg-font-black fg-tracking-widest fg-text-[10px]">Vault Unaccessed</div>'
          }
        </div>
        <div class="fg-p-6 fg-flex fg-justify-end">
          <button class="btn-premium fg-px-8 fg-py-3" id="modal_close_btn" style="background: ${
            COLORS.inAppActiveBg
          }; color: ${COLORS.inAppActiveText}; border: 1px solid ${
        COLORS.inAppActiveBorder
      };">Close</button>
        </div>
      </div>
    `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('#close_logs')?.addEventListener('click', close);
      modal.querySelector('#modal_close_btn')?.addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          close();
        }
      });
    });
}
