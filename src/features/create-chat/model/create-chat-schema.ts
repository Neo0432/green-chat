import { z } from 'zod';

import { normalizePhone } from '@shared/lib';

export const createChatSchema = z.object({
  phone: z.string().transform((value, context) => {
    const result = normalizePhone(value);

    if (result.ok) {
      return result.phone;
    }

    context.issues.push({
      code: 'custom',
      message: 'Enter the number in international format, digits only',
      input: value,
    });

    return z.NEVER;
  }),
});

export type CreateChatFormValues = z.input<typeof createChatSchema>;
export type CreateChatFormOutput = z.output<typeof createChatSchema>;
