import dayjs from 'dayjs';

const WEEKDAY_DAYS = 6;

/** FR-2.11: today `HH:mm`, within the last 6 days the short weekday, older `DD.MM.YY`. */
export const formatChatListTime = (timestamp: number, now = Date.now()) => {
  const time = dayjs(timestamp);
  const daysAgo = dayjs(now).startOf('day').diff(time.startOf('day'), 'day');

  if (daysAgo <= 0) {
    return time.format('HH:mm');
  }

  return time.format(daysAgo <= WEEKDAY_DAYS ? 'ddd' : 'DD.MM.YY');
};
