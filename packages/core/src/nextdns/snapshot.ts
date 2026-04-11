import {
  NextDNSService,
  NextDNSCategory,
  NextDNSEntity,
  NextDNSResponse,
  NextDNSFullSnapshot,
} from '@stopaccess/types';
import type { NextDNSClient } from './client';
import { getServices } from './services';
import { getCategories } from './categories';
import { getDenylist } from './denylist';
import { getSecurity } from './security';
import { getPrivacy } from './privacy';
import { getParentalControl } from './parentalControl';

export async function getRemoteSnapshot(client: NextDNSClient): Promise<
  NextDNSResponse<{
    services: NextDNSService[];
    categories: NextDNSCategory[];
    denylist: NextDNSEntity[];
  }>
> {
  const [services, categories, denylist] = await Promise.all([
    getServices(client),
    getCategories(client),
    getDenylist(client),
  ]);

  if (!services.ok) {
    return services as any;
  }
  if (!categories.ok) {
    return categories as any;
  }
  if (!denylist.ok) {
    return denylist as any;
  }

  return {
    ok: true,
    data: {
      services: services.data,
      categories: categories.data,
      denylist: denylist.data,
    },
  };
}

export async function getFullSnapshot(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSFullSnapshot>> {
  const [services, categories, denylist, security, privacy, parentalControl] =
    await Promise.all([
      getServices(client),
      getCategories(client),
      getDenylist(client),
      getSecurity(client),
      getPrivacy(client),
      getParentalControl(client),
    ]);

  if (!services.ok) {
    return services as any;
  }
  if (!categories.ok) {
    return categories as any;
  }
  if (!denylist.ok) {
    return denylist as any;
  }
  if (!security.ok) {
    return security as any;
  }
  if (!privacy.ok) {
    return privacy as any;
  }
  if (!parentalControl.ok) {
    return parentalControl as any;
  }

  return {
    ok: true,
    data: {
      services: services.data,
      categories: categories.data,
      denylist: denylist.data,
      security: security.data,
      privacy: privacy.data,
      parentalControl: parentalControl.data,
    },
  };
}
