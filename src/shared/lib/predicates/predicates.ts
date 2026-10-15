export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export const isNonBlankString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

export const assertNever = (value: never, message = 'Unhandled case'): never => {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
};
