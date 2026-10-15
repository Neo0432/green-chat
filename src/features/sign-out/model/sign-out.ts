import type { Dispatch } from '@reduxjs/toolkit';

import { sessionActions } from '@entities/session';

import { removeAllAppKeys } from '@shared/lib';

export const signOut = () => (dispatch: Dispatch) => {
  removeAllAppKeys();
  dispatch(sessionActions.signedOut());
};
