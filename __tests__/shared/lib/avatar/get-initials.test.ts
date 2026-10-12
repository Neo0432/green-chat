import { getInitials } from '@shared/lib/avatar';

describe('getInitials', () => {
  it.each([
    ['Alice Smith', 'AS'],
    ['alice smith', 'AS'],
    ['Alice', 'A'],
    ['Mary Jane Watson', 'MJ'],
    ['Éva Ölund', 'ÉÖ'],
    ['Анна Каренина', 'АК'],
  ])('takes the first letter of the first two words of "%s"', (title, expected) => {
    expect(getInitials(title)).toBe(expected);
  });

  it.each([
    ['+79001234567', '7'],
    ['42 Club', '4C'],
  ])('takes the first digit of a numeric first word in "%s"', (title, expected) => {
    expect(getInitials(title)).toBe(expected);
  });

  it('treats the parts of a spaced phone number as separate words', () => {
    expect(getInitials('+7 900 123')).toBe('79');
  });

  it('ignores extra whitespace around and between words', () => {
    expect(getInitials('   alice    smith  ')).toBe('AS');
    expect(getInitials('alice\t\nsmith')).toBe('AS');
  });

  it('skips leading punctuation and emoji inside a word', () => {
    expect(getInitials('(Alice) -Smith')).toBe('AS');
    expect(getInitials('🔥Alice')).toBe('A');
  });

  it('skips words without letters or digits', () => {
    expect(getInitials('🔥 Fire')).toBe('F');
    expect(getInitials('Alice 🔥 Smith')).toBe('AS');
    expect(getInitials('- Alice & Smith')).toBe('AS');
  });

  it.each(['', '   ', '🔥', '---', '🔥 ✨'])('returns "?" for the title "%s" without letters or digits', (title) => {
    expect(getInitials(title)).toBe('?');
  });
});
