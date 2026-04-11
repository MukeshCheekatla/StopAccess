import {
  NextDNSParentalControlSettings,
  NextDNSResponse,
} from '@stopaccess/types';
import { wrapResponse } from './base';
import type { NextDNSClient } from './client';

export async function getParentalControl(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSParentalControlSettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl`,
  );
  return wrapResponse(res);
}

export async function patchParentalControl(
  client: NextDNSClient,
  patch: Partial<NextDNSParentalControlSettings>,
): Promise<NextDNSResponse<NextDNSParentalControlSettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return wrapResponse(res);
}
