import { NextDNSCategory, NextDNSResponse } from '@focusgate/types';
import { wrapResponse } from './base';
import type { NextDNSClient } from './client';

export async function getCategories(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSCategory[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/categories`,
  );
  return wrapResponse(res);
}

export async function setCategories(
  client: NextDNSClient,
  items: NextDNSCategory[],
): Promise<NextDNSResponse<NextDNSCategory[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/categories`,
    {
      method: 'PUT',
      body: JSON.stringify(items),
    },
  );
  return wrapResponse(res);
}

export async function addCategoryItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/parentalControl/categories`,
    {
      method: 'POST',
      body: JSON.stringify({ id, active: true }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeCategoryItem(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${
      (client as any).cfg.profileId
    }/parentalControl/categories/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}
