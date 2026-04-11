import {
  NextDNSSecuritySettings,
  NextDNSTld,
  NextDNSResponse,
  NextDNSConfig,
} from '@stopaccess/types';
import { wrapResponse } from './base';
import { NextDNSClient } from './client';

export async function getSecurity(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSSecuritySettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/security`,
  );
  return wrapResponse(res);
}

export async function patchSecurity(
  client: NextDNSClient,
  patch: Partial<NextDNSSecuritySettings>,
): Promise<NextDNSResponse<NextDNSSecuritySettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/security`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return wrapResponse(res);
}

export async function getBlockedTlds(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSTld[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/security/tlds`,
  );
  return wrapResponse(res);
}

export async function setBlockedTlds(
  client: NextDNSClient,
  tlds: NextDNSTld[],
): Promise<NextDNSResponse<NextDNSTld[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/security/tlds`,
    {
      method: 'PUT',
      body: JSON.stringify(tlds),
    },
  );
  return wrapResponse(res);
}

export async function addBlockedTld(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/security/tlds`,
    {
      method: 'POST',
      body: JSON.stringify({ id }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeBlockedTld(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${
      (client as any).cfg.profileId
    }/security/tlds/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}

function makeClient(cfg: NextDNSConfig, log: any): NextDNSClient {
  return new NextDNSClient(cfg, log);
}

export async function getSecuritySettings(
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSSecuritySettings | null> {
  const res = await getSecurity(makeClient(cfg, log));
  return res.ok ? res.data : null;
}

export async function patchSecuritySettings(
  patch: Partial<NextDNSSecuritySettings>,
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSSecuritySettings | null> {
  const res = await patchSecurity(makeClient(cfg, log), patch);
  return res.ok ? res.data : null;
}

export async function getBlockedTldsForProfile(
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSTld[]> {
  const res = await getBlockedTlds(makeClient(cfg, log));
  return res.ok ? res.data : [];
}

export async function addBlockedTldToProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await addBlockedTld(makeClient(cfg, log), id);
  return res.ok;
}

export async function removeBlockedTldFromProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await removeBlockedTld(makeClient(cfg, log), id);
  return res.ok;
}
