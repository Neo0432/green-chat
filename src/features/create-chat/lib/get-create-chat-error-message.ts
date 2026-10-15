import { assertNever } from '@shared/lib';

import type { CreateChatFailure } from '../model/types';

const NOT_FOUND_MESSAGE = "This number isn't on Telegram, or its owner hides it in privacy settings.";
const NOT_READY_MESSAGE = 'The instance is starting or not authorized.';
const RATE_LIMIT_MESSAGE = 'Too many number checks. Telegram asks to pause for about 2 hours.';
const TELEGRAM_UNAVAILABLE_MESSAGE = 'Telegram is temporarily unavailable. Try again in a few minutes.';

const getUnavailableMessage = (serverReason: string) => {
  if (serverReason === 'rate_limit_exceeded') {
    return RATE_LIMIT_MESSAGE;
  }

  return serverReason === '' || /starting or not authorized/i.test(serverReason)
    ? NOT_READY_MESSAGE
    : `Couldn't check the number: ${serverReason}`;
};

const HTTP_STATUS_MESSAGES = new Map<number, string>([
  [404, 'Wrong API URL.'],
  [429, 'Too many requests. Wait a few seconds and try again.'],
  [466, 'The monthly limit of number checks is reached on this tariff.'],
  [469, 'Telegram restricted number lookups for this account. Try again in a few hours.'],
]);

const getHttpMessage = (status: number | undefined, serverMessage: string | undefined) => {
  if (status === 500 && /messenger is temporarily unavailable/i.test(serverMessage ?? '')) {
    return TELEGRAM_UNAVAILABLE_MESSAGE;
  }

  if (status !== undefined && status >= 500) {
    return `GREEN-API is unavailable (HTTP ${status}). Try again later.`;
  }

  if (status === 400) {
    return serverMessage ? `Couldn't check the number: ${serverMessage}` : "Couldn't check the number.";
  }

  const knownMessage = status === undefined ? undefined : HTTP_STATUS_MESSAGES.get(status);

  return knownMessage ?? serverMessage ?? 'GREEN-API rejected the request.';
};

type RequestFailure = Extract<CreateChatFailure, { reason: 'request-failed' }>;

const getRequestMessage = ({ errorKind, status, serverMessage }: RequestFailure) => {
  switch (errorKind) {
    case 'http':
      return getHttpMessage(status, serverMessage);
    case 'network':
      return "Can't reach GREEN-API.";
    case 'timeout':
      return "GREEN-API didn't respond in time. Try again.";
    case 'parse':
      return 'Unexpected response from GREEN-API.';
    case 'aborted':
      return 'The request was cancelled. Try again.';
    default:
      return assertNever(errorKind);
  }
};

export const getCreateChatErrorMessage = (failure: CreateChatFailure) => {
  switch (failure.reason) {
    case 'not-found':
      return NOT_FOUND_MESSAGE;
    case 'unavailable':
      return getUnavailableMessage(failure.serverReason);
    case 'request-failed':
      return getRequestMessage(failure);
    default:
      return assertNever(failure);
  }
};
