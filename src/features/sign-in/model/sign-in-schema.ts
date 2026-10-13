import { z } from 'zod';

import { type Credentials, deriveApiUrl, normalizeApiUrl, type NormalizeApiUrlResult } from '@shared/api/green-api';

type ApiUrlFailure = Extract<NormalizeApiUrlResult, { ok: false }>['reason'];

const API_URL_ERRORS: Record<ApiUrlFailure, string> = {
  'invalid-url': 'Enter a valid https:// URL',
  'contains-instance-path': 'Enter only the host, e.g. https://4100.api.green-api.com',
};

const idInstanceSchema = z
  .string()
  .trim()
  .min(1, 'Enter the Instance ID')
  .regex(/^\d{4,20}$/, 'Digits only, 4–20 characters');

const apiTokenInstanceSchema = z
  .string()
  .trim()
  .min(1, 'Enter the API token')
  .regex(/^\S+$/, "The token can't contain spaces");

/** `null` stands for "not set": the URL is derived from the instance ID once that is known to be valid. */
const apiUrlSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    if (value === '') {
      return null;
    }

    const result = normalizeApiUrl(value);

    if (result.ok) {
      return result.apiUrl;
    }

    context.issues.push({ code: 'custom', message: API_URL_ERRORS[result.reason], input: value });

    return z.NEVER;
  });

/** FR-1.2. Every field is validated on its own, so all the errors show at once. */
export const signInSchema = z
  .object({
    idInstance: idInstanceSchema,
    apiTokenInstance: apiTokenInstanceSchema,
    apiUrl: apiUrlSchema,
  })
  .transform(({ idInstance, apiTokenInstance, apiUrl }): Credentials => ({
    idInstance,
    apiTokenInstance,
    apiUrl: apiUrl ?? deriveApiUrl(idInstance),
  }));

export type SignInFormValues = z.input<typeof signInSchema>;
