/**
 * DNR Adapter for FocusGate Extension
 * Synchronizes domain rules with chrome.declarativeNetRequest
 */

import { getLockedTargets } from './sessionGuard';

export async function syncDNRRules(domains: string[]) {
  if (!Array.isArray(domains)) {
    return { ok: false, error: 'Invalid domains list' };
  }

  try {
    // 1. Guard rule reduction during focus sessions
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
      // Ensure they are added back so they cannot be removed via rule sync
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

    // Only block sub-resources via DNR.
    // main_frame blocking is handled entirely by the content script overlay,
    // which allows for a smoother transition and more context-aware blocking UI.
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
