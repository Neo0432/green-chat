import type { StateInstance } from '@shared/api/green-api';
import {
  incomingExtendedTextNotification,
  incomingImageNotification,
  incomingTextNotification,
  outgoingApiNotification,
  outgoingPhoneNotification,
  quotaExceededNotification,
  stateChangedNotification,
  statusNotification,
} from '@shared/test/fixtures/green-api';

interface NotificationParams {
  idInstance: string;
  timestamp?: number;
}

interface MessageParams extends NotificationParams {
  chatId: string;
  idMessage: string;
  text: string;
}

interface IncomingMessageParams extends MessageParams {
  senderName: string;
  senderPhone?: number;
  typeMessage?: string;
}

interface OutgoingMessageParams extends MessageParams {
  source: 'phone' | 'api';
  recipientName: string;
}

interface StatusParams extends NotificationParams {
  chatId: string;
  idMessage: string;
  status: 'delivered' | 'read' | 'failed' | 'noAccount';
  description?: string;
}

interface StateChangedParams extends NotificationParams {
  stateInstance: StateInstance;
}

const getNowSeconds = () => Math.floor(Date.now() / 1000);

export const getContactName = (chatId: string) => `Mock Contact ${chatId.slice(-4)}`;

export const createInstanceData = (idInstance: string) => ({
  ...incomingTextNotification.instanceData,
  idInstance: Number(idInstance),
});

const createMessageData = (text: string, typeMessage: string) => {
  switch (typeMessage) {
    case 'textMessage':
      return {
        typeMessage,
        textMessageData: { ...incomingTextNotification.messageData.textMessageData, textMessage: text },
      };
    case 'extendedTextMessage':
      return {
        typeMessage,
        extendedTextMessageData: { ...incomingExtendedTextNotification.messageData.extendedTextMessageData, text },
      };
    default:
      return {
        typeMessage,
        fileMessageData: { ...incomingImageNotification.messageData.fileMessageData, caption: text },
      };
  }
};

export const createIncomingNotification = ({
  idInstance,
  chatId,
  idMessage,
  text,
  senderName,
  senderPhone = 0,
  typeMessage = 'textMessage',
  timestamp = getNowSeconds(),
}: IncomingMessageParams) => ({
  ...incomingTextNotification,
  instanceData: createInstanceData(idInstance),
  timestamp,
  idMessage,
  senderData: {
    ...incomingTextNotification.senderData,
    chatId,
    sender: chatId,
    chatName: senderName,
    senderName,
    senderContactName: '',
    senderPhoneNumber: senderPhone,
  },
  messageData: createMessageData(text, typeMessage),
});

export const createOutgoingNotification = ({
  idInstance,
  chatId,
  idMessage,
  text,
  source,
  recipientName,
  timestamp = getNowSeconds(),
}: OutgoingMessageParams) => {
  const template = source === 'phone' ? outgoingPhoneNotification : outgoingApiNotification;

  return {
    ...template,
    instanceData: createInstanceData(idInstance),
    timestamp,
    idMessage,
    senderData: { ...template.senderData, chatId, chatName: recipientName, senderName: 'Me (mock)' },
    messageData: createMessageData(text, 'textMessage'),
  };
};

export const createStatusNotification = ({
  idInstance,
  chatId,
  idMessage,
  status,
  description,
  timestamp = getNowSeconds(),
}: StatusParams) => ({
  ...statusNotification,
  instanceData: createInstanceData(idInstance),
  timestamp,
  chatId,
  idMessage,
  status,
  ...(description === undefined ? {} : { description }),
  ...(status === 'noAccount' ? { sendByApi: true } : {}),
});

export const createStateChangedNotification = ({
  idInstance,
  stateInstance,
  timestamp = getNowSeconds(),
}: StateChangedParams) => ({
  ...stateChangedNotification,
  instanceData: createInstanceData(idInstance),
  timestamp,
  stateInstance,
});

export const createQuotaExceededNotification = ({ idInstance, timestamp = getNowSeconds() }: NotificationParams) => ({
  ...quotaExceededNotification,
  instanceData: createInstanceData(idInstance),
  timestamp,
});
