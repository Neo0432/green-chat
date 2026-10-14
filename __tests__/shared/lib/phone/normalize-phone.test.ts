import { normalizePhone } from '@shared/lib/phone';

const NBSP = String.fromCharCode(160);

describe('normalizePhone', () => {
  it.each([
    ['+7 (900) 123-45-67', '79001234567'],
    ['79001234567', '79001234567'],
    ['  +79001234567  ', '79001234567'],
    ['7.900.123.45.67', '79001234567'],
    ['+ 7 900 123 45 67', '79001234567'],
    ['1234567', '1234567'],
    ['123456789012345', '123456789012345'],
  ])('turns %p into %p', (input, phone) => {
    expect(normalizePhone(input)).toEqual({ ok: true, phone });
  });

  it('removes non-breaking spaces', () => {
    expect(normalizePhone(`+7${NBSP}900${NBSP}123-45-67`)).toEqual({ ok: true, phone: '79001234567' });
  });

  it.each([
    ['an empty string', ''],
    ['spaces only', '   '],
    ['letters', '12ab'],
    ['letters inside a number', '7900abc4567'],
    ['a leading zero', '0791234567'],
    ['6 digits', '123456'],
    ['16 digits', '1234567890123456'],
    ['a second plus', '++79001234567'],
    ['a plus in the middle', '7900+1234567'],
    ['a trailing plus', '79001234567+'],
  ])('rejects %s', (_name, input) => {
    expect(normalizePhone(input)).toEqual({ ok: false });
  });
});
