import { z } from 'zod';

const envSchema = z.object({
  VITE_ENABLE_API_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // An empty value in .env means "not set".
  VITE_GREEN_API_PROXY_TARGET: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url({ protocol: /^https?$/ }).optional(),
  ),
});

export const parseEnv = (rawEnv: unknown) => {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }

  return {
    enableApiMocks: parsed.data.VITE_ENABLE_API_MOCKS,
    greenApiProxyTarget: parsed.data.VITE_GREEN_API_PROXY_TARGET ?? null,
  };
};
