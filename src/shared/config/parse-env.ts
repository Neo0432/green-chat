import { z } from 'zod';

const envSchema = z.object({
  VITE_ENABLE_API_MOCKS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const parseEnv = (rawEnv: unknown) => {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }

  return { enableApiMocks: parsed.data.VITE_ENABLE_API_MOCKS };
};
