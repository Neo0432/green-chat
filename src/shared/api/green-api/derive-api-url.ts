export const deriveApiUrl = (idInstance: string) => `https://${idInstance.slice(0, 4)}.api.green-api.com`;

export type NormalizeApiUrlResult =
  { ok: true; apiUrl: string } | { ok: false; reason: 'invalid-url' | 'contains-instance-path' };

const INSTANCE_PATH_PATTERN = /\/waInstance/i;

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isAllowedUrl = (url: URL) =>
  url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');

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
