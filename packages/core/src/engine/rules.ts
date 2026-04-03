import { AppRule, ScheduleRule, SyncContext } from '@focusgate/types';
import { getDomainForRule, FALLBACK_DOMAINS } from './domains';
import { SyncOrchestrator } from './sync';

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
      if (limit > 0 && used >= limit) {
        shouldBlock = true;
      }
    }

    const updated = { ...r, blockedToday: shouldBlock };
    if (shouldBlock) {
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

export async function runFullEngineCycle(ctx: SyncContext, now = new Date()) {
  const { storage, logger, notifications, usage } = ctx;
  const addLog = logger?.add || (() => {});

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
        const original = rules.find((r) => r.packageName === rule.packageName);
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

    const domains: string[] = [];
    for (const rule of masterBlockList.values()) {
      const domain = getDomainForRule(rule);
      if (domain) {
        domains.push(domain.toLowerCase());
      } else if (
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

    return { ok: true, domains: Array.from(new Set(domains)) };
  } catch (e: any) {
    addLog('error', 'Engine cycle failed', String(e));
    return { ok: false, error: e.message };
  }
}

export class FocusEngine {
  public sync: SyncOrchestrator;
  private timer: any = null;

  constructor(private ctx: SyncContext) {
    this.sync = new SyncOrchestrator(ctx);
  }

  async start() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => this.tick(), 5 * 60 * 1000); // 5 min
    return this.tick();
  }

  async tick(forcePush = false) {
    const res = await runFullEngineCycle(this.ctx);
    await this.sync.performSync(forcePush);
    return res;
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return { ok: true };
  }
}
