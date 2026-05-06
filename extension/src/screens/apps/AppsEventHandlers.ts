import { toast } from '../../ui/toast';
import { appsController } from '../../lib/appsController';
import { NEXTDNS_SERVICES } from '@stopaccess/core';

export interface AppsPageCallbacks {
  refreshListOnly: () => Promise<void>;
  handleAddDomain: () => Promise<void>;
}

/**
 * Attaches the main event delegation listener to the container exactly once.
 * This prevents duplicate listeners from triggering multiple actions (and multiple PIN prompts).
 */
export function setupGlobalClickHandlers(container: HTMLElement) {
  if ((container as any).__clickListenerAttached) {
    return;
  }
  (container as any).__clickListenerAttached = true;

  const callbacks = (container as any).appsCallbacks as AppsPageCallbacks;

  const openDrawer = () => {
    const overlay = container.querySelector(
      '#targetDrawerOverlay',
    ) as HTMLElement;
    const drawer = container.querySelector('#targetDrawer') as HTMLElement;
    if (!overlay || !drawer) {
      return;
    }
    overlay.style.display = 'flex';
    setTimeout(() => {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }, 10);
  };

  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const toggleBtn = target.closest('.toggle-switch-btn') as HTMLElement;
    const unblockBtn = target.closest('.btn-unblock-shield') as HTMLElement;
    const openDrawerBtn = target.closest('#btnOpenTargetDrawer') as HTMLElement;
    const currentRules = (container as any).currentRules || [];

    if (openDrawerBtn) {
      openDrawer();
      return;
    }

    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-id');
      const name = toggleBtn.getAttribute('data-name');
      const kind = toggleBtn.getAttribute('data-kind') as
        | 'service'
        | 'category'
        | 'domain';
      const isActive = toggleBtn.getAttribute('aria-checked') === 'true';

      if (id && name && kind) {
        // Categories don't need PIN/security check for toggle, but services/domains do
        if (kind !== 'category') {
          const { checkGuard } = await import('../../background/sessionGuard');
          const guard = await checkGuard('modify_blocklist');
          if (!guard.allowed) {
            toast.error((guard as any).reason);
            return;
          }

          // If activating a block (turning switch ON), check guardian PIN
          if (!isActive) {
            const { confirmGuardianAction } = (await import(
              '../../ui/ui'
            )) as any;
            const confirmed = await confirmGuardianAction({
              title: 'Activate Block?',
              body: `Verify your security to start blocking ${name}.`,
            });
            if (!confirmed) {
              return;
            }
          }
        }

        const res = await appsController.toggleRule(
          kind,
          id,
          name,
          !isActive,
          currentRules,
        );
        if (res.ok) {
          toast.success(`${name} ${!isActive ? 'blocked' : 'allowed'}`);
          if (callbacks?.refreshListOnly) {
            await callbacks.refreshListOnly();
          }
        } else {
          toast.error(res.error);
        }
      }
      return;
    }

    if (unblockBtn) {
      const id = unblockBtn.getAttribute('data-id');
      const name = unblockBtn.getAttribute('data-name');

      if (id) {
        const { showUnblockDurationDialog, confirmGuardianAction } =
          (await import('../../ui/ui')) as any;
        const { extensionAdapter } = await import(
          '../../background/platformAdapter'
        );

        const choice = await showUnblockDurationDialog();
        if (!choice) {
          return;
        }

        const confirmed = await confirmGuardianAction({
          title: 'Verify Security',
          body: `Please verify to unblock ${name || id}.`,
          skipSimpleConfirm: true,
        });

        if (confirmed) {
          let minutes = 40;
          if (choice === 'today') {
            minutes = appsController.minutesTillMidnight();
          }

          const rule = currentRules.find(
            (r: any) => (r.customDomain || r.packageName) === id,
          );
          const maxPasses = rule?.maxDailyPasses ?? 3;

          const res = await appsController.grantTempPass(
            id,
            minutes,
            maxPasses,
            true,
          );
          if (res.ok) {
            // Reset streak
            const { updateRule } = await import('@stopaccess/state/rules');
            if (rule) {
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
            if (callbacks?.refreshListOnly) {
              await callbacks.refreshListOnly();
            }
          } else {
            toast.error(res.error);
          }
        }
        return;
      }
    }
  });
}

