const instanceData = { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' };

export const incomingTextNotification = {
  typeWebhook: 'incomingMessageReceived',
  instanceData,
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Vasilisa',
    senderName: 'Vasilisa',
    senderType: 'user',
    senderContactName: 'Vasilisa',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'I use GREEN-API to send this message!', forwardingScore: 0, isForwarded: false },
  },
};

export const incomingExtendedTextNotification = {
  ...incomingTextNotification,
  idMessage: '1763115199001',
  messageData: {
    typeMessage: 'extendedTextMessage',
    extendedTextMessageData: {
      text: 'Docs: https://green-api.com/en/telegram/docs/',
      description: 'GREEN-API documentation',
      title: 'GREEN-API',
      jpegThumbnail: '',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

export const incomingImageNotification = {
  ...incomingTextNotification,
  idMessage: '1763115200002',
  messageData: {
    typeMessage: 'imageMessage',
    fileMessageData: {
      downloadUrl: 'https://example.test/file.jpg',
      caption: 'A photo',
      fileName: 'file.jpg',
      mimeType: 'image/jpeg',
    },
  },
};

export const incomingGroupNotification = {
  ...incomingTextNotification,
  idMessage: '1763115300003',
  senderData: {
    ...incomingTextNotification.senderData,
    chatId: '-1000000000001',
    chatType: 'supergroup',
    chatName: 'Team chat',
    senderPhoneNumber: 0,
  },
};

const outgoingSenderData = {
  chatId: '10000000',
  chatType: 'user',
  sender: '20000000',
  chatName: 'Ivan Tsarevich',
  senderName: 'Vasilisa the Wise',
  senderType: 'user',
  senderContactName: '',
  senderPhoneNumber: 79876543210,
};

export const outgoingPhoneNotification = {
  typeWebhook: 'outgoingMessageReceived',
  instanceData,
  timestamp: 1763115400,
  idMessage: '1763115400004',
  senderData: outgoingSenderData,
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Sent from my phone', forwardingScore: 0, isForwarded: false },
  },
};

export const outgoingApiNotification = {
  typeWebhook: 'outgoingAPIMessageReceived',
  instanceData,
  timestamp: 1763115500,
  idMessage: '1763115500005',
  senderData: outgoingSenderData,
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Sent through the API', forwardingScore: 0, isForwarded: false },
  },
};

export const statusNotification = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData,
  timestamp: 1755591519,
  idMessage: '115054445839974415',
  status: 'read',
};

export const failedStatusNotification = {
  ...statusNotification,
  status: 'failed',
  description: 'Telegram rejected the message',
};

export const noAccountNotification = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '77777777777@c.us',
  instanceData,
  timestamp: 1755591600,
  status: 'noAccount',
  sendByApi: true,
};

export const noAccountWithIdMessageNotification = {
  ...noAccountNotification,
  chatId: '10000000',
  idMessage: '115054445839974416',
};

export const failedWithoutIdMessageNotification = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData,
  timestamp: 1755591700,
  status: 'failed',
  description: 'media caption too long',
};

export const stateChangedNotification = {
  typeWebhook: 'stateInstanceChanged',
  instanceData,
  timestamp: 1763115600,
  stateInstance: 'notAuthorized',
};

export const quotaExceededNotification = {
  typeWebhook: 'quotaExceeded',
  instanceData,
  timestamp: 1763115700,
  quotaData: {
    method: 'correspondents',
    used: 3,
    total: 3,
    status: 'CORRESPONDENTS_QUOTA_EXCEEDED',
    description:
      'The monthly limit of chats has been reached. Messaging is available only with the following chats: 10000000, 10000001, 10000002',
  },
};

export const unknownTypeNotification = {
  typeWebhook: 'incomingCall',
  instanceData,
  timestamp: 1763115800,
  idCall: 'call-1',
  from: '10000000',
  status: 'pickUp',
};
