export const MAX_MESSAGE_LENGTH = 4096;

export const validateMessageText = (value: string) => {
  const text = value.trim();
  const { length } = text;
  const isTooLong = length > MAX_MESSAGE_LENGTH;

  return { canSend: length > 0 && !isTooLong, text, isTooLong, length };
};
