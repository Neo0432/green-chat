import { isAnyOf } from '@reduxjs/toolkit';

import { startAppListening } from '@shared/lib/redux';

import { clearCredentials, loadCredentials, saveCredentials } from '../lib/credentials-storage';

import { initialSessionState, sessionActions, type SessionState } from './session-slice';

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

export const startSessionPersistence = () => {
  startAppListening({ actionCreator: sessionActions.signedIn, effect: saveSignedInCredentials });
  startAppListening({ matcher: isSessionEnded, effect: clearSignedOutCredentials });
};
