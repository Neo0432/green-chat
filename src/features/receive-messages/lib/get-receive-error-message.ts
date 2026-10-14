import { isQuotaError, isWebhookUrlError } from '@shared/api/green-api';

const WEBHOOK_URL_MESSAGE =
  'Incoming messages are blocked: the instance has a webhook URL set. Clear it in the GREEN-API console and wait about 1 minute.';

/** FR-4.12: the description of the notification, or of the 466 from receive, when there is one. */
export const getQuotaMessage = (description: string | null | undefined) => description ?? 'Tariff limit reached.';

/**
 * What the status strip says about a failed poll (FR-4.3), or `null` when it is only a connection problem, which
 * the strip reports as "Connecting…".
 */
export const getReceiveErrorMessage = (error: unknown) => {
  if (isWebhookUrlError(error)) {
    return WEBHOOK_URL_MESSAGE;
  }

  return isQuotaError(error) ? getQuotaMessage(error.serverMessage) : null;
};
