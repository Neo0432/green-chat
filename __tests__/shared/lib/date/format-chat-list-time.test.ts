import { formatChatListTime } from '@shared/lib/date';

/** Local time, so the expectations hold in every timezone. */
const at = (year: number, month: number, day: number, hours = 12, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes).getTime();

describe('formatChatListTime', () => {
  const now = at(2026, 10, 14, 15, 30); // a Wednesday

  it('shows the time for today, including just after midnight', () => {
    expect(formatChatListTime(at(2026, 10, 14, 9, 5), now)).toBe('09:05');
    expect(formatChatListTime(at(2026, 10, 14, 0, 1), now)).toBe('00:01');
  });

  it('shows the weekday for yesterday and up to 6 days ago', () => {
    expect(formatChatListTime(at(2026, 10, 13, 23, 59), now)).toBe('Tue');
    expect(formatChatListTime(at(2026, 10, 8, 0, 0), now)).toBe('Thu');
  });

  it('shows the date from 7 days ago on', () => {
    expect(formatChatListTime(at(2026, 10, 7), now)).toBe('07.10.26');
    expect(formatChatListTime(at(2025, 3, 2), now)).toBe('02.03.25');
  });

  it('counts calendar days across the year boundary', () => {
    const newYear = at(2027, 1, 2, 10, 0);

    expect(formatChatListTime(at(2026, 12, 31, 23, 0), newYear)).toBe('Thu');
    expect(formatChatListTime(at(2026, 12, 26, 23, 0), newYear)).toBe('26.12.26');
  });

  it('shows the time for a timestamp slightly in the future (clock skew)', () => {
    expect(formatChatListTime(at(2026, 10, 14, 15, 31), now)).toBe('15:31');
  });
});
