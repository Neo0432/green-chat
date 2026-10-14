/** FR-3.3, counted as JS `string.length`. */
export const MAX_MESSAGE_LENGTH = 4096;

/** FR-3.2, FR-3.3: what would be sent for the text in the field, and whether it may be sent at all. */
export const validateMessageText = (value: string) => {
  const text = value.trim();
  const { length } = text;
  const isTooLong = length > MAX_MESSAGE_LENGTH;

  return { canSend: length > 0 && !isTooLong, text, isTooLong, length };
};
