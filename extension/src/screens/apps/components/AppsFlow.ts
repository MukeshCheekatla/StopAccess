import { appsController } from '@/lib/appsController';
import { toast } from '@/ui/toast';
import { showUnblockDurationDialog, confirmGuardianAction } from '@/ui/ui';
import { AppRule } from '@stopaccess/types';

/**
 * Shared logic for unblocking or toggling rules across Popup and Dashboard.
 *
 * @param rule - The rule object or domain string to toggle
 * @param isCurrentlyActive - Whether the rule is currently enforcing a block
 * @param refresh - Callback to update the UI
 */
export async function handleRuleToggleFlow(
  rule: AppRule | string,
  isCurrentlyActive: boolean,
  refresh: () => void,
  rules: AppRule[] = [],
  explicitKind?: 'service' | 'category' | 'domain',
) {
  const isString = typeof rule === 'string';
  const id = isString ? rule : rule.customDomain || rule.packageName;
  const name = isString ? rule : rule.appName || id;
  const kind = explicitKind || (isString ? 'domain' : rule.type || 'domain');

  // Case 1: Enabling a block (Resuming or turning switch ON)
  if (!isCurrentlyActive) {
    const res = await appsController.toggleRule(kind, id, name, true, rules);
    if (res.ok) {
      toast.success(`${name} blocked`);
      refresh();
    } else {
      toast.error(res.error);
    }
    return;
  }

  // Case 2: Disabling a block (Turning switch OFF or Pause)
  if (kind === 'category') {
    // Categories get a simple confirmation then full disable
    const confirmed = await confirmGuardianAction({
      title: 'Unblock Category',
      body: `Are you sure you want to disable the ${name} category? This will affect all associated apps and sites.`,
      isDestructive: true,
    });

    if (!confirmed) {
      return;
    }

    const res = await appsController.toggleRule(kind, id, name, false, rules);
    if (res.ok) {
      toast.success(`${name} allowed`);
      refresh();
    } else {
      toast.error(res.error);
    }
  } else {
    // Domains/Services get a duration-based unblock flow
    const choice = await showUnblockDurationDialog(name);
    if (!choice) {
      return;
    }

    const confirmed = await confirmGuardianAction({
      title: 'Verify Security',
      body: `Please verify to unblock ${name}.`,
      skipSimpleConfirm: true,
    });

    if (!confirmed) {
      return;
    }

    if (choice === 'today') {
      // For "Rest of Today", we do a full disable of the rule.
      // This ensures that NextDNS is also updated (if Hard Mode is on).
      const res = await appsController.toggleRule(kind, id, name, false, rules);
      if (res.ok) {
        toast.success(`${name} disabled for today`);
        refresh();
      } else {
        toast.error(res.error);
      }
      return;
    }

    let minutes = 40;

    const maxPasses = isString ? 3 : rule.maxDailyPasses ?? 3;
    const res = await appsController.grantTempPass(
      id,
      minutes,
      maxPasses,
      true,
    );
    if (res.ok) {
      // Reset streak for the rule
      if (!isString) {
        const { updateRule } = await import('@stopaccess/state/rules');
        const { extensionAdapter } = await import(
          '@/background/platformAdapter'
        );
        await updateRule(extensionAdapter, {
          ...rule,
          streakDays: 0,
          streakStartedAt: Date.now(),
        });
      }

      toast.success(
        `Unblocked for ${
          choice === '40mins' ? '40 minutes' : 'the rest of today'
        }`,
      );
      refresh();
    } else {
      toast.error(res.error);
    }
  }
}

/**
 * Shared logic for deleting a rule.
 */
export async function handleRuleDeletionFlow(
  pkg: string,
  rules: AppRule[],
  onSuccess: () => void,
) {
  const confirmed = await confirmGuardianAction({
    title: 'Delete Rule?',
    body: 'Verify your security to remove this block permanently.',
    isDestructive: true,
  });

  if (confirmed) {
    const res = await appsController.removeRule(pkg, rules);
    if (res.ok) {
      toast.success('Rule removed');
      onSuccess();
    } else {
      toast.error(res.error);
    }
  }
}
