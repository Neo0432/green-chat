export const ICON_BUTTON_VARIANTS = ['ghost', 'fab', 'raised'] as const;

export type IconButtonVariant = (typeof ICON_BUTTON_VARIANTS)[number];
