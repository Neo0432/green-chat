import { createSlice, isAnyOf, type PayloadAction } from '@reduxjs/toolkit';

import { selectInstanceState, sessionActions } from '@entities/session';

import { getInstanceStateMessage } from '../lib/get-instance-state-message';

export interface ReceiveState {
  isConnecting: boolean;
  error: string | null;
}

const initialState: ReceiveState = { isConnecting: false, error: null };

export const receiveSlice = createSlice({
  name: 'receive',
  initialState,
  reducers: {
    pollFailed: (_state, { payload }: PayloadAction<string | null>) => ({
      isConnecting: payload === null,
      error: payload,
    }),
    pollRecovered: () => initialState,
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

export const selectStatusError = (state: RootState): string | null =>
  selectReceiveError(state) ?? getInstanceStateMessage(selectInstanceState(state));
