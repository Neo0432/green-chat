import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';

import { selectInstanceState, sessionActions } from '@entities/session';

import { getInstanceStateMessage } from '../lib/get-instance-state-message';

export interface ReceiveState {
  isConnecting: boolean;
  /** What is wrong with the polling itself: a blocked queue, an exhausted quota. */
  error: string | null;
}

const initialState: ReceiveState = { isConnecting: false, error: null };

export const receiveSlice = createSlice({
  name: 'receive',
  initialState,
  reducers: {
    /** FR-4.3: the strip names the problem when there is a message for it, and says "Connecting…" otherwise. */
    pollFailed: (_state, { payload }: PayloadAction<string | null>) => ({
      isConnecting: payload === null,
      error: payload,
    }),
    pollRecovered: () => initialState,
    /** FR-4.12 */
    errorSet: (state, { payload }: PayloadAction<string>) => {
      state.error = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isAnyOf(sessionActions.signedOut, sessionActions.forcedSignOut), () => initialState);
  },
  selectors: {
    selectIsConnecting: (state) => state.isConnecting,
    selectReceiveError: (state) => state.error,
  },
});

export const { reducer: receiveReducer, actions: receiveActions } = receiveSlice;

export const { selectIsConnecting, selectReceiveError } = receiveSlice.selectors;

/** FR-6.4: a problem of the polling, or else a state of the instance that keeps messages from coming. */
export const selectStatusError = (state: RootState): string | null =>
  selectReceiveError(state) ?? getInstanceStateMessage(selectInstanceState(state));
