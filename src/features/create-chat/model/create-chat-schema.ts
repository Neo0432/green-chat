import { z } from 'zod';

import { normalizePhone } from '@shared/lib';

/** FR-2.4. The output is the normalized phone: digits only, no `+`. */
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
