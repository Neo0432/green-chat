/** `\s` covers spaces, tabs and the non-breaking space. */
const SEPARATORS = /[\s\-().]/g;
const LEADING_PLUS = /^\+/;
/** E.164: 7 to 15 digits, no leading zero. */
const PHONE_PATTERN = /^[1-9]\d{6,14}$/;

export type NormalizePhoneResult = { ok: true; phone: string } | { ok: false };

/** FR-2.4. No country-specific rewriting: a leading `8` stays an `8`. */
export const normalizePhone = (input: string): NormalizePhoneResult => {
  const phone = input.trim().replace(SEPARATORS, '').replace(LEADING_PLUS, '');

  return PHONE_PATTERN.test(phone) ? { ok: true, phone } : { ok: false };
};
