import { isQuotaError, isWebhookUrlError } from '@shared/api/green-api';

const WEBHOOK_URL_MESSAGE =
  'Incoming messages are blocked: the instance has a webhook URL set. Clear it in the GREEN-API console and wait about 1 minute.';

export const getQuotaMessage = (description: string | null | undefined) => description ?? 'Tariff limit reached.';

export const getReceiveErrorMessage = (error: unknown) => {
  if (isWebhookUrlError(error)) {
    return WEBHOOK_URL_MESSAGE;
  }

  return isQuotaError(error) ? getQuotaMessage(error.serverMessage) : null;
};
