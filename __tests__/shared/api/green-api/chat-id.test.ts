import { isPrivateChatId } from '@shared/api/green-api/chat-id';

describe('isPrivateChatId', () => {
  it.each(['10000000', '1', '79998887766'])('accepts %s', (value) => {
    expect(isPrivateChatId(value)).toBe(true);
  });

  it.each(['', '-1000000000001', '79998887766@c.us', '12ab', ' 123', '1.5', 123, null, undefined, {}])(
    'rejects %p',
    (value) => {
      expect(isPrivateChatId(value)).toBe(false);
    },
  );
});
