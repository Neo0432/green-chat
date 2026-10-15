export const isSendShortcut = ({
  key,
  shiftKey,
  isComposing,
}: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>) => key === 'Enter' && !shiftKey && !isComposing;
