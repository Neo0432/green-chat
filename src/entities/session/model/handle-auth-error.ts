import type { Dispatch } from '@reduxjs/toolkit';

import { isAuthError } from '@shared/api/green-api';

import { sessionActions } from './session-slice';

export const handleAuthError = (dispatch: Dispatch, error: unknown) => {
  if (!isAuthError(error)) {
    return false;
  }

  dispatch(sessionActions.forcedSignOut());

  return true;
};
