export const BUTTON_VARIANTS = ['primary', 'text', 'text-secondary', 'text-danger'] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
