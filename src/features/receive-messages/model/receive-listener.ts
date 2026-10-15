import { createAction, isAnyOf, type ListenerEffectAPI, type UnknownAction } from '@reduxjs/toolkit';

import { handleAuthError, selectCredentials, sessionActions } from '@entities/session';

import { type Credentials, deleteNotification, receiveNotification } from '@shared/api/green-api';
import { startAppListening } from '@shared/lib/redux';

import { getReceiveErrorMessage } from '../lib/get-receive-error-message';

import { processNotification } from './process-notification';
import { receiveActions } from './receive-slice';
import { type ReceiveLoopDeps, runReceiveLoop } from './run-receive-loop';

type EffectApi = ListenerEffectAPI<RootState, AppDispatch>;

const CONNECTING_AFTER_FAILURES = 2;

const appStarted = createAction('receive/appStarted');

const isSessionChanged = isAnyOf(
  appStarted,
  sessionActions.signedIn,
  sessionActions.signedOut,
  sessionActions.forcedSignOut,
);

const createLoopDeps = (credentials: Credentials, api: EffectApi): ReceiveLoopDeps => ({
  receive: (signal) => receiveNotification(credentials, {}, { signal }),
  remove: (receiptId, signal) => deleteNotification(credentials, { receiptId }, { signal }),
  onNotification: (body) => {
    processNotification(api, credentials.idInstance, body);
  },
  onFailure: (error, failureCount) => {
    const message = getReceiveErrorMessage(error);

    if (message !== null || failureCount >= CONNECTING_AFTER_FAILURES) {
      api.dispatch(receiveActions.pollFailed(message));
    }
  },
  onRecovered: () => {
    api.dispatch(receiveActions.pollRecovered());
  },
  handleAuthError: (error) => handleAuthError(api.dispatch, error),
});

const pollWhileSignedIn = async (_action: UnknownAction, api: EffectApi) => {
  api.cancelActiveListeners();

  const credentials = selectCredentials(api.getState());

  if (credentials !== null) {
    await runReceiveLoop(createLoopDeps(credentials, api), api.signal);
  }
};

export const startReceiveListener = (store: { dispatch: AppDispatch }) => {
  startAppListening({ matcher: isSessionChanged, effect: pollWhileSignedIn });
  store.dispatch(appStarted());
};
