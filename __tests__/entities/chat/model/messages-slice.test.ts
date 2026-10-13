import { createAppStore } from '@app/store';

import { messagesActions, messagesReducer, selectLastMessage, selectMessagesByChat } from '@entities/chat';

import { buildMessage } from '../fixtures';

describe('messages slice', () => {
  describe('reducer', () => {
    it('starts empty', () => {
      expect(messagesReducer(undefined, { type: 'init' })).toEqual({});
    });

    it('replaces the messages on hydration and empties them on reset', () => {
      const messages = { '10000001': [buildMessage()] };

      const hydrated = messagesReducer(undefined, messagesActions.messagesHydrated(messages));

      expect(hydrated).toEqual(messages);
      expect(messagesReducer(hydrated, messagesActions.messagesReset())).toEqual({});
    });
  });

  describe('selectors', () => {
    const first = buildMessage({ localId: 'a', text: 'First' });
    const last = buildMessage({ localId: 'b', text: 'Last' });

    const createState = () => {
      const store = createAppStore({});
      store.dispatch(messagesActions.messagesHydrated({ '10000001': [first, last] }));

      return store.getState();
    };

    it('returns the messages of a chat, and one stable empty list for a chat without any', () => {
      const state = createState();

      expect(selectMessagesByChat(state, '10000001')).toEqual([first, last]);
      expect(selectMessagesByChat(state, '404')).toEqual([]);
      expect(selectMessagesByChat(state, '404')).toBe(selectMessagesByChat(state, '405'));
    });

    it('returns the last message of a chat, if there is one', () => {
      const state = createState();

      expect(selectLastMessage(state, '10000001')).toEqual(last);
      expect(selectLastMessage(state, '404')).toBeUndefined();
    });
  });
});
