import { NextDNSErrorCode, NextDNSResponse } from '@focusgate/types';

export const BASE_URL = 'https://api.nextdns.io';
export const MAX_RETRIES = 3;
export const RETRY_BASE_MS = 1000;

export async function readJsonIfPresent(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function mapStatusToErrorCode(status: number): NextDNSErrorCode {
  if (status === 401 || status === 403) {
    return 'auth_error';
  }
  if (status === 429) {
    return 'rate_limit';
  }
  if (status === 400) {
    return 'validation_error';
  }
  if (status === 404) {
    return 'profile_mismatch';
  }
  if (status >= 500) {
    return 'server_error';
  }
  return 'unknown';
}

export async function wrapResponse<T>(
  res: Response,
  transform?: (data: any) => T,
): Promise<NextDNSResponse<T>> {
  if (res.ok) {
    const json = await readJsonIfPresent(res);
    const data = json?.data ?? json;
    return {
      ok: true,
      data: transform ? transform(data) : (data as T),
    };
  }

  const errorData = await readJsonIfPresent(res);
  const code = mapStatusToErrorCode(res.status);

  const message =
    errorData?.errors?.[0]?.detail ||
    errorData?.error ||
    errorData?.message ||
    res.statusText;

  return {
    ok: false,
    error: {
      code,
      message,
      status: res.status,
      details: errorData,
    },
  };
}
