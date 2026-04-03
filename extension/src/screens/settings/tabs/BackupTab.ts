import { toast } from '../../../lib/toast';
import { renderSectionCard as Card } from '../../../ui/components/SectionCard';
import { pinGate } from '../../../lib/pinGate';

export async function renderBackupTab(container: HTMLElement) {
  const { exportRulesAction, importRulesAction } = await import(
    '../../../../../packages/viewmodels/src/useSettingsVM'
  );

  const content = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px;">
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 850; color: var(--text);">Export Protocol</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;">Download a JSON archive of all local domain perimeters and rule configurations.</div>
        </div>
        <button class="btn-premium" id="btn_export_rules" style="width: 120px; font-size: 11px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); box-shadow: none;">CREATE BACKUP</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; padding-top: 32px; border-top: 1px solid var(--glass-border);">
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 850; color: var(--text);">Restore Interface</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px; line-height: 1.4;">Restore a previously exported rule set. This will overwrite all active local perimeters.</div>
        </div>
        <button class="btn-premium" id="btn_import_rules" style="width: 120px; font-size: 11px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); box-shadow: none;">RESTORE RULES</button>
      </div>

    </div>
  `;

  container.innerHTML = Card({
    label: 'Data Persistence',
    title: 'Archive Management',
    description:
      'Securely export and restore your enforcement perimeters and domain configurations.',
    badge: { text: 'REDUNDANCY', variant: 'muted' },
    content,
  });

  // Attach handlers
  container
    .querySelector('#btn_export_rules')
    ?.addEventListener('click', async () => {
      const rulesStr = await exportRulesAction();
      const blob = new Blob([rulesStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusgate_backup_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Archive successfully generated.');
    });

  container
    .querySelector('#btn_import_rules')
    ?.addEventListener('click', async () => {
      const pinCheck = await pinGate.checkPin('Restore Rules Backup');
      if (!pinCheck.allowed) {
        return;
      }

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
          await importRulesAction(text);
          toast.success('Perimeters successfully restored.');
        } catch (err: any) {
          toast.error(`Restore Failure: ${err.message}`);
        }
      };
      input.click();
    });
}
