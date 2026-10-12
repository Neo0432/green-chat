export const SPINNER_SIZES = [16, 20, 24] as const;

export type SpinnerSize = (typeof SPINNER_SIZES)[number];
