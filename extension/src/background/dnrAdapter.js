/**
 * DNR Adapter for FocusGate Extension
 * Synchronizes domain rules with chrome.declarativeNetRequest
 */

export async function syncDNRRules(domains) {
  if (!Array.isArray(domains)) {
    return { ok: false, error: 'Invalid domains list' };
  }

  try {
    // Map domains to Chrome Dynamic Rules
    // Rule IDs must be > 0 and stable if possible, but for dynamic sync
    // we usually clear and re-add.
    const netRules = domains.map((d, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `*://${d}/*`,
        resourceTypes: [
          'main_frame',
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
      addRules: netRules,
    });

    console.log(`[FocusGate] DNR Synced: ${netRules.length} rules active.`);
    return { ok: true, count: netRules.length };
  } catch (error) {
    console.error('[FocusGate] DNR Sync failed:', error);
    return { ok: false, error: error.message };
  }
}
