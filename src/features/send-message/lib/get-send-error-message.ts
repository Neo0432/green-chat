import type { GreenApiError } from '@shared/api/green-api';
import { assertNever } from '@shared/lib';

const getHttpMessage = (status: number | undefined, serverMessage: string | undefined) => {
  if (status !== undefined && status >= 500) {
    return `Not sent: GREEN-API error (HTTP ${status}).`;
  }

  if (status === 404) {
    return 'Not sent: wrong API URL.';
  }

  if (status === 429) {
    return 'Not sent: too many requests. Retry in a few seconds.';
  }

  if (status === 466) {
    return serverMessage ? `Not sent: tariff limit reached (${serverMessage}).` : 'Not sent: tariff limit reached.';
  }

  return serverMessage ? `Not sent: ${serverMessage}` : 'Not sent.';
};

/** The SendMessage column of requirements FR-6.2. */
export const getSendErrorMessage = ({ kind, status, serverMessage }: GreenApiError) => {
  switch (kind) {
    case 'http':
      return getHttpMessage(status, serverMessage);
    case 'network':
      return 'Not sent: no connection.';
    case 'timeout':
      return 'Not sent: request timed out.';
    case 'parse':
      return 'Not sent: unexpected response from GREEN-API.';
    case 'aborted':
      return 'Not sent: request was cancelled.';
    default:
      return assertNever(kind);
  }
};
