import { NextDNSService, NextDNSResponse } from '@focusgate/types';
import { wrapResponse } from './base';
import type { NextDNSClient } from './client';

export async function getServices(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSService[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/services`,
  );
  return wrapResponse(res);
}

export async function setServices(
  client: NextDNSClient,
  items: NextDNSService[],
): Promise<NextDNSResponse<NextDNSService[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/services`,
    {
      method: 'PUT',
      body: JSON.stringify(items),
    },
  );
  return wrapResponse(res);
}

export async function addServiceItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/services`,
    {
      method: 'POST',
      body: JSON.stringify({ id, active: true }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeServiceItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${
      (client as any).cfg.profileId
    }/parentalControl/services/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}
