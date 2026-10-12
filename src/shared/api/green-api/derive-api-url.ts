/**
 * The host is named after the first 4 digits of the instance ID. Not documented, but host-routing probes
 * support it (requirements §6.1); instances of some older ranges have no such host, hence the API URL override.
 */
export const deriveApiUrl = (idInstance: string) => `https://${idInstance.slice(0, 4)}.api.green-api.com`;

export type NormalizeApiUrlResult =
  { ok: true; apiUrl: string } | { ok: false; reason: 'invalid-url' | 'contains-instance-path' };

const INSTANCE_PATH_PATTERN = /\/waInstance/i;

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    // Not an absolute URL: the caller reports it as invalid.
    return null;
  }
};

const isAllowedUrl = (url: URL) =>
  url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');

/** Accepts `https://` hosts and `http://localhost` (for a dev proxy). Query, hash and credentials are dropped. */
export const normalizeApiUrl = (input: string): NormalizeApiUrlResult => {
  const trimmed = input.trim();

  if (INSTANCE_PATH_PATTERN.test(trimmed)) {
    return { ok: false, reason: 'contains-instance-path' };
  }

  const url = parseUrl(trimmed);

  if (url === null || !isAllowedUrl(url)) {
    return { ok: false, reason: 'invalid-url' };
  }

  return { ok: true, apiUrl: `${url.origin}${url.pathname}`.replace(/\/+$/, '') };
};
