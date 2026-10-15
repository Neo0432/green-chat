import { buildMessageItems } from '@widgets/chat-window/lib/build-message-items';

import { buildMessage } from '../../../entities/chat/fixtures';

const atLocalTime = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).getTime();

describe('buildMessageItems', () => {
  it('has no items for no messages', () => {
    expect(buildMessageItems([])).toEqual([]);
  });

  it('puts a date separator before the first message', () => {
    const message = buildMessage({ localId: 'a', timestamp: atLocalTime(14, 9) });

    expect(buildMessageItems([message])).toEqual([
      { type: 'date', key: 'date-a', timestamp: message.timestamp },
      { type: 'message', key: 'a', message },
    ]);
  });

  it('adds one separator per calendar day, also across midnight', () => {
    const messages = [
      buildMessage({ localId: 'a', timestamp: atLocalTime(13, 10) }),
      buildMessage({ localId: 'b', timestamp: atLocalTime(13, 23, 59) }),
      buildMessage({ localId: 'c', timestamp: atLocalTime(14, 0, 1) }),
      buildMessage({ localId: 'd', timestamp: atLocalTime(14, 18) }),
      buildMessage({ localId: 'e', timestamp: atLocalTime(16, 8) }),
    ];

    const items = buildMessageItems(messages);

    expect(items.map(({ type, key }) => `${type}:${key}`)).toEqual([
      'date:date-a',
      'message:a',
      'message:b',
      'date:date-c',
      'message:c',
      'message:d',
      'date:date-e',
      'message:e',
    ]);
  });
});
