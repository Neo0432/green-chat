import { AVATAR_COLORS, getAvatarColor } from '@shared/lib/avatar';

describe('getAvatarColor', () => {
  it('lists the seven avatar colors in the spec order', () => {
    expect(AVATAR_COLORS).toEqual(['red', 'orange', 'violet', 'green', 'cyan', 'blue', 'pink']);
  });

  it.each([
    ['10000000', 'red'],
    ['10000001', 'orange'],
    ['10000002', 'violet'],
    ['10000003', 'green'],
    ['10000004', 'cyan'],
    ['10000005', 'blue'],
    ['10000006', 'pink'],
    ['10000007', 'red'],
  ])('maps the last six digits of the numeric chatId %s to %s', (chatId, expected) => {
    expect(getAvatarColor(chatId)).toBe(expected);
  });

  it('ignores the digits before the last six', () => {
    expect(getAvatarColor('9999999000003')).toBe(getAvatarColor('000003'));
  });

  it('keeps the index non-negative for negative ids', () => {
    expect(getAvatarColor('-1000000000001')).toBe('orange');
    expect(getAvatarColor('-12')).toBe('blue');
  });

  it('returns the same color for the same chatId', () => {
    expect(getAvatarColor('79001234567@c.us')).toBe(getAvatarColor('79001234567@c.us'));
  });

  it('hashes a non-numeric chatId to a valid color', () => {
    expect(AVATAR_COLORS).toContain(getAvatarColor('79001234567@c.us'));
    expect(AVATAR_COLORS).toContain(getAvatarColor('not-a-number'));
    expect(AVATAR_COLORS).toContain(getAvatarColor(''));
  });

  it('spreads non-numeric chatIds over several colors', () => {
    const colors = new Set(Array.from({ length: 50 }, (_, index) => getAvatarColor(`user-${index}`)));

    expect(colors.size).toBeGreaterThan(3);
  });

  it('always returns one of the colors for any numeric chatId', () => {
    for (let id = 10_000_000; id < 10_000_100; id += 1) {
      expect(AVATAR_COLORS).toContain(getAvatarColor(String(id)));
    }
  });
});
