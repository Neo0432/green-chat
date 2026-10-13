import { sessionActions } from '@entities/session';

import { type Credentials, getStateInstance, isGreenApiError, type StateInstance } from '@shared/api/green-api';
import { createAppAsyncThunk } from '@shared/lib/redux';

import type { SignInResult } from './types';

/**
 * Signs in only when the instance is authorized (FR-1.4). An expected failure is a result, not a rejection, and the
 * progress is not kept in Redux: the form knows it from `formState.isSubmitting`.
 */
export const signIn = createAppAsyncThunk<SignInResult, Credentials>(
  'sign-in/signIn',
  async (credentials, { dispatch }) => {
    let stateInstance: StateInstance;

    try {
      stateInstance = await getStateInstance(credentials);
    } catch (error) {
      if (!isGreenApiError(error)) {
        throw error;
      }

      return {
        ok: false,
        failure: {
          reason: 'request-failed',
          errorKind: error.kind,
          status: error.status,
          serverMessage: error.serverMessage,
        },
      };
    }

    if (stateInstance !== 'authorized') {
      return { ok: false, failure: { reason: 'instance-not-authorized', stateInstance } };
    }

    dispatch(sessionActions.signedIn(credentials));

    return { ok: true };
  },
);