export async function setupHandlers(
  container: HTMLElement,
  rules: any[],
  callbacks: AppsPageCallbacks,
) {
  // Store latest rules on the container so the singleton listener can access them
  (container as any).currentRules = rules;
  (container as any).appsCallbacks = callbacks;

  // Initialize the singleton click listener if needed
  setupGlobalClickHandlers(container);

  const overlay = container.querySelector(
    '#targetDrawerOverlay',
  ) as HTMLElement;
  const drawer = container.querySelector('#targetDrawer') as HTMLElement;
  const openBtn = container.querySelector('#btnOpenTargetDrawer');
  const closeBtn = container.querySelector('#btnCloseTargetDrawer');
  const addBtn = container.querySelector('#btnAddDomainUnified');

  if (addBtn && !(addBtn as any).__listenerAttached) {
    (addBtn as any).__listenerAttached = true;
    addBtn.addEventListener('click', callbacks.handleAddDomain);
  }

  const openDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    overlay.style.display = 'flex';
    setTimeout(() => {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }, 10);
  };

  const closeDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    drawer.style.opacity = '0';
    drawer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  };

  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);

  const drawerSearch = container.querySelector(
    '#drawerSearch',
  ) as HTMLInputElement;
  const serviceItems = Array.from(
    container.querySelectorAll('.quick-add-service'),
  ) as HTMLElement[];
  const categoryGroups = Array.from(
    container.querySelectorAll('.drawer-category-group'),
  ) as HTMLElement[];

  drawerSearch?.addEventListener('input', (e) => {
    const term = (e.target as HTMLInputElement).value.toLowerCase();

    // 1. Toggle item visibility
    serviceItems.forEach((item) => {
      const name = (item.getAttribute('data-name') || '').toLowerCase();
      const id = (item.getAttribute('data-id') || '').toLowerCase();
      const isMatch = name.includes(term) || id.includes(term);
      item.style.display = isMatch ? 'flex' : 'none';
    });

    // 2. Hide category headers if no items are visible in that group
    categoryGroups.forEach((group) => {
      const cat = group.getAttribute('data-cat');
      const hasVisible = serviceItems.some((item) => {
        const itemCat =
          NEXTDNS_SERVICES.find((s) => s.id === item.getAttribute('data-id'))
            ?.category || 'Other';
        return itemCat === cat && item.style.display !== 'none';
      });
      group.style.display = hasVisible ? 'flex' : 'none';
    });
  });

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && overlay?.style.display === 'flex') {
      closeDrawer();
    }
  };
  window.addEventListener('keydown', handleEsc);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDrawer();
    }
  });

  container.querySelectorAll('.quick-add-service').forEach((btn) => {
    if ((btn as any).__listenerAttached) {
      return;
    }
    (btn as any).__listenerAttached = true;
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const currentRules = (container as any).currentRules || [];
      if (id && name) {
        await appsController.toggleRule(
          'service',
          id,
          name,
          true,
          currentRules,
        );
      }
    });
  });

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    if ((btn as any).__listenerAttached) {
      return;
    }
    (btn as any).__listenerAttached = true;
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      if (pkg) {
        const row = btn.closest('.rule-table-row') as HTMLElement;
        const performRemoval = async () => {
          if (row) {
            row.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            row.style.opacity = '0';
            row.style.transform = 'scale(0.95) translateX(-10px)';
            row.style.pointerEvents = 'none';

            // Smoothly collapse height
            const height = row.offsetHeight;
            row.style.height = height + 'px';
            requestAnimationFrame(() => {
              row.style.height = '0px';
              row.style.paddingTop = '0px';
              row.style.paddingBottom = '0px';
              row.style.borderBottomWidth = '0px';
              row.style.marginTop = '0px';
              row.style.marginBottom = '0px';
            });
          }

          // Run background removal quietly
          const result = await appsController.removeRule(pkg, rules);
          if (!result.ok && row) {
            // Restore if failed
            row.style.height = '';
            row.style.paddingTop = '';
            row.style.paddingBottom = '';
            row.style.opacity = '1';
            row.style.transform = '';
            row.style.pointerEvents = '';
          }
        };

        const { confirmGuardianAction } = (await import('../../ui/ui')) as any;
        const confirmed = await confirmGuardianAction({
          title: 'Delete Rule?',
          body: 'Verify your security to remove this block permanently.',
          isDestructive: true,
        });

        if (confirmed) {
          await performRemoval();
        }
      }
    });
  });

  // Custom Select Global Interaction
  container.querySelectorAll('.fg-select-trigger').forEach((trigger) => {
    if ((trigger as any).__listenerAttached) {
      return;
    }
    (trigger as any).__listenerAttached = true;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = trigger.nextElementSibling as HTMLElement;
      const wasActive = menu.classList.contains('active');
      const parentRow = trigger.closest(
        '.service-card, .rule-table-row',
      ) as HTMLElement;
      const scrollParent = trigger.closest(
        '.rule-table-body-scroll',
      ) as HTMLElement;

      // Close all other menus and reset their parents
      document.querySelectorAll('.fg-select-menu.active').forEach((m) => {
        if (m !== menu) {
          m.classList.remove('active');
          const otherParent = m.closest(
            '.service-card, .rule-table-row',
          ) as HTMLElement;
          if (otherParent) {
            otherParent.style.zIndex = '1';
          }
        }
      });

      const nextActive = !wasActive;
      menu.classList.toggle('active', nextActive);

      if (nextActive) {
        menu.classList.add('is-fixed');
        const updatePosition = () => {
          if (!menu.classList.contains('active')) {
            return;
          }
          const trigRect = trigger.getBoundingClientRect();
          menu.style.width = `${trigRect.width}px`;
          menu.style.left = `${trigRect.left}px`;

          // Try bottom first
          menu.style.top = `${trigRect.bottom + 6}px`;
          menu.style.bottom = 'auto';
          menu.style.transformOrigin = 'top';

          const menuRect = menu.getBoundingClientRect();
          const hitBottom = menuRect.bottom > window.innerHeight - 10;

          if (hitBottom && trigRect.top > 200) {
            menu.style.top = 'auto';
            menu.style.bottom = `${window.innerHeight - trigRect.top + 6}px`;
            menu.style.transformOrigin = 'bottom';
          }
        };
        updatePosition();

        const scrollHandler = () => updatePosition();
        scrollParent?.addEventListener('scroll', scrollHandler);
        (menu as any).__scrollHandler = scrollHandler;
        (menu as any).__scrollParent = scrollParent;

        if (parentRow) {
          parentRow.style.zIndex = '100';
        }
      } else {
        menu.classList.remove('is-fixed');
        const handler = (menu as any).__scrollHandler;
        const parent = (menu as any).__scrollParent;
        if (handler && parent) {
          parent.removeEventListener('scroll', handler);
        }
        if (parentRow) {
          parentRow.style.zIndex = '1';
        }
      }
    });
  });

  document.addEventListener(
    'click',
    () => {
      document.querySelectorAll('.fg-select-menu.active').forEach((m) => {
        m.classList.remove('active', 'is-fixed');
        const handler = (m as any).__scrollHandler;
        const parent = (m as any).__scrollParent;
        if (handler && parent) {
          parent.removeEventListener('scroll', handler);
        }
        const parentRow = m.closest(
          '.service-card, .rule-table-row',
        ) as HTMLElement;
        if (parentRow) {
          parentRow.style.zIndex = '1';
        }
      });
    },
    { once: false },
  );

  container.querySelectorAll('.fg-select-option').forEach((option) => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      const parent = option.closest('.fg-custom-select') as HTMLElement;
      const pkg = parent.getAttribute('data-pkg');
      const val = parseInt(
        (option as HTMLElement).getAttribute('data-value') || '0',
        10,
      );
      const isLimitSelect = parent.classList.contains('edit-limit-select');
      const isPassSelect = parent.classList.contains('edit-pass-select');

      const menu = parent.querySelector('.fg-select-menu');
      menu?.classList.remove('active');

      const rule = rules.find(
        (r: any) => (r.customDomain || r.packageName) === pkg,
      );
      if (!rule || !pkg) {
        return;
      }

      const { checkGuard } = await import('../../background/sessionGuard');
      const guard = await checkGuard('modify_blocklist');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return;
      }

      if (isLimitSelect) {
        // If the toggle is OFF, keep mode as 'allow' — don't activate limit tracking
        const isEnabled =
          rule.desiredBlockingState !== false && rule.mode !== 'allow';
        const newMode = !isEnabled ? 'allow' : val > 0 ? 'limit' : 'block';
        const isIncreasingLimit = val > (rule.dailyLimitMinutes || 0);

        if (isIncreasingLimit) {
          const { confirmGuardianAction } = (await import(
            '../../ui/ui'
          )) as any;
          const confirmed = await confirmGuardianAction({
            title: 'Increase Allowance?',
            body: `Verify your security to increase allowed time for ${
              rule.appName || pkg
            }.`,
          });
          if (!confirmed) {
            return;
          }
        }

        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@stopaccess/state/rules');
        const used = rule.usedMinutesToday || 0;
        const isNowBlocked =
          newMode === 'block' || (newMode === 'limit' && used >= val);

        await updateRule(storage, {
          ...(rule as any),
          dailyLimitMinutes: val,
          mode: newMode as any,
          streakDays: isIncreasingLimit ? 0 : rule.streakDays,
          streakStartedAt: isIncreasingLimit
            ? Date.now()
            : rule.streakStartedAt,
          blockedToday: isNowBlocked,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(`Usage limit updated: ${(option as HTMLElement).innerText}`);
        if (callbacks?.refreshListOnly) {
          await callbacks.refreshListOnly();
        }
      } else if (isPassSelect) {
        const currentPasses =
          rule.maxDailyPasses !== undefined ? rule.maxDailyPasses : 3;
        const isIncreasingPasses = val > currentPasses;

        if (isIncreasingPasses) {
          const { confirmGuardianAction } = (await import(
            '../../ui/ui'
          )) as any;
          const confirmed = await confirmGuardianAction({
            title: 'Increase Passes?',
            body: `Verify your security to allow more pauses for ${
              rule.appName || pkg
            }.`,
          });
          if (!confirmed) {
            return;
          }
        }

        const { extensionAdapter: storage } = await import(
          '../../background/platformAdapter'
        );
        const { updateRule } = await import('@stopaccess/state/rules');
        await updateRule(storage, {
          ...(rule as any),
          maxDailyPasses: val,
          updatedAt: Date.now(),
        });
        chrome.runtime.sendMessage({ action: 'manualSync' });
        toast.info(`Daily pass count updated to ${val}`);
        if (callbacks?.refreshListOnly) {
          await callbacks.refreshListOnly();
        }
      }
    });
  });
}
