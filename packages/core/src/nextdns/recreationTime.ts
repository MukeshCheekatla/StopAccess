import { NextDNSRecreationTime, NextDNSResponse } from '@focusgate/types';
import type { NextDNSClient } from './client';
import { wrapResponse } from './base';

export async function getRecreationTime(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSRecreationTime>> {
  const profileId = (client as any).cfg.profileId;
  try {
    const res = await client.fetch(`/profiles/${profileId}/parentalControl`);
    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: 'profile_mismatch',
          message: `Failed to connect: /profiles/${profileId}/parentalControl [${res.status}]`,
          status: res.status,
        },
      };
    }
    return wrapResponse(res, (data) => {
      // Return the full map or an empty object
      return (data.recreationTime || {}) as NextDNSRecreationTime;
    });
  } catch (e: any) {
    return {
      ok: false,
      error: { code: 'network_failure', message: e.message },
    };
  }
}

export async function syncRecreationTime(
  client: NextDNSClient,
  recreationTime: NextDNSRecreationTime,
): Promise<NextDNSResponse<boolean>> {
  const profileId = (client as any).cfg.profileId;
  try {
    const res = await client.fetch(`/profiles/${profileId}/parentalControl`, {
      method: 'PATCH',
      body: JSON.stringify({
        parentalControl: {
          recreationTime,
        },
      }),
    });
    return wrapResponse(res, () => true);
  } catch (e: any) {
    return {
      ok: false,
      error: { code: 'network_failure', message: e.message },
    };
  }
}
