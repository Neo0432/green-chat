import { formatMessageDateTime, formatMessageTime } from '@shared/lib/date';

/** Local time, so the expectations hold in every timezone. */
const at = (year: number, month: number, day: number, hours = 12, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes).getTime();

describe('formatMessageTime', () => {
  it('shows the hours and minutes with a leading zero, on a 24-hour clock', () => {
    expect(formatMessageTime(at(2026, 10, 14, 9, 5))).toBe('09:05');
    expect(formatMessageTime(at(2026, 10, 14, 0, 0))).toBe('00:00');
    expect(formatMessageTime(at(2026, 10, 14, 23, 59))).toBe('23:59');
  });
});

describe('formatMessageDateTime', () => {
  it('shows the full date and the time', () => {
    expect(formatMessageDateTime(at(2026, 10, 14, 15, 30))).toBe('October 14, 2026 at 15:30');
    expect(formatMessageDateTime(at(2025, 1, 2, 7, 4))).toBe('January 2, 2025 at 07:04');
  });
});
