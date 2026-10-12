import { isNonBlankString, isNonEmptyString, isPlainObject } from '@shared/lib/predicates';

import { isPrivateChatId } from './chat-id';
import type {
  DeliveryStatus,
  MessageSource,
  ParsedMessageNotification,
  ParsedNotification,
  ParsedQuotaNotification,
  ParsedStateNotification,
  ParsedStatusNotification,
} from './types';

type Body = Record<string, unknown>;

const DELIVERY_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const satisfies readonly DeliveryStatus[];

const NO_ACCOUNT_DESCRIPTION = 'There is no Telegram account for this recipient';

const isDeliveryStatus = (value: unknown): value is DeliveryStatus =>
  DELIVERY_STATUSES.some((status) => status === value);

/** `noAccount` is a status of its own in the docs, but for the app it is just another way to fail. */
const toDeliveryStatus = (status: unknown): DeliveryStatus | null => {
  if (status === 'noAccount') {
    return 'failed';
  }

  return isDeliveryStatus(status) ? status : null;
};

const getFirstNonBlank = (...candidates: unknown[]) => candidates.find(isNonBlankString)?.trim() ?? null;

/** A notification without `instanceData.idInstance` is accepted: only a mismatch proves it belongs to someone else. */
const isForInstance = ({ instanceData }: Body, idInstance: string) => {
  if (instanceData === undefined) {
    return true;
  }

  if (!isPlainObject(instanceData)) {
    return false;
  }

  const received = instanceData.idInstance;

  if (received === undefined) {
    return true;
  }

  return (typeof received === 'number' || typeof received === 'string') && String(received) === idInstance;
};

const readText = (container: unknown, key: string) => {
  if (!isPlainObject(container)) {
    return null;
  }

  const value = container[key];

  return typeof value === 'string' ? value : null;
};

const getMessageText = (messageData: Body) => {
  switch (messageData.typeMessage) {
    case 'textMessage':
      return readText(messageData.textMessageData, 'textMessage');
    case 'extendedTextMessage':
      return readText(messageData.extendedTextMessageData, 'text');
    default:
      return null;
  }
};

const getPhone = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : null;

const toMilliseconds = (seconds: unknown) =>
  typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Date.now();

const parseMessage = (body: Body, source: MessageSource): ParsedMessageNotification | null => {
  const { idMessage, senderData, messageData } = body;

  if (!isNonEmptyString(idMessage) || !isPlainObject(senderData) || !isPlainObject(messageData)) {
    return null;
  }

  if (!isPrivateChatId(senderData.chatId) || (senderData.chatType !== undefined && senderData.chatType !== 'user')) {
    return null;
  }

  const text = getMessageText(messageData);

  if (text === null || text.trim() === '') {
    return null;
  }

  // In outgoing notifications `sender*` is our own account and `chatName` is the recipient (live docs).
  const isIncoming = source === 'incoming';

  return {
    type: 'message',
    source,
    chatId: senderData.chatId,
    idMessage,
    timestamp: toMilliseconds(body.timestamp),
    text,
    senderName: isIncoming
      ? getFirstNonBlank(senderData.senderContactName, senderData.senderName, senderData.chatName)
      : getFirstNonBlank(senderData.chatName),
    senderPhone: isIncoming ? getPhone(senderData.senderPhoneNumber) : null,
  };
};

/** The live `failed` and `noAccount` examples have no `idMessage`: with nothing to match, they are ignored. */
const parseStatus = ({ idMessage, status, chatId, description }: Body): ParsedStatusNotification | null => {
  const deliveryStatus = toDeliveryStatus(status);

  if (!isNonEmptyString(idMessage) || deliveryStatus === null) {
    return null;
  }

  return {
    type: 'status',
    chatId: isPrivateChatId(chatId) ? chatId : null,
    idMessage,
    status: deliveryStatus,
    description: getFirstNonBlank(description) ?? (status === 'noAccount' ? NO_ACCOUNT_DESCRIPTION : null),
  };
};

const parseState = ({ stateInstance }: Body): ParsedStateNotification | null =>
  isNonEmptyString(stateInstance) ? { type: 'state', stateInstance } : null;

const parseQuota = ({ quotaData }: Body): ParsedQuotaNotification => ({
  type: 'quota',
  description: isPlainObject(quotaData) ? getFirstNonBlank(quotaData.description) : null,
});

/**
 * Turns a raw notification body into one of the handled shapes. Everything the app does not handle
 * (other instance, groups, non-text, unknown types, malformed data) yields `null`: never a throw.
 */
export const parseNotification = (body: unknown, idInstance: string): ParsedNotification | null => {
  if (!isPlainObject(body) || !isForInstance(body, idInstance)) {
    return null;
  }

  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
      return parseMessage(body, 'incoming');
    case 'outgoingMessageReceived':
      return parseMessage(body, 'outgoing-phone');
    case 'outgoingAPIMessageReceived':
      return parseMessage(body, 'outgoing-api');
    case 'outgoingMessageStatus':
      return parseStatus(body);
    case 'stateInstanceChanged':
      return parseState(body);
    case 'quotaExceeded':
      return parseQuota(body);
    default:
      return null;
  }
};
