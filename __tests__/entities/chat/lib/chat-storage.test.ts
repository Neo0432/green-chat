import { loadChatData, saveChatData } from '@entities/chat';

import { buildChat, buildMessage } from '../fixtures';

const ID_INSTANCE = '4100000001';
const KEY = `green-chat:v1:data:${ID_INSTANCE}`;

const DATA = {
  chats: [buildChat({ chatId: '10000001', phone: '79001234567' }), buildChat({ chatId: '10000002' })],
  messages: {
    '10000001': [buildMessage({ localId: 'a' }), buildMessage({ localId: 'b', direction: 'in', status: null })],
  },
  activeChatId: '10000002',
};

const store = (value: unknown) => {
  window.localStorage.setItem(KEY, JSON.stringify(value));
};

describe('chat storage', () => {
  it('loads what it saved, under the key of the instance (FR-5.1)', () => {
    saveChatData(ID_INSTANCE, DATA);

    expect(JSON.parse(window.localStorage.getItem(KEY) ?? 'null')).toMatchObject({ version: 1 });
    expect(loadChatData(ID_INSTANCE)).toEqual(DATA);
    expect(loadChatData('4100000002')).toBeNull();
  });

  it('loads nothing when the data is corrupt', () => {
    window.localStorage.setItem(KEY, '{not json');

    expect(loadChatData(ID_INSTANCE)).toBeNull();
  });

  it.each([
    ['of another version', { ...DATA, version: 2 }],
    ['without a version', DATA],
    ['with an invalid chat', { ...DATA, version: 1, chats: [{ chatId: 5 }] }],
    ['with an invalid message', { ...DATA, version: 1, messages: { '10000001': [{ text: 'Hi' }] } }],
    [
      'with a message of an unknown status',
      { ...DATA, version: 1, messages: { '10000001': [{ ...buildMessage(), status: 'lost' }] } },
    ],
    ['that is not an object', 'chats'],
  ])('loads nothing when the data is %s (FR-5.3)', (_name, value) => {
    store(value);

    expect(loadChatData(ID_INSTANCE)).toBeNull();
  });

  it('turns a pending message into a failed one, "Not sent" (FR-5.4)', () => {
    const pending = buildMessage({ localId: 'p', status: 'pending' });
    saveChatData(ID_INSTANCE, { ...DATA, messages: { '10000001': [pending] } });

    expect(loadChatData(ID_INSTANCE)?.messages['10000001']).toEqual([
      { ...pending, status: 'failed', error: 'Not sent' },
    ]);
  });

  it('forgets an active chat that no longer exists', () => {
    saveChatData(ID_INSTANCE, { ...DATA, activeChatId: '404' });

    expect(loadChatData(ID_INSTANCE)?.activeChatId).toBeNull();
  });

  it('saves only the last 500 messages of each chat (FR-5.5)', () => {
    const messages = Array.from({ length: 502 }, (_, index) => buildMessage({ localId: `m${index}` }));
    saveChatData(ID_INSTANCE, { ...DATA, messages: { '10000001': messages, '10000002': messages.slice(0, 3) } });

    const loaded = loadChatData(ID_INSTANCE);

    expect(loaded?.messages['10000001']).toHaveLength(500);
    expect(loaded?.messages['10000001']?.[0]?.localId).toBe('m2');
    expect(loaded?.messages['10000001']?.at(-1)?.localId).toBe('m501');
    expect(loaded?.messages['10000002']).toHaveLength(3);
  });

  it('does not throw when the storage is full (FR-5.6)', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(() => saveChatData(ID_INSTANCE, DATA)).not.toThrow();
  });
});
