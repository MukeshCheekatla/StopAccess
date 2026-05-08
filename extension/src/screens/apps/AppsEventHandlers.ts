import { toast } from '@/ui/toast';
import { appsController } from '@/lib/appsController';
import {
  handleRuleToggleFlow,
  handleRuleDeletionFlow,
} from './components/AppsFlow';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ByteCompanion } from '@/ui/companion';

export interface AppsPageCallbacks {
  refreshListOnly: () => Promise<void>;
  handleAddDomain: (input?: string) => Promise<void>;
  renderDrawerGrid: (rules: any[], search?: string) => void;
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
      const id =
        toggleBtn.getAttribute('data-id') || toggleBtn.getAttribute('data-pkg');
      const name = toggleBtn.getAttribute('data-name');
      const kind = toggleBtn.getAttribute('data-kind') as
        | 'service'
        | 'category'
        | 'domain';
      const isActive = toggleBtn.getAttribute('aria-checked') === 'true';

      if (id && name && kind) {
        const rule = currentRules.find(
          (r: any) =>
            (r.customDomain || r.packageName) === id &&
            (kind !== 'service' || r.type === 'service'),
        );

        if (rule) {
          await handleRuleToggleFlow(
            rule,
            isActive,
            () => {
              callbacks?.refreshListOnly?.();
            },
            currentRules,
            kind,
          );
        } else {
          // Fallback if rule object doesn't exist yet (e.g. newly added)
          await handleRuleToggleFlow(
            id,
            isActive,
            () => {
              callbacks?.refreshListOnly?.();
            },
            currentRules,
            kind,
          );
        }
      }
    }

    if (unblockBtn) {
      const id =
        unblockBtn.getAttribute('data-id') ||
        unblockBtn.getAttribute('data-pkg');
      if (id) {
        const rule = currentRules.find(
          (r: any) => (r.customDomain || r.packageName) === id,
        );

        if (rule) {
          await handleRuleToggleFlow(
            rule,
            true, // Unblock button always means "disable block"
            () => {
              callbacks?.refreshListOnly?.();
            },
            currentRules,
          );
        }
      }
      return;
    }

    const quickAddBtn = target.closest(
      '.quick-add-service, .aura-card, .quick-add-btn',
    ) as HTMLElement;
    if (quickAddBtn) {
      const id = quickAddBtn.getAttribute('data-id');
      const name = quickAddBtn.getAttribute('data-name');
      if (id && name) {
        await appsController.toggleRule(
          'service',
          id,
          name,
          true,
          currentRules,
        );
        toast.success(`Blocked ${name}`);
        callbacks?.refreshListOnly?.();

        // 🤖 BOT INTERACTION
        const botMessages = [
          `${name} blocked./nGood job!`,
          `${name} added./nYour focus is safe.`,
          `I've handled ${name}./nStay productive!`,
          `${name} is gone./nBack to work?`,
          `${name} added!/nShield is stronger.`,
        ];
        const randomMsg =
          botMessages[Math.floor(Math.random() * botMessages.length)];

        // Find bot container and update it if possible
        const botMount = container.querySelector('#auraBotMount');
        if (botMount && (container as any).botRoot) {
          (container as any).botRoot.render(
            React.createElement(ByteCompanion, {
              mood: 'excited',
              message: randomMsg,
              variant: 'sidebar',
            }),
          );

          // Clear message after 4s
          setTimeout(() => {
            if ((container as any).botRoot) {
              (container as any).botRoot.render(
                React.createElement(ByteCompanion, {
                  mood: 'happy',
                  message: '',
                  variant: 'sidebar',
                }),
              );
            }
          }, 4000);
        }

        // DISAPPEAR ANIMATION
        quickAddBtn.classList.add('disappearing');
        setTimeout(() => {
          // Re-render grid to reflect change
          quickAddBtn.style.display = 'none';
        }, 400);
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
    addBtn.addEventListener('click', () => callbacks.handleAddDomain());
  }

  const openDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    // Initial grid render
    callbacks.renderDrawerGrid(rules, '');

    // 🤖 INITIALIZE BOT
    const botMount = container.querySelector('#auraBotMount');
    if (botMount && !(container as any).botRoot) {
      (container as any).botRoot = createRoot(botMount);
      (container as any).botRoot.render(
        React.createElement(ByteCompanion, {
          mood: 'happy',
          message: 'Explore the catalog/nto find new apps!',
          variant: 'sidebar',
        }),
      );
    }

    setTimeout(() => {
      drawer.style.opacity = '1';
      const searchInput = drawer.querySelector(
        '#drawerSearch',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
    }, 10);
  };

  const drawerSearchInput = container.querySelector(
    '#drawerSearch',
  ) as HTMLInputElement;
  if (drawerSearchInput && !(drawerSearchInput as any).__listenerAttached) {
    (drawerSearchInput as any).__listenerAttached = true;

    // Search filtering
    drawerSearchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value.toLowerCase();
      callbacks.renderDrawerGrid(rules, val);
    });

    // Enter to add domain
    drawerSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const drawerAddBtn = container.querySelector(
          '#btnAddDomainDrawer',
        ) as HTMLElement;
        if (drawerAddBtn) {
          drawerAddBtn.click();
        }
      }
    });
  }

  const closeDrawer = () => {
    if (!overlay || !drawer) {
      return;
    }
    overlay.classList.add('closing');
    drawer.style.opacity = '0';

    // Clear search and reset grid
    const searchInput = drawer.querySelector(
      '#drawerSearch',
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
      callbacks.renderDrawerGrid(rules, '');
    }

    // Scroll back to top
    const grid = drawer.querySelector('#drawerGrid');
    if (grid) {
      grid.scrollTop = 0;
    }

    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  };

  (container as any).closeDrawer = closeDrawer;

  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);

  // Discovery Category Scroll Sync Logic
  const gridContainer = container.querySelector('#drawerGrid');
  const navItems = container.querySelectorAll('.aura-nav-item');
  const indicator = container.querySelector('#auraNavIndicator') as HTMLElement;
  const navContainer = container.querySelector(
    '#auraNavContainer',
  ) as HTMLElement;

  const refreshNavIndicator = () => {
    const activeItem = container.querySelector(
      '.aura-nav-item.active',
    ) as HTMLElement;
    if (activeItem && indicator && navContainer) {
      const itemRect = activeItem.getBoundingClientRect();
      const containerRect = navContainer.getBoundingClientRect();

      indicator.style.height = `${itemRect.height * 0.5}px`;
      indicator.style.top = `${
        itemRect.top - containerRect.top + itemRect.height * 0.25
      }px`;
      indicator.style.opacity = '1';
    } else if (indicator) {
      indicator.style.opacity = '0';
    }
  };

  if (gridContainer && navItems.length > 0) {
    // Click to scroll
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const targetCat = item.getAttribute('data-target');
        const section = gridContainer.querySelector(
          `.drawer-category-group[data-cat="${targetCat}"]`,
        ) as HTMLElement;

        if (section) {
          navItems.forEach((nav) => nav.classList.remove('active'));
          item.classList.add('active');
          refreshNavIndicator();

          const offset = section.offsetTop - 20;
          gridContainer.scrollTo({
            top: offset,
            behavior: 'smooth',
          });
        }
      });
    });

    // Scroll sync logic
    gridContainer.addEventListener('scroll', () => {
      const groups = gridContainer.querySelectorAll('.drawer-category-group');
      let currentCat = '';

      const containerRect = gridContainer.getBoundingClientRect();
      const isAtBottom =
        gridContainer.scrollTop + gridContainer.clientHeight >=
        gridContainer.scrollHeight - 60;

      if (isAtBottom) {
        const lastGroup = groups[groups.length - 1];
        currentCat = lastGroup?.getAttribute('data-cat') || '';
      } else {
        // Find the most relevant category (the one that is most visible at the top)
        groups.forEach((group) => {
          const rect = group.getBoundingClientRect();
          if (rect.top - containerRect.top < 150) {
            currentCat = group.getAttribute('data-cat') || '';
          }
        });
      }

      if (currentCat) {
        let changed = false;
        navItems.forEach((nav) => {
          const target = nav.getAttribute('data-target');
          const isMatch = target === currentCat;
          if (isMatch && !nav.classList.contains('active')) {
            nav.classList.add('active');
            changed = true;
          } else if (!isMatch && nav.classList.contains('active')) {
            nav.classList.remove('active');
            changed = true;
          }
        });
        if (changed) {
          refreshNavIndicator();
        }
      }
    });

    // Initial position
    setTimeout(refreshNavIndicator, 100);
  }

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

  container.querySelectorAll('.delete-rule').forEach((btn) => {
    if ((btn as any).__listenerAttached) {
      return;
    }
    (btn as any).__listenerAttached = true;
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      if (pkg) {
        await handleRuleDeletionFlow(pkg, rules, () => {
          callbacks?.refreshListOnly?.();
        });
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

      const { checkGuard } = await import('@/background/sessionGuard');
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
          const { confirmGuardianAction } = (await import('@/ui/ui')) as any;
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
          '@/background/platformAdapter'
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
          const { confirmGuardianAction } = (await import('@/ui/ui')) as any;
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
          '@/background/platformAdapter'
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
