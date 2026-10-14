import { isSendShortcut } from '@features/send-message/lib/is-send-shortcut';

const press = (key: string, { shiftKey = false, isComposing = false } = {}) =>
  isSendShortcut({ key, shiftKey, isComposing });

describe('isSendShortcut', () => {
  it('sends on Enter', () => {
    expect(press('Enter')).toBe(true);
  });

  it('does not send on Shift+Enter, which is a new line (FR-3.4)', () => {
    expect(press('Enter', { shiftKey: true })).toBe(false);
  });

  it('does not send on the Enter that confirms an IME composition', () => {
    expect(press('Enter', { isComposing: true })).toBe(false);
  });

  it('does not send on any other key', () => {
    expect(press('a')).toBe(false);
    expect(press(' ')).toBe(false);
  });
});
