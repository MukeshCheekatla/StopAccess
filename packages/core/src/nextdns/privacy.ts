import {
  NextDNSPrivacySettings,
  NextDNSBlocklist,
  NextDNSNativeTracking,
  NextDNSResponse,
  NextDNSConfig,
} from '@focusgate/types';
import { wrapResponse } from './base';
import { NextDNSClient } from './client';

export async function getPrivacy(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSPrivacySettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy`,
  );
  return wrapResponse(res);
}

export async function patchPrivacy(
  client: NextDNSClient,
  patch: Partial<NextDNSPrivacySettings>,
): Promise<NextDNSResponse<NextDNSPrivacySettings>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return wrapResponse(res);
}

export async function getBlocklists(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSBlocklist[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/blocklists`,
  );
  return wrapResponse(res);
}

export async function setBlocklists(
  client: NextDNSClient,
  items: NextDNSBlocklist[],
): Promise<NextDNSResponse<NextDNSBlocklist[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/blocklists`,
    {
      method: 'PUT',
      body: JSON.stringify(items),
    },
  );
  return wrapResponse(res);
}

export async function addBlocklist(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/blocklists`,
    {
      method: 'POST',
      body: JSON.stringify({ id }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeBlocklist(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${
      (client as any).cfg.profileId
    }/privacy/blocklists/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}

export async function getNativeTracking(
  client: NextDNSClient,
): Promise<NextDNSResponse<NextDNSNativeTracking[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/natives`,
  );
  return wrapResponse(res);
}

export async function setNativeTracking(
  client: NextDNSClient,
  items: NextDNSNativeTracking[],
): Promise<NextDNSResponse<NextDNSNativeTracking[]>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/natives`,
    {
      method: 'PUT',
      body: JSON.stringify(items),
    },
  );
  return wrapResponse(res);
}

export async function addNativeTracking(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${(client as any).cfg.profileId}/privacy/natives`,
    {
      method: 'POST',
      body: JSON.stringify({ id }),
    },
  );
  return wrapResponse(res, () => true);
}

export async function removeNativeTracking(
  client: NextDNSClient,
  id: string,
): Promise<NextDNSResponse<boolean>> {
  const res = await (client as any).fetch(
    `/profiles/${
      (client as any).cfg.profileId
    }/privacy/natives/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return wrapResponse(res, () => true);
}

function makeClient(cfg: NextDNSConfig, log: any): NextDNSClient {
  return new NextDNSClient(cfg, log);
}

export async function getPrivacySettings(
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSPrivacySettings | null> {
  const res = await getPrivacy(makeClient(cfg, log));
  return res.ok ? res.data : null;
}

export async function patchPrivacySettings(
  patch: Partial<NextDNSPrivacySettings>,
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSPrivacySettings | null> {
  const res = await patchPrivacy(makeClient(cfg, log), patch);
  return res.ok ? res.data : null;
}

export async function getBlocklistsForProfile(
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSBlocklist[]> {
  const res = await getBlocklists(makeClient(cfg, log));
  return res.ok ? res.data : [];
}

export async function addBlocklistToProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await addBlocklist(makeClient(cfg, log), id);
  return res.ok;
}

export async function removeBlocklistFromProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await removeBlocklist(makeClient(cfg, log), id);
  return res.ok;
}

export async function getNativeTrackingForProfile(
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSNativeTracking[]> {
  const res = await getNativeTracking(makeClient(cfg, log));
  return res.ok ? res.data : [];
}

export async function addNativeTrackingToProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await addNativeTracking(makeClient(cfg, log), id);
  return res.ok;
}

export async function removeNativeTrackingFromProfile(
  id: string,
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const res = await removeNativeTracking(makeClient(cfg, log), id);
  return res.ok;
}
