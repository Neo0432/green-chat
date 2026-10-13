import type { Dispatch } from '@reduxjs/toolkit';

import { sessionActions } from '@entities/session';

import { removeAllAppKeys } from '@shared/lib';

/** FR-1.8: the storage is wiped first, so whatever reacts to `signedOut` finds it already empty. */
export const signOut = () => (dispatch: Dispatch) => {
  removeAllAppKeys();
  dispatch(sessionActions.signedOut());
};
