import { createAppStore } from '@app/store';

import { receiveReducer, selectIsConnecting, selectStatusError } from '@features/receive-messages';
import { receiveActions } from '@features/receive-messages/model/receive-slice';

import { sessionActions } from '@entities/session';

import { createMockCredentials } from '@shared/test/msw/green-api';

const CALM = { isConnecting: false, error: null };

describe('receive slice', () => {
  describe('reducer', () => {
    it('starts calm', () => {
      expect(receiveReducer(undefined, { type: '@@init' })).toEqual(CALM);
    });

    it('says "connecting" for a failed poll that has no message of its own, and drops an earlier message', () => {
      const failed = receiveReducer({ isConnecting: false, error: 'Blocked' }, receiveActions.pollFailed(null));

      expect(failed).toEqual({ isConnecting: true, error: null });
    });

    it('keeps the message of a failed poll instead of "connecting"', () => {
      const failed = receiveReducer({ isConnecting: true, error: null }, receiveActions.pollFailed('Blocked'));

      expect(failed).toEqual({ isConnecting: false, error: 'Blocked' });
    });

    it('is calm again once a poll works', () => {
      expect(receiveReducer({ isConnecting: true, error: 'Blocked' }, receiveActions.pollRecovered())).toEqual(CALM);
    });

    it('sets an error without touching the connection flag', () => {
      expect(receiveReducer(CALM, receiveActions.errorSet('Quota'))).toEqual({ isConnecting: false, error: 'Quota' });
    });

    it.each([
      ['a logout', sessionActions.signedOut()],
      ['a forced sign-out', sessionActions.forcedSignOut()],
    ])('is calm again after %s', (_name, action) => {
      expect(receiveReducer({ isConnecting: true, error: 'Blocked' }, action)).toEqual(CALM);
    });
  });

  describe('selectors', () => {
    const createStore = () =>
      createAppStore({
        session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
      });

    it('reads the connection flag', () => {
      const store = createStore();

      expect(selectIsConnecting(store.getState())).toBe(false);

      store.dispatch(receiveActions.pollFailed(null));

      expect(selectIsConnecting(store.getState())).toBe(true);
    });

    it('has no status error while the instance is authorized', () => {
      expect(selectStatusError(createStore().getState())).toBeNull();
    });

    it('names the state of the instance when it is not authorized (AC-18)', () => {
      const store = createStore();

      store.dispatch(sessionActions.instanceStateChanged('notAuthorized'));

      expect(selectStatusError(store.getState())).toMatch(/isn't linked to a Telegram account/);

      store.dispatch(sessionActions.instanceStateChanged('authorized'));

      expect(selectStatusError(store.getState())).toBeNull();
    });

    it('puts the problem of the polling before the state of the instance', () => {
      const store = createStore();
      store.dispatch(sessionActions.instanceStateChanged('blocked'));
      store.dispatch(receiveActions.errorSet('Quota'));

      expect(selectStatusError(store.getState())).toBe('Quota');
    });
  });
});
