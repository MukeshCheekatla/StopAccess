/**
 * DNR Adapter for FocusGate Extension
 * Synchronizes domain rules with chrome.declarativeNetRequest
 */

import { buildExtensionPagePath } from '@focusgate/core';

export async function syncDNRRules(domains) {
  if (!Array.isArray(domains)) {
    return { ok: false, error: 'Invalid domains list' };
  }

  try {
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

    const blockedPagePath = `/${buildExtensionPagePath('blocked.html')}`;
    const netRules = uniqueDomains.flatMap((domain, index) => {
      const baseId = index * 2 + 1;
      return [
        {
          id: baseId,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: {
              extensionPath: blockedPagePath,
            },
          },
          condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: ['main_frame'],
          },
        },
        {
          id: baseId + 1,
          priority: 1,
          action: { type: 'block' },
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
        },
      ];
    });

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRules.map((r) => r.id),
      addRules: netRules,
    });

    console.log(`[FocusGate] DNR Synced: ${netRules.length} rules active.`);
    return { ok: true, count: netRules.length };
  } catch (error) {
    console.error('[FocusGate] DNR Sync failed:', error);
    return { ok: false, error: error.message };
  }
}
