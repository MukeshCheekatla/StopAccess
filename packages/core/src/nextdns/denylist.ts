import { NextDNSEntity, NextDNSResponse } from '@stopaccess/types';
import { wrapResponse } from './base';
import type { NextDNSClient } from './client';

export async function getDenylist(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSEntity[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/denylist`,
  );
  return wrapResponse(res);
}

export async function setDenylist(
  client: NextDNSClient,
  items: NextDNSEntity[],
): Promise<NextDNSResponse<NextDNSEntity[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/denylist`,
    {
      method: 'PUT',
      body: JSON.stringify(items),
    },
  );
  return wrapResponse(res);
}

export async function addDenylistItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/denylist`,
    {
      method: 'POST',
      body: JSON.stringify({ id, active: true }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeDenylistItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/denylist/${encodeURIComponent(
      id,
    )}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}
