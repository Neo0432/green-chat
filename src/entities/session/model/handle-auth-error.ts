import type { Dispatch } from '@reduxjs/toolkit';

import { isAuthError } from '@shared/api/green-api';

import { sessionActions } from './session-slice';

/**
 * The only way a thunk or the receive loop signs the user out (FR-1.9). Returns whether the error was an auth
 * error, so the caller knows it has been handled.
 */
export const handleAuthError = (dispatch: Dispatch, error: unknown) => {
  if (!isAuthError(error)) {
    return false;
  }

  dispatch(sessionActions.forcedSignOut());

  return true;
};
