import { parseNotification } from '@shared/api/green-api';
import {
  createIncomingNotification,
  createInstanceData,
  createOutgoingNotification,
  createQuotaExceededNotification,
  createStateChangedNotification,
  createStatusNotification,
  getContactName,
} from '@shared/test/msw/green-api/notification-factories';

const ID_INSTANCE = '4100000001';
const TIMESTAMP = 1763115112;

describe('mock notifications', () => {
  describe('getContactName', () => {
    it('ends with the last 4 characters of the chat id', () => {
      expect(getContactName('11234567')).toBe('Mock Contact 4567');
      expect(getContactName('-1000000000001')).toBe('Mock Contact 0001');
    });
  });

  describe('createInstanceData', () => {
    it('names the instance with a number, as GREEN-API does', () => {
      expect(createInstanceData(ID_INSTANCE)).toMatchObject({ idInstance: 4100000001, typeInstance: 'telegram' });
    });
  });

  describe('createIncomingNotification', () => {
    const params = {
      idInstance: ID_INSTANCE,
      chatId: '20000001',
      idMessage: '111',
      text: 'Hello',
      senderName: 'Alice (mock)',
      senderPhone: 79990000001,
      timestamp: TIMESTAMP,
    };

    it('is parsed by the client as an incoming message', () => {
      expect(parseNotification(createIncomingNotification(params), ID_INSTANCE)).toEqual({
        type: 'message',
        source: 'incoming',
        chatId: '20000001',
        idMessage: '111',
        timestamp: TIMESTAMP * 1000,
        text: 'Hello',
        senderName: 'Alice (mock)',
        senderPhone: '79990000001',
      });
    });

    it('hides the phone of a sender without one', () => {
      const parsed = parseNotification(createIncomingNotification({ ...params, senderPhone: undefined }), ID_INSTANCE);

      expect(parsed).toMatchObject({ senderPhone: null });
    });

    it('belongs to the given instance only', () => {
      expect(parseNotification(createIncomingNotification(params), '4100000002')).toBeNull();
    });

    it('carries the link text of an extended text message', () => {
      const body = createIncomingNotification({ ...params, typeMessage: 'extendedTextMessage' });

      expect(parseNotification(body, ID_INSTANCE)).toMatchObject({ text: 'Hello' });
      expect(body.messageData).toHaveProperty('extendedTextMessageData.text', 'Hello');
    });

    it('makes a file message the client ignores for any other type', () => {
      const body = createIncomingNotification({ ...params, typeMessage: 'imageMessage' });

      expect(body.messageData).toMatchObject({ typeMessage: 'imageMessage', fileMessageData: { caption: 'Hello' } });
      expect(parseNotification(body, ID_INSTANCE)).toBeNull();
    });

    it('stamps the current time by default', () => {
      jest.useFakeTimers({ now: new Date('2026-01-02T03:04:05.678Z') });

      try {
        const { timestamp } = createIncomingNotification({ ...params, timestamp: undefined });

        expect(timestamp).toBe(Math.floor(Date.parse('2026-01-02T03:04:05.678Z') / 1000));
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('createOutgoingNotification', () => {
    const params = {
      idInstance: ID_INSTANCE,
      chatId: '11234567',
      idMessage: '222',
      text: 'Hi there',
      recipientName: 'Mock Contact 4567',
      timestamp: TIMESTAMP,
    };

    it.each([
      ['phone', 'outgoing-phone'],
      ['api', 'outgoing-api'],
    ] as const)('is parsed by the client as an outgoing %s message to the recipient', (source, parsedSource) => {
      expect(parseNotification(createOutgoingNotification({ ...params, source }), ID_INSTANCE)).toEqual({
        type: 'message',
        source: parsedSource,
        chatId: '11234567',
        idMessage: '222',
        timestamp: TIMESTAMP * 1000,
        text: 'Hi there',
        senderName: 'Mock Contact 4567',
        senderPhone: null,
      });
    });

    it('describes our own account in the sender fields', () => {
      const { senderData } = createOutgoingNotification({ ...params, source: 'api' });

      expect(senderData).toMatchObject({
        chatId: '11234567',
        chatName: 'Mock Contact 4567',
        sender: '20000000',
        senderName: 'Me (mock)',
        senderPhoneNumber: 79876543210,
      });
    });

    it('uses the webhook type of its source', () => {
      expect(createOutgoingNotification({ ...params, source: 'phone' }).typeWebhook).toBe('outgoingMessageReceived');
      expect(createOutgoingNotification({ ...params, source: 'api' }).typeWebhook).toBe('outgoingAPIMessageReceived');
    });
  });

  describe('createStatusNotification', () => {
    const params = { idInstance: ID_INSTANCE, chatId: '11234567', idMessage: '333', timestamp: TIMESTAMP };

    it.each(['delivered', 'read'] as const)('is parsed by the client as a %s status', (status) => {
      expect(parseNotification(createStatusNotification({ ...params, status }), ID_INSTANCE)).toEqual({
        type: 'status',
        chatId: '11234567',
        idMessage: '333',
        status,
        description: null,
      });
    });

    it('carries the description of a failure', () => {
      const body = createStatusNotification({ ...params, status: 'failed', description: 'Rejected' });

      expect(parseNotification(body, ID_INSTANCE)).toMatchObject({ status: 'failed', description: 'Rejected' });
    });

    it('marks noAccount as sent through the API', () => {
      const body = createStatusNotification({ ...params, status: 'noAccount' });

      expect(body).toMatchObject({ status: 'noAccount', sendByApi: true, idMessage: '333' });
      expect(parseNotification(body, ID_INSTANCE)).toMatchObject({
        status: 'failed',
        description: 'There is no Telegram account for this recipient',
      });
    });

    it('leaves out the fields that do not apply', () => {
      const body = createStatusNotification({ ...params, status: 'read' });

      expect(body).not.toHaveProperty('description');
      expect(body).not.toHaveProperty('sendByApi');
    });
  });

  describe('createStateChangedNotification', () => {
    it('is parsed by the client as a state change', () => {
      const body = createStateChangedNotification({ idInstance: ID_INSTANCE, stateInstance: 'blocked' });

      expect(parseNotification(body, ID_INSTANCE)).toEqual({ type: 'state', stateInstance: 'blocked' });
    });
  });

  describe('createQuotaExceededNotification', () => {
    it('is parsed by the client as a quota notification with its description', () => {
      const body = createQuotaExceededNotification({ idInstance: ID_INSTANCE });

      expect(parseNotification(body, ID_INSTANCE)).toEqual({
        type: 'quota',
        description: body.quotaData.description,
      });
    });
  });
});
