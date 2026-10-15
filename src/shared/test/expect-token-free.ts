import { isGreenApiError } from '@shared/api/green-api';

export const expectTokenFree = (error: unknown, token: string) => {
  expect(isGreenApiError(error)).toBe(true);

  const exposed = [
    String(error),
    error instanceof Error ? error.stack : undefined,
    isGreenApiError(error) ? error.serverMessage : undefined,
    JSON.stringify(error),
  ];

  for (const text of exposed) {
    expect(text ?? '').not.toContain(token);
  }
};
