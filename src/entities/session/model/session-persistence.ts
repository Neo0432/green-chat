import { isAnyOf } from '@reduxjs/toolkit';

import { startAppListening } from '@shared/lib/redux';

import { clearCredentials, loadCredentials, saveCredentials } from '../lib/credentials-storage';

import { initialSessionState, sessionActions, type SessionState } from './session-slice';

/** FR-1.7: the app starts straight in the main screen when credentials are stored. */
export const getInitialSessionState = (): SessionState => ({
  ...initialSessionState,
  credentials: loadCredentials(),
});

const saveSignedInCredentials = ({ payload }: ReturnType<typeof sessionActions.signedIn>) => {
  saveCredentials(payload);
};

const clearSignedOutCredentials = () => {
  clearCredentials();
};

const isSessionEnded = isAnyOf(sessionActions.signedOut, sessionActions.forcedSignOut);

/**
 * Safe to call more than once: the effects and the matcher are module-level, and RTK does not add a listener
 * whose matcher and effect are already registered.
 */
export const startSessionPersistence = () => {
  startAppListening({ actionCreator: sessionActions.signedIn, effect: saveSignedInCredentials });
  startAppListening({ matcher: isSessionEnded, effect: clearSignedOutCredentials });
};
