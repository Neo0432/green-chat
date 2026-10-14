import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { receiveReducer } from '@features/receive-messages';

import { chatsReducer, messagesReducer } from '@entities/chat';
import { getInitialSessionState, sessionReducer, startSessionPersistence } from '@entities/session';

import { listenerMiddleware } from '@shared/lib/redux';

import { startChatPersistence } from './chat-persistence';

const rootReducer = combineReducers({
  session: sessionReducer,
  chats: chatsReducer,
  messages: messagesReducer,
  receive: receiveReducer,
});

type PreloadedState = Partial<ReturnType<typeof rootReducer>>;

/** Without an argument the session is restored from the storage (FR-1.7), and with it the chats. */
export const createAppStore = (preloadedState: PreloadedState = { session: getInitialSessionState() }) => {
  startSessionPersistence();

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });

  startChatPersistence(store);

  return store;
};

export type AppStore = ReturnType<typeof createAppStore>;
