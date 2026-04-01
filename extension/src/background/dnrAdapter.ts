import { getLockedTargets } from './sessionGuard';

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
        '[FocusGate] Protection: Re-injecting locked domains into DNR rules:',
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

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRules.map((r) => r.id),
      addRules: netRules as any,
    });

    console.log(
      `[FocusGate] DNR Synced: ${netRules.length} sub-resource rules active.`,
    );
    return { ok: true, count: netRules.length };
  } catch (error) {
    console.error('[FocusGate] DNR Sync failed:', error);
    return { ok: false, error: error.message };
  }
}
