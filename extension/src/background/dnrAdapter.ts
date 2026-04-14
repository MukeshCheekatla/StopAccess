import { getLockedTargets } from './sessionGuard';

let pendingDNRTimer: ReturnType<typeof setTimeout> | null = null;

export async function syncDNRRules(domains: string[]) {
  if (!Array.isArray(domains)) {
    return { ok: false, error: 'Invalid domains list' };
  }

  try {
    const locked = await getLockedTargets();
    const incomingNormalized = domains.map((d) =>
      String(d || '')
        .trim()
        .toLowerCase(),
    );

    const missingLocked = locked.denylist.filter(
      (d) => !incomingNormalized.includes(d.toLowerCase().trim()),
    );

    if (missingLocked.length > 0) {
      console.warn(
        '[StopAccess] Protection: Re-injecting locked domains into DNR rules:',
        missingLocked,
      );
      domains = [...domains, ...missingLocked];
    }

    const uniqueDomains = Array.from(
      new Set(
        domains
          .map((d) =>
            String(d || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    );

    // Sub-resource blocking only.
    // main_frame is handled by content script overlay.
    const netRules = uniqueDomains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' as const },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: [
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'csp_report',
          'media',
          'websocket',
          'other',
        ],
      },
    }));

    // Delay DNR block by 2 seconds to allow the page and block overlay to load first
    if (pendingDNRTimer) {
      clearTimeout(pendingDNRTimer);
    }

    pendingDNRTimer = setTimeout(async () => {
      try {
        const currentRules =
          await chrome.declarativeNetRequest.getDynamicRules();
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: currentRules.map((r) => r.id),
          addRules: netRules as any,
        });
        console.log(
          `[StopAccess] DNR Synced (Delayed): ${netRules.length} sub-resource rules active.`,
        );
      } catch (e) {
        console.error('[StopAccess] Delayed DNR update failed', e);
      }
    }, 2000);

    return { ok: true, count: netRules.length };
  } catch (error) {
    console.error('[StopAccess] DNR Sync failed:', error);
    return { ok: false, error: error.message };
  }
}
