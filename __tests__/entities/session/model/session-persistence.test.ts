import { configureStore } from '@reduxjs/toolkit';

import { getInitialSessionState, sessionActions, sessionReducer, startSessionPersistence } from '@entities/session';
import { loadCredentials, saveCredentials } from '@entities/session/lib/credentials-storage';

import { listenerMiddleware } from '@shared/lib/redux';
import { createMockCredentials } from '@shared/test/msw/green-api';

const CREDENTIALS = createMockCredentials();
const DATA_KEY = 'green-chat:v1:data:4100000001';

const createStore = () => {
  startSessionPersistence();

  return configureStore({
    reducer: { session: sessionReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
};

afterEach(() => {
  listenerMiddleware.clearListeners();
});

describe('session persistence', () => {
  describe('getInitialSessionState', () => {
    it('starts signed out when nothing is stored', () => {
      expect(getInitialSessionState()).toEqual({ credentials: null, instanceState: null, forcedSignOut: null });
    });

    it('starts signed in with the stored credentials (FR-1.7)', () => {
      saveCredentials(CREDENTIALS);

      expect(getInitialSessionState()).toEqual({ credentials: CREDENTIALS, instanceState: null, forcedSignOut: null });
    });
  });

  describe('listener', () => {
    it('saves the credentials on sign-in', () => {
      createStore().dispatch(sessionActions.signedIn(CREDENTIALS));

      expect(loadCredentials()).toEqual(CREDENTIALS);
    });

    it('removes the credentials on sign-out', () => {
      const store = createStore();
      store.dispatch(sessionActions.signedIn(CREDENTIALS));

      store.dispatch(sessionActions.signedOut());

      expect(loadCredentials()).toBeNull();
    });

    it('removes the credentials, but not the chat history, on a forced sign-out (FR-1.9)', () => {
      const store = createStore();
      store.dispatch(sessionActions.signedIn(CREDENTIALS));
      window.localStorage.setItem(DATA_KEY, '{}');

      store.dispatch(sessionActions.forcedSignOut());

      expect(Object.keys(window.localStorage)).toEqual([DATA_KEY]);
    });

    it('keeps the session in memory when the storage is full', () => {
      const store = createStore();
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      store.dispatch(sessionActions.signedIn(CREDENTIALS));

      expect(store.getState().session.credentials).toEqual(CREDENTIALS);
    });
  });
});
