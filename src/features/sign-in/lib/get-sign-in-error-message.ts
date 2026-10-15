import type { StateInstance } from '@shared/api/green-api';
import { assertNever } from '@shared/lib';

import type { SignInFailure } from '../model/types';

export const FORCED_SIGN_OUT_MESSAGE = 'Your credentials were rejected by GREEN-API. Please sign in again.';

const getInstanceStateMessage = (stateInstance: StateInstance) => {
  switch (stateInstance) {
    case 'notAuthorized':
    case 'pendingCode':
    case 'pendingPassword':
      return "This instance isn't linked to a Telegram account yet. Authorize it in console.green-api.com and try again.";
    case 'starting':
      return 'The instance is starting. Try again in a minute.';
    case 'blocked':
      return 'The Telegram account of this instance is blocked.';
    case 'authorized':
    case 'suspended':
    case 'sleepMode':
    case 'yellowCard':
    default:
      return `The instance is not ready (state: ${stateInstance}).`;
  }
};

const HTTP_STATUS_MESSAGES = new Map<number, string>([
  [401, 'Wrong API token.'],
  [403, 'Wrong Instance ID or API URL.'],
  [404, 'Wrong API URL.'],
  [429, 'Too many requests. Wait a few seconds and try again.'],
]);

const getHttpMessage = (status: number | undefined, serverMessage: string | undefined) => {
  if (status !== undefined && status >= 500) {
    return `GREEN-API is unavailable (HTTP ${status}). Try again later.`;
  }

  const knownMessage = status === undefined ? undefined : HTTP_STATUS_MESSAGES.get(status);

  return knownMessage ?? serverMessage ?? 'GREEN-API rejected the request.';
};

type RequestFailure = Extract<SignInFailure, { reason: 'request-failed' }>;

const getRequestMessage = ({ errorKind, status, serverMessage }: RequestFailure, apiUrl: string) => {
  switch (errorKind) {
    case 'http':
      return getHttpMessage(status, serverMessage);
    case 'network':
      return `Can't reach GREEN-API at ${apiUrl}. Check the Instance ID, the API URL and your connection.`;
    case 'timeout':
      return "GREEN-API didn't respond in time. Try again.";
    case 'parse':
      return 'Unexpected response from GREEN-API. Check the API URL.';
    case 'aborted':
      return 'The request was cancelled. Try again.';
    default:
      return assertNever(errorKind);
  }
};

export const getSignInErrorMessage = (failure: SignInFailure, apiUrl: string) => {
  switch (failure.reason) {
    case 'instance-not-authorized':
      return getInstanceStateMessage(failure.stateInstance);
    case 'request-failed':
      return getRequestMessage(failure, apiUrl);
    default:
      return assertNever(failure);
  }
};
