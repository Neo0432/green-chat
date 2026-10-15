import dayjs from 'dayjs';

export const formatDateSeparator = (timestamp: number, now = Date.now()) => {
  const date = dayjs(timestamp);
  const today = dayjs(now);

  if (date.isSame(today, 'day')) {
    return 'Today';
  }

  if (date.isSame(today.subtract(1, 'day'), 'day')) {
    return 'Yesterday';
  }

  return date.format(date.isSame(today, 'year') ? 'MMMM D' : 'MMMM D, YYYY');
};
