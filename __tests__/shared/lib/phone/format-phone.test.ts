import { formatPhone } from '@shared/lib/phone';

describe('formatPhone', () => {
  it('puts a plus in front of the digits', () => {
    expect(formatPhone('79001234567')).toBe('+79001234567');
  });
});
