import { getLockedTargets } from './sessionGuard';

let pendingDNRTimer: ReturnType<typeof setTimeout> | null = null;

const NEVER_BLOCK_DOMAINS = [
  'stopaccess.pages.dev',
  'pages.dev',
  'supabase.co',
  'accounts.google.com',
  'google.com',
  'gstatic.com',
  'googleusercontent.com',
];

function matchesDomain(domain: string, candidate: string): boolean {
  return domain === candidate || domain.endsWith('.' + candidate);
}

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
          .filter(
            (domain) =>
              domain &&
              !NEVER_BLOCK_DOMAINS.some((allowed) =>
                matchesDomain(domain, allowed),
              ),
          ),
      ),
    );

    // Third-party sub-resource blocking only.
    // First-party blocked pages are handled by the content script overlay. If
    // DNR blocks a blocked site's own scripts/stylesheets, SPAs like Telegram
    // can fail before the overlay has a usable document to cover.
    const netRules = uniqueDomains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' as const },
      condition: {
        urlFilter: `||${domain}^`,
        domainType: 'thirdParty',
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

    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentDomains = currentRules
      .map((r) => r.condition.urlFilter?.replace('||', '').replace('^', ''))
      .filter(Boolean);

    // Determine if this is an "unblock" action (any current domain is missing from uniqueDomains)
    const isUnblocking = currentDomains.some(
      (d) => !uniqueDomains.includes(d!),
    );

    const performUpdate = async () => {
      try {
        const rulesToClear =
          await chrome.declarativeNetRequest.getDynamicRules();
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: rulesToClear.map((r) => r.id),
          addRules: netRules as any,
        });
        console.log(
          `[StopAccess] DNR Synced (${isUnblocking ? 'Instant' : 'Delayed'}): ${
            netRules.length
          } rules active.`,
        );
      } catch (e) {
        console.error('[StopAccess] DNR update failed', e);
      }
      pendingDNRTimer = null;
    };

    if (pendingDNRTimer) {
      clearTimeout(pendingDNRTimer);
      pendingDNRTimer = null;
    }

    if (isUnblocking) {
      // Unblocking must be instantaneous for good UX
      await performUpdate();
    } else {
      // Blocking is delayed to allow the site to 'background load' assets
      // so it doesn't break SPAs and usage tracking.
      pendingDNRTimer = setTimeout(performUpdate, 2500);
    }

    return { ok: true, count: netRules.length };
  } catch (error) {
    console.error('[StopAccess] DNR Sync failed:', error);
    return { ok: false, error: error.message };
  }
}
