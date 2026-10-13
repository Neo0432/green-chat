import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { getInitialSessionState, sessionReducer, startSessionPersistence } from '@entities/session';

import { listenerMiddleware } from '@shared/lib/redux';

const rootReducer = combineReducers({ session: sessionReducer });

type PreloadedState = Partial<ReturnType<typeof rootReducer>>;

/** Without an argument the session is restored from the storage (FR-1.7). */
export const createAppStore = (preloadedState: PreloadedState = { session: getInitialSessionState() }) => {
  startSessionPersistence();

  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
};

export type AppStore = ReturnType<typeof createAppStore>;
