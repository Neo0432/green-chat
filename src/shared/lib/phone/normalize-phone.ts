const SEPARATORS = /[\s\-().]/g;
const LEADING_PLUS = /^\+/;
const E164_PATTERN = /^[1-9]\d{6,14}$/;

export type NormalizePhoneResult = { ok: true; phone: string } | { ok: false };

export const normalizePhone = (input: string): NormalizePhoneResult => {
  const phone = input.trim().replace(SEPARATORS, '').replace(LEADING_PLUS, '');

  return E164_PATTERN.test(phone) ? { ok: true, phone } : { ok: false };
};
