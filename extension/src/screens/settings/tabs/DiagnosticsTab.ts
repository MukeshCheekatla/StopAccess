import { UI_EXAMPLES } from '@focusgate/core';
import { toast } from '../../../lib/toast';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';

export async function renderDiagnosticsTab(container: HTMLElement) {
  const { loadSettingsData, testDomainCoverageAction } = await import(
    '../../../../../packages/viewmodels/src/useSettingsVM'
  );
  const { syncState, dnrRules } = await loadSettingsData();

  const content = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      
      <!-- SYNC HUB -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 24px;">
        <div style="flex: 1;">
          <div class="field-label" style="margin-bottom: 8px;">Synchronizer Status</div>
          <div style="font-family: monospace; font-size: 11px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 16px; border-radius: 12px; line-height: 1.8;">
            <div style="display:flex; justify-content:space-between;"><span>STATE</span> <span style="font-weight: 850; color: var(--accent);">${syncState.status.toUpperCase()}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>LAST HANDSHAKE</span> <span style="font-weight: 850;">${
              syncState.lastSyncAt
                ? new Date(syncState.lastSyncAt).toLocaleTimeString()
                : 'N/A'
            }</span></div>
            <div style="display:flex; justify-content:space-between;"><span>PENDING OPS</span> <span style="font-weight: 850;">${
              syncState.pendingOps || 0
            } QUEUED</span></div>
            <div style="display:flex; justify-content:space-between;"><span>BROWSER RULES</span> <span style="font-weight: 850;">${
              dnrRules.length
            } ACTIVE</span></div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; width: 120px;">
          <button class="btn-premium" id="btn_force_sync" style="background: var(--accent); box-shadow: 0 4px 12px rgba(0,196,140,0.2); font-size: 11px;">PUSH SYNC</button>
          <button class="btn-premium" id="btn_poll_sync" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); box-shadow: none; font-size: 11px;">POLL HUB</button>
        </div>
      </div>

      <!-- RULE TESTER -->
      <div style="padding-top: 32px; border-top: 1px solid var(--glass-border);">
        <div class="field-label" style="margin-bottom: 12px;">Enforcement Auditor</div>
        <div style="display: flex; gap: 12px; align-items: stretch;">
          <input type="text" id="test_domain" placeholder="${
            UI_EXAMPLES.GENERIC_DOMAIN
          }" class="input-premium" style="flex:1; height: 52px; border-radius: 14px; font-size: 13px;">
          <button class="btn-premium" id="btn_test_domain" style="width: 100px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); box-shadow: none;">AUDIT</button>
        </div>
        <div id="test_result" style="display: none; padding: 14px; border-radius: 12px; font-size: 11px; font-weight: 850; margin-top: 16px; text-align: center; border: 1px solid transparent; text-transform: uppercase; letter-spacing: 1px;"></div>
      </div>

    </div>
  `;

  container.innerHTML = Card({
    label: 'Diagnostic Engine',
    title: 'System Health Audit',
    description:
      'Verify synchronizer signal integrity and run real-time domain interception tests.',
    badge: {
      text: syncState.status.toUpperCase(),
      variant: syncState.status === 'success' ? 'active' : 'warning',
    },
    content,
  });

  // Attach handlers
  container
    .querySelector('#btn_poll_sync')
    ?.addEventListener('click', async () => {
      const btn = container.querySelector(
        '#btn_poll_sync',
      ) as HTMLButtonElement;
      btn.innerText = 'POLLING...';
      await new Promise((r) => setTimeout(r, 800));
      renderDiagnosticsTab(container);
    });

  container.querySelector('#btn_force_sync')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'manualSync' });
    toast.info('Synchronizer signal pushed.');
  });

  container
    .querySelector('#btn_test_domain')
    ?.addEventListener('click', async () => {
      const domain = (
        container.querySelector('#test_domain') as HTMLInputElement
      ).value
        .trim()
        .toLowerCase();
      const resultDiv = container.querySelector('#test_result') as HTMLElement;
      if (!domain) {
        return;
      }

      resultDiv.style.display = 'block';
      resultDiv.style.background = 'rgba(255,255,255,0.01)';
      resultDiv.style.color = 'var(--muted)';
      resultDiv.innerText = 'ANALYZING TRAFFIC PATH...';

      const { localMatch, dnrMatch } = await testDomainCoverageAction(
        domain,
        dnrRules,
      );

      if (localMatch || dnrMatch) {
        resultDiv.style.color = 'var(--green)';
        resultDiv.style.borderColor = 'rgba(0,196,140,0.1)';
        resultDiv.innerText = '✓ ENFORCEMENT MATCH: INTERCEPTED';
      } else {
        resultDiv.style.color = 'var(--red)';
        resultDiv.style.borderColor = 'rgba(255,0,0,0.1)';
        resultDiv.innerText = '✗ NO ACTIVE RULE: BYPASS PERMITTED';
      }
    });
}
