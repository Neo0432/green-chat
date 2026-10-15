import { ENV, GREEN_API_PROXY_PATH } from '@shared/config';

import type { Credentials } from './types';

interface BuildUrlParams {
  suffix?: string;
  query?: Record<string, string | number>;
}

export const buildUrl = (
  { idInstance, apiTokenInstance, apiUrl }: Credentials,
  method: string,
  { suffix, query }: BuildUrlParams = {},
) => {
  const base = ENV.greenApiProxyTarget === null ? apiUrl.replace(/\/+$/, '') : GREEN_API_PROXY_PATH;
  const path = [`waInstance${encodeURIComponent(idInstance)}`, method, encodeURIComponent(apiTokenInstance), suffix]
    .filter((segment) => segment !== undefined)
    .join('/');
  const search = query
    ? `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`
    : '';

  return `${base}/${path}${search}`;
};
