/** FR-3.4: Enter sends, Shift+Enter is a new line, and Enter that confirms an IME composition is not a send. */
export const isSendShortcut = ({
  key,
  shiftKey,
  isComposing,
}: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>) => key === 'Enter' && !shiftKey && !isComposing;
