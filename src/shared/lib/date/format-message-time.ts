import dayjs from 'dayjs';

/** §7.9: the time inside a bubble. */
export const formatMessageTime = (timestamp: number) => dayjs(timestamp).format('HH:mm');

/** §7.9: the `title` of the time, the full date and time. */
export const formatMessageDateTime = (timestamp: number) => dayjs(timestamp).format('MMMM D, YYYY [at] HH:mm');
