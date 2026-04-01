import { AppRule, ScheduleRule, SyncContext } from '@focusgate/types';
import { getDomainForRule, FALLBACK_DOMAINS } from './domains.ts';
import { SyncOrchestrator } from './sync.ts';

export class FocusEngine {
  private ctx: SyncContext;
  public sync: SyncOrchestrator;
  private interval: any = null;

  constructor(ctx: SyncContext) {
    this.ctx = ctx;
    this.sync = new SyncOrchestrator(ctx);
  }

  async start(intervalMs = 60000) {
    if (this.interval) {
      clearInterval(this.interval);
    }
    await this.tick();
    this.interval = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async tick(forcePush = false) {
    try {
      // 1. Pull from cloud if needed
      if (!forcePush) {
        await this.sync.performSync(false);
      }

      // 2. Local Evaluation
      const result = await runFullEngineCycle(this.ctx);

      // 3. Push to cloud if forced or if local state changed
      if (forcePush || result.ok) {
        await this.sync.performSync(true);
      }

      return result;
    } catch (e) {
      this.ctx.logger?.add('error', 'Engine tick failed', String(e));
      return { ok: false, error: String(e) };
    }
  }
}

export function evaluateRules({
  rules,
  schedules,
  focusEndTime,
  now = new Date(),
}: {
  rules: AppRule[];
  schedules: ScheduleRule[];
  focusEndTime: number;
  now?: Date;
}): { masterBlockList: Map<string, AppRule>; updatedRules: AppRule[] } {
  const masterBlockList = new Map<string, AppRule>();
  const updatedRules: AppRule[] = [];

  const currentDay = now.getDay();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const rulesByPackage = new Map<string, AppRule>(
    rules.map((r) => [r.packageName || r.appName, r]),
  );

  for (const r of rules) {
    let shouldBlock = false;

    if (focusEndTime && Number(focusEndTime) > now.getTime()) {
      shouldBlock = true;
    }

    if (r.mode === 'block') {
      shouldBlock = true;
    }

    if (r.mode === 'limit') {
      const limit = r.dailyLimitMinutes || 0;
      const used = r.usedMinutesToday || 0;
      if (used >= limit || limit === 0) {
        shouldBlock = true;
      }
    }

    const updated = { ...r, blockedToday: shouldBlock };
    if (shouldBlock) {
      // For the engine, we use the unique packageName/id
      masterBlockList.set(r.packageName || r.appName, updated);
    }
    updatedRules.push(updated);
  }

  for (const s of schedules) {
    if (!s.active || !s.days.includes(currentDay)) {
      continue;
    }
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    if (currentMin >= sh * 60 + sm && currentMin < eh * 60 + em) {
      if (!s.appNames || s.appNames.length === 0) {
        for (const [name, rule] of rulesByPackage.entries()) {
          masterBlockList.set(name, { ...rule, blockedToday: true });
        }
      } else {
        for (const name of s.appNames) {
          const rule = rulesByPackage.get(name);
          if (rule) {
            masterBlockList.set(name, { ...rule, blockedToday: true });
          }
        }
      }
    }
  }

  return { masterBlockList, updatedRules };
}

export async function runFullEngineCycle(ctx: SyncContext) {
  const { storage, logger, notifications, usage } = ctx as any;
  const addLog = logger?.add || (() => {});
  const now = new Date();

  try {
    let { rules, schedules, focusEndTime } = await storage.loadGlobalState();

    if (usage && usage.refreshUsage) {
      rules = await usage.refreshUsage(rules);
    }

    const { masterBlockList, updatedRules } = evaluateRules({
      rules,
      schedules,
      focusEndTime,
      now,
    });

    if (notifications) {
      for (const rule of updatedRules) {
        const original = rules.find(
          (r: AppRule) => r.packageName === rule.packageName,
        );
        if (
          rule.blockedToday &&
          !original?.blockedToday &&
          rule.mode === 'limit'
        ) {
          notifications.notifyBlocked(rule.appName);
        }
      }
    }

    await storage.saveRules(updatedRules);

    // Collect ALL domains for Browser Enforcement
    const domains: string[] = [];
    for (const rule of masterBlockList.values()) {
      const domain = getDomainForRule(rule);
      if (domain) {
        domains.push(domain.toLowerCase());
      }
      // If it's a service, we also try to block the packageName if it looks like a domain
      else if (
        (rule.type === 'service' || rule.type === 'category') &&
        rule.packageName.includes('.')
      ) {
        domains.push(rule.packageName.toLowerCase());
      } else if (rule.type === 'service') {
        const fallbackDomain = (FALLBACK_DOMAINS as any)[rule.packageName];
        if (fallbackDomain) {
          domains.push(fallbackDomain);
        }
      }
    }

    const uniquePackages = Array.from(
      new Set(
        Array.from(masterBlockList.values())
          .map((r) => r.packageName)
          .filter(Boolean),
      ),
    );

    if (ctx.enforcements?.applyBlockedPackages) {
      await ctx.enforcements.applyBlockedPackages(uniquePackages);
    }

    return {
      ok: true,
      domains: Array.from(new Set(domains)),
    };
  } catch (e: any) {
    addLog('error', 'Engine cycle failed', String(e));
    return { ok: false, error: e.message };
  }
}

let engineInterval: any = null;

export function startEngine(ctx: SyncContext, intervalMs = 60000) {
  if (engineInterval) {
    clearInterval(engineInterval);
  }
  runFullEngineCycle(ctx).catch(() => {});
  engineInterval = setInterval(() => runFullEngineCycle(ctx), intervalMs);
}

export function stopEngine() {
  if (engineInterval) {
    clearInterval(engineInterval);
  }
  engineInterval = null;
}
