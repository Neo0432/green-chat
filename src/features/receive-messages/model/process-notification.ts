import {
  type ApiMessage,
  chatsActions,
  messagesActions,
  type ReceivedMessage,
  selectActiveChatId,
  selectChatById,
  selectHasMessage,
} from '@entities/chat';
import { sessionActions } from '@entities/session';

import {
  type ParsedMessageNotification,
  type ParsedStatusNotification,
  parseNotification,
} from '@shared/api/green-api';
import { assertNever } from '@shared/lib';

import { getQuotaMessage } from '../lib/get-receive-error-message';

import { receiveActions } from './receive-slice';

const FAILED_STATUS_MESSAGE = 'Telegram rejected the message';

interface StoreApi {
  dispatch: AppDispatch;
  getState: () => RootState;
}

const getPlaceholderTitle = ({ chatId, senderPhone }: ParsedMessageNotification) =>
  senderPhone === null ? `Telegram ID ${chatId}` : `+${senderPhone}`;

const toBaseMessage = ({ chatId, idMessage, text, timestamp }: ParsedMessageNotification) => ({
  localId: `srv-${idMessage}`,
  idMessage,
  chatId,
  text,
  timestamp,
  error: null,
});

const toIncomingMessage = (notification: ParsedMessageNotification): ReceivedMessage => ({
  ...toBaseMessage(notification),
  direction: 'in',
  status: null,
});

const toOutgoingMessage = (notification: ParsedMessageNotification): ApiMessage => ({
  ...toBaseMessage(notification),
  direction: 'out',
  status: 'sent',
});

/** FR-4.5 (d)(g): the chat is made on the first message, and a name replaces its placeholder title (FR-2.8). */
const ensureChat = ({ dispatch, getState }: StoreApi, notification: ParsedMessageNotification) => {
  const { chatId, senderName, senderPhone, timestamp } = notification;

  if (!selectChatById(getState(), chatId)) {
    dispatch(
      chatsActions.chatCreated({
        chatId,
        phone: senderPhone,
        title: getPlaceholderTitle(notification),
        createdAt: timestamp,
      }),
    );
  }

  if (senderName !== null) {
    dispatch(chatsActions.chatTitleSetFromName({ chatId, title: senderName }));
  }
};

const processMessage = (api: StoreApi, notification: ParsedMessageNotification) => {
  const { dispatch, getState } = api;
  const { source, chatId, idMessage } = notification;

  ensureChat(api, notification);

  // A notification that comes back after a failed delete: the message and the unread count are in already.
  if (selectHasMessage(getState(), chatId, idMessage)) {
    return;
  }

  switch (source) {
    case 'incoming':
      dispatch(messagesActions.messageReceived(toIncomingMessage(notification)));

      if (selectActiveChatId(getState()) !== chatId) {
        dispatch(chatsActions.chatUnreadIncremented(chatId));
      }

      break;
    case 'outgoing-phone':
      dispatch(messagesActions.messageReceived(toOutgoingMessage(notification)));

      break;
    case 'outgoing-api':
      dispatch(messagesActions.apiMessageReceived(toOutgoingMessage(notification)));

      break;
    default:
      assertNever(source);
  }
};

const processStatus = (
  { dispatch }: StoreApi,
  { idMessage, chatId, status, description }: ParsedStatusNotification,
) => {
  dispatch(
    messagesActions.messageStatusUpdated({
      idMessage,
      chatId: chatId ?? undefined,
      status,
      error: description ?? FAILED_STATUS_MESSAGE,
    }),
  );
};

/**
 * FR-4.4 to FR-4.13: routes a notification to the store. What the app does not handle is dropped, never thrown at.
 */
export const processNotification = (api: StoreApi, idInstance: string, body: unknown) => {
  const notification = parseNotification(body, idInstance);

  if (notification === null) {
    return;
  }

  switch (notification.type) {
    case 'message':
      processMessage(api, notification);

      break;
    case 'status':
      processStatus(api, notification);

      break;
    case 'state':
      api.dispatch(sessionActions.instanceStateChanged(notification.stateInstance));

      break;
    case 'quota':
      api.dispatch(receiveActions.errorSet(getQuotaMessage(notification.description)));

      break;
    default:
      assertNever(notification);
  }
};
