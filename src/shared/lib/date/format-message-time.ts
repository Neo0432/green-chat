import dayjs from 'dayjs';

export const formatMessageTime = (timestamp: number) => dayjs(timestamp).format('HH:mm');

export const formatMessageDateTime = (timestamp: number) => dayjs(timestamp).format('MMMM D, YYYY [at] HH:mm');
