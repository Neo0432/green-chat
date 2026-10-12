import type { Credentials } from '@shared/api/green-api';

/** Made-up values: the token is long and unique, so a leak is easy to spot in an assertion. */
export const TEST_CREDENTIALS: Credentials = {
  idInstance: '4100000000',
  apiTokenInstance: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
  apiUrl: 'https://4100.api.green-api.com',
};

/** Written out in full on purpose: an independent copy of the URL template (requirements §6.1) to test against. */
export const buildTestUrl = (method: string, suffix = '') =>
  `${TEST_CREDENTIALS.apiUrl}/waInstance${TEST_CREDENTIALS.idInstance}/${method}/${TEST_CREDENTIALS.apiTokenInstance}${suffix}`;
