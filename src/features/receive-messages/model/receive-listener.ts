import { createAction, isAnyOf, type ListenerEffectAPI, type UnknownAction } from '@reduxjs/toolkit';

import { handleAuthError, selectCredentials, sessionActions } from '@entities/session';

import { type Credentials, deleteNotification, receiveNotification } from '@shared/api/green-api';
import { startAppListening } from '@shared/lib/redux';

import { getReceiveErrorMessage } from '../lib/get-receive-error-message';

import { processNotification } from './process-notification';
import { receiveActions } from './receive-slice';
import { type ReceiveLoopDeps, runReceiveLoop } from './run-receive-loop';

type EffectApi = ListenerEffectAPI<RootState, AppDispatch>;

/** FR-4.3: a single failed poll is not worth a strip. */
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

    // A blocked queue or an exhausted quota is shown at once; a connection problem only once it persists.
    if (message !== null || failureCount >= CONNECTING_AFTER_FAILURES) {
      api.dispatch(receiveActions.pollFailed(message));
    }
  },
  onRecovered: () => {
    api.dispatch(receiveActions.pollRecovered());
  },
  handleAuthError: (error) => handleAuthError(api.dispatch, error),
});

/**
 * FR-4.1: polls for as long as the session lasts. The next session action cancels the run before it, so there is
 * never more than one loop, and a sign-out ends it.
 */
const pollWhileSignedIn = async (_action: UnknownAction, api: EffectApi) => {
  api.cancelActiveListeners();

  const credentials = selectCredentials(api.getState());

  if (credentials !== null) {
    await runReceiveLoop(createLoopDeps(credentials, api), api.signal);
  }
};

/** Safe to call more than once: the effect is module-level, and RTK does not add a listener it already has. */
export const startReceiveListener = (store: { dispatch: AppDispatch }) => {
  startAppListening({ matcher: isSessionChanged, effect: pollWhileSignedIn });
  // FR-1.7: a session restored from the storage has no `signedIn` to start it.
  store.dispatch(appStarted());
};
