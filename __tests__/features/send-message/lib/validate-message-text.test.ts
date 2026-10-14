import { validateMessageText } from '@features/send-message/lib/validate-message-text';

describe('validateMessageText', () => {
  it('can send a text, trimmed of the whitespace around it (FR-3.2)', () => {
    expect(validateMessageText('  Hello \n')).toEqual({ canSend: true, text: 'Hello', isTooLong: false, length: 5 });
  });

  it('keeps the newlines inside the text', () => {
    expect(validateMessageText('one\n\ntwo').text).toBe('one\n\ntwo');
  });

  it.each(['', '   ', '\n \t\n'])('cannot send %j, which is empty', (value) => {
    expect(validateMessageText(value)).toMatchObject({ canSend: false, text: '', isTooLong: false, length: 0 });
  });

  it('allows exactly 4096 characters (FR-3.3)', () => {
    expect(validateMessageText('x'.repeat(4096))).toMatchObject({ canSend: true, isTooLong: false, length: 4096 });
  });

  it('blocks 4097 characters, and reports their number', () => {
    expect(validateMessageText('x'.repeat(4097))).toMatchObject({ canSend: false, isTooLong: true, length: 4097 });
  });

  it('counts the trimmed text, so padding does not make a text too long', () => {
    expect(validateMessageText(` ${'x'.repeat(4096)} `)).toMatchObject({ canSend: true, length: 4096 });
  });
});
