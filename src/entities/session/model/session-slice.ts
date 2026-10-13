import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Credentials, StateInstance } from '@shared/api/green-api';

export interface SessionState {
  credentials: Credentials | null;
  /** The last known state of the instance; `null` while it is unknown or nobody is signed in. */
  instanceState: StateInstance | null;
  /** Set when GREEN-API rejected the credentials mid-session: the login screen shows why. */
  forcedSignOut: { idInstance: string } | null;
}

export const initialSessionState: SessionState = {
  credentials: null,
  instanceState: null,
  forcedSignOut: null,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    signedIn: (state, action: PayloadAction<Credentials>) => {
      state.credentials = action.payload;
      // Signing in requires an authorized instance.
      state.instanceState = 'authorized';
      state.forcedSignOut = null;
    },
    signedOut: () => initialSessionState,
    forcedSignOut: (state) => {
      // A stale request of a finished session must not turn a logout into a forced sign-out.
      if (state.credentials !== null) {
        state.forcedSignOut = { idInstance: state.credentials.idInstance };
        state.credentials = null;
        state.instanceState = null;
      }
    },
    instanceStateChanged: (state, action: PayloadAction<StateInstance>) => {
      state.instanceState = action.payload;
    },
  },
  selectors: {
    selectCredentials: (state) => state.credentials,
    selectIdInstance: (state) => state.credentials?.idInstance ?? null,
    selectIsSignedIn: (state) => state.credentials !== null,
    selectForcedSignOut: (state) => state.forcedSignOut,
  },
});

export const { reducer: sessionReducer, actions: sessionActions } = sessionSlice;

export const { selectCredentials, selectIdInstance, selectIsSignedIn, selectForcedSignOut } = sessionSlice.selectors;
