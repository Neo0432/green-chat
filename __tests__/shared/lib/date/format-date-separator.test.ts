import { formatDateSeparator } from '@shared/lib/date';

const atLocalTime = (year: number, month: number, day: number, hours = 12, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes).getTime();

describe('formatDateSeparator', () => {
  const now = atLocalTime(2026, 10, 14, 15, 30);

  it('says "Today" for any time of the current day', () => {
    expect(formatDateSeparator(atLocalTime(2026, 10, 14, 0, 1), now)).toBe('Today');
    expect(formatDateSeparator(atLocalTime(2026, 10, 14, 23, 59), now)).toBe('Today');
  });

  it('says "Yesterday" for the day before, even just before midnight', () => {
    expect(formatDateSeparator(atLocalTime(2026, 10, 13, 23, 59), now)).toBe('Yesterday');
    expect(formatDateSeparator(atLocalTime(2026, 10, 13, 0, 0), now)).toBe('Yesterday');
  });

  it('shows the month and the day for another day of this year', () => {
    expect(formatDateSeparator(atLocalTime(2026, 10, 11), now)).toBe('October 11');
    expect(formatDateSeparator(atLocalTime(2026, 1, 2), now)).toBe('January 2');
  });

  it('adds the year for another year, also right across the new year', () => {
    expect(formatDateSeparator(atLocalTime(2025, 10, 11), now)).toBe('October 11, 2025');
    expect(formatDateSeparator(atLocalTime(2025, 12, 31, 23, 0), atLocalTime(2026, 1, 2))).toBe('December 31, 2025');
  });

  it('says "Yesterday" across the new year', () => {
    expect(formatDateSeparator(atLocalTime(2025, 12, 31, 23, 0), atLocalTime(2026, 1, 1, 1, 0))).toBe('Yesterday');
  });
});
