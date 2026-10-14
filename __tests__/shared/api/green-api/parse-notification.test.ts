import { parseNotification } from '@shared/api/green-api';
import {
  failedStatusNotification,
  failedWithoutIdMessageNotification,
  incomingExtendedTextNotification,
  incomingGroupNotification,
  incomingImageNotification,
  incomingTextNotification,
  noAccountNotification,
  noAccountWithIdMessageNotification,
  outgoingApiNotification,
  outgoingPhoneNotification,
  quotaExceededNotification,
  stateChangedNotification,
  statusNotification,
  TEST_CREDENTIALS,
  unknownTypeNotification,
} from '@shared/test/fixtures/green-api';

const { idInstance } = TEST_CREDENTIALS;

const parse = (body: unknown) => parseNotification(body, idInstance);

const withSenderData = (notification: typeof incomingTextNotification, senderData: Record<string, unknown>) => ({
  ...notification,
  senderData: { ...notification.senderData, ...senderData },
});

describe('parseNotification', () => {
  describe('incoming messages', () => {
    it('parses a text message', () => {
      expect(parse(incomingTextNotification)).toEqual({
        type: 'message',
        source: 'incoming',
        chatId: '10000000',
        idMessage: '1763115112345',
        timestamp: 1763115112000,
        text: 'I use GREEN-API to send this message!',
        senderName: 'Vasilisa',
        senderPhone: '79998887766',
      });
    });

    it('parses an extended text message from its full text', () => {
      expect(parse(incomingExtendedTextNotification)).toMatchObject({
        type: 'message',
        source: 'incoming',
        idMessage: '1763115199001',
        text: 'Docs: https://green-api.com/en/telegram/docs/',
      });
    });

    it('keeps the text as it was written, with its whitespace', () => {
      const notification = {
        ...incomingTextNotification,
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: '  line 1\nline 2  ' },
        },
      };

      expect(parse(notification)).toMatchObject({ text: '  line 1\nline 2  ' });
    });

    it('converts the timestamp from seconds to milliseconds', () => {
      expect(parse({ ...incomingTextNotification, timestamp: 1700000000 })).toMatchObject({ timestamp: 1700000000000 });
    });

    describe('without a usable timestamp', () => {
      beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2026-01-02T03:04:05Z') });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it.each([undefined, 'soon', 0, -5, Number.NaN])('falls back to the current time for %p', (timestamp) => {
        expect(parse({ ...incomingTextNotification, timestamp })).toMatchObject({
          timestamp: new Date('2026-01-02T03:04:05Z').getTime(),
        });
      });
    });

    describe('sender name', () => {
      it('prefers the name from the phone book', () => {
        const notification = withSenderData(incomingTextNotification, {
          senderContactName: 'Vasya',
          senderName: 'Vasilisa',
          chatName: 'Chat',
        });

        expect(parse(notification)).toMatchObject({ senderName: 'Vasya' });
      });

      it('falls back to the sender name when the contact name is empty', () => {
        const notification = withSenderData(incomingTextNotification, { senderContactName: '', chatName: 'Chat' });

        expect(parse(notification)).toMatchObject({ senderName: 'Vasilisa' });
      });

      it('falls back to the chat name', () => {
        const notification = withSenderData(incomingTextNotification, {
          senderContactName: '',
          senderName: '   ',
          chatName: 'Chat',
        });

        expect(parse(notification)).toMatchObject({ senderName: 'Chat' });
      });

      it('is null when no name is given', () => {
        const notification = withSenderData(incomingTextNotification, {
          senderContactName: '',
          senderName: undefined,
          chatName: 5,
        });

        expect(parse(notification)).toMatchObject({ senderName: null });
      });

      it('is trimmed', () => {
        expect(parse(withSenderData(incomingTextNotification, { senderContactName: '  Vasya ' }))).toMatchObject({
          senderName: 'Vasya',
        });
      });
    });

    describe('sender phone', () => {
      it('is a digits string', () => {
        expect(parse(incomingTextNotification)).toMatchObject({ senderPhone: '79998887766' });
      });

      it.each([0, -1, 1.5, '79998887766', null, undefined])('is null for %p', (senderPhoneNumber) => {
        expect(parse(withSenderData(incomingTextNotification, { senderPhoneNumber }))).toMatchObject({
          senderPhone: null,
        });
      });
    });

    it('accepts a notification without the chat type', () => {
      expect(parse(withSenderData(incomingTextNotification, { chatType: undefined }))).not.toBeNull();
    });
  });

  describe('outgoing messages', () => {
    it('parses a message sent from the phone', () => {
      expect(parse(outgoingPhoneNotification)).toEqual({
        type: 'message',
        source: 'outgoing-phone',
        chatId: '10000000',
        idMessage: '1763115400004',
        timestamp: 1763115400000,
        text: 'Sent from my phone',
        senderName: 'Ivan Tsarevich',
        senderPhone: null,
      });
    });

    it('parses a message sent through the API', () => {
      expect(parse(outgoingApiNotification)).toEqual({
        type: 'message',
        source: 'outgoing-api',
        chatId: '10000000',
        idMessage: '1763115500005',
        timestamp: 1763115500000,
        text: 'Sent through the API',
        senderName: 'Ivan Tsarevich',
        senderPhone: null,
      });
    });

    it('takes the recipient name from the chat name, never our own name', () => {
      expect(outgoingPhoneNotification.senderData.senderName).toBe('Vasilisa the Wise');
      expect(parse(outgoingPhoneNotification)).toMatchObject({ senderName: 'Ivan Tsarevich' });
    });

    it('has no recipient phone, because the phone in the sender data is our own', () => {
      expect(outgoingApiNotification.senderData.senderPhoneNumber).toBeGreaterThan(0);
      expect(parse(outgoingApiNotification)).toMatchObject({ senderPhone: null });
    });

    it.each([undefined, '', '  '])('has no name when the chat name is %p, whatever our own name is', (chatName) => {
      const notification = {
        ...outgoingPhoneNotification,
        senderData: { ...outgoingPhoneNotification.senderData, chatName },
      };

      expect(parse(notification)).toMatchObject({ senderName: null });
    });

    it('ignores a message in a group', () => {
      const notification = {
        ...outgoingApiNotification,
        senderData: { ...outgoingApiNotification.senderData, chatId: '-1000000000001', chatType: 'group' },
      };

      expect(parse(notification)).toBeNull();
    });
  });

  describe('messages that are ignored', () => {
    it('ignores a non-text message', () => {
      expect(parse(incomingImageNotification)).toBeNull();
    });

    it.each(['videoMessage', 'audioMessage', 'stickerMessage', 'pollMessage', 'reactionMessage', 'editedMessage'])(
      'ignores a %s',
      (typeMessage) => {
        expect(parse({ ...incomingTextNotification, messageData: { typeMessage } })).toBeNull();
      },
    );

    it('ignores a message in a group', () => {
      expect(parse(incomingGroupNotification)).toBeNull();
    });

    it.each(['bot', 'channel', 'supergroup', 'group', '', null])('ignores the chat type %p', (chatType) => {
      expect(parse(withSenderData(incomingTextNotification, { chatType }))).toBeNull();
    });

    it.each(['-1000000000001', '79998887766@c.us', '12ab', '', ' 1', 10000000, null])(
      'ignores the chat id %p',
      (chatId) => {
        expect(parse(withSenderData(incomingTextNotification, { chatId }))).toBeNull();
      },
    );

    it('ignores a message without a chat id', () => {
      expect(parse(withSenderData(incomingTextNotification, { chatId: undefined }))).toBeNull();
    });

    it.each(['', '   ', '\n\t'])('ignores the text %p', (textMessage) => {
      const notification = {
        ...incomingTextNotification,
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage } },
      };

      expect(parse(notification)).toBeNull();
    });

    it('ignores an extended text that is only whitespace', () => {
      const notification = {
        ...incomingTextNotification,
        messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: '  ' } },
      };

      expect(parse(notification)).toBeNull();
    });

    it.each([
      ['no message id', { idMessage: undefined }],
      ['an empty message id', { idMessage: '' }],
      ['a message id that is a number', { idMessage: 1763115112345 }],
      ['no sender data', { senderData: undefined }],
      ['sender data that is not an object', { senderData: 'Vasilisa' }],
      ['no message data', { messageData: undefined }],
      ['message data that is not an object', { messageData: [] }],
      ['message data without a type', { messageData: { textMessageData: { textMessage: 'Hi' } } }],
      ['a text type without text data', { messageData: { typeMessage: 'textMessage' } }],
      ['text data that is not an object', { messageData: { typeMessage: 'textMessage', textMessageData: 'Hi' } }],
      [
        'text that is not a string',
        { messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 5 } } },
      ],
      [
        'an extended text without the text field',
        { messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { title: 'x' } } },
      ],
      [
        'an extended text type with the plain text field',
        { messageData: { typeMessage: 'extendedTextMessage', textMessageData: { textMessage: 'Hi' } } },
      ],
    ])('ignores a message with %s', (_name, override) => {
      expect(parse({ ...incomingTextNotification, ...override })).toBeNull();
    });
  });

  describe('outgoing message statuses', () => {
    it.each(['sent', 'delivered', 'read'] as const)('parses the status %s', (status) => {
      expect(parse({ ...statusNotification, status })).toEqual({
        type: 'status',
        chatId: '10000000',
        idMessage: '115054445839974415',
        status,
        description: null,
      });
    });

    it('parses a failed status with its description', () => {
      expect(parse(failedStatusNotification)).toEqual({
        type: 'status',
        chatId: '10000000',
        idMessage: '115054445839974415',
        status: 'failed',
        description: 'Telegram rejected the message',
      });
    });

    it('parses noAccount as a failure with the default description', () => {
      expect(parse(noAccountWithIdMessageNotification)).toEqual({
        type: 'status',
        chatId: '10000000',
        idMessage: '115054445839974416',
        status: 'failed',
        description: 'There is no Telegram account for this recipient',
      });
    });

    it('keeps the description of a noAccount status when the body has one', () => {
      expect(parse({ ...noAccountWithIdMessageNotification, description: 'No such user' })).toMatchObject({
        status: 'failed',
        description: 'No such user',
      });
    });

    it.each([undefined, '', '  '])('falls back to the default description of noAccount for %p', (description) => {
      expect(parse({ ...noAccountWithIdMessageNotification, description })).toMatchObject({
        description: 'There is no Telegram account for this recipient',
      });
    });

    it.each([
      ['noAccount', noAccountNotification],
      ['failed', failedWithoutIdMessageNotification],
    ])('ignores the live %s example, which has no message id to match', (_status, notification) => {
      expect(parse(notification)).toBeNull();
    });

    it.each([undefined, '', '  ', 5])('has no description for %p', (description) => {
      expect(parse({ ...failedStatusNotification, description })).toMatchObject({ description: null });
    });

    it.each([undefined, '-1000000000001', '10000000@c.us', 10000000, null])(
      'has no chat id when it is %p',
      (chatId) => {
        expect(parse({ ...statusNotification, chatId })).toMatchObject({ type: 'status', chatId: null });
      },
    );

    it.each([
      ['an unknown status', { status: 'queued' }],
      ['no status', { status: undefined }],
      ['a status that is not a string', { status: 1 }],
      ['no message id', { idMessage: undefined }],
      ['an empty message id', { idMessage: '' }],
    ])('ignores a notification with %s', (_name, override) => {
      expect(parse({ ...statusNotification, ...override })).toBeNull();
    });
  });

  describe('instance state', () => {
    it('parses a state change', () => {
      expect(parse(stateChangedNotification)).toEqual({ type: 'state', stateInstance: 'notAuthorized' });
    });

    it('passes an unknown state through', () => {
      expect(parse({ ...stateChangedNotification, stateInstance: 'somethingNew' })).toEqual({
        type: 'state',
        stateInstance: 'somethingNew',
      });
    });

    it.each([undefined, '', 5, null])('ignores the state %p', (stateInstance) => {
      expect(parse({ ...stateChangedNotification, stateInstance })).toBeNull();
    });
  });

  describe('quota', () => {
    it('parses the description', () => {
      expect(parse(quotaExceededNotification)).toEqual({
        type: 'quota',
        description: quotaExceededNotification.quotaData.description,
      });
    });

    it.each([
      ['no quota data', { quotaData: undefined }],
      ['quota data that is not an object', { quotaData: 'exceeded' }],
      ['quota data without a description', { quotaData: { method: 'SendMessage' } }],
      ['a blank description', { quotaData: { description: '  ' } }],
    ])('has a null description for %s', (_name, override) => {
      expect(parse({ ...quotaExceededNotification, ...override })).toEqual({ type: 'quota', description: null });
    });
  });

  describe('instance check', () => {
    it('accepts a notification of the current instance given as a number', () => {
      expect(parse({ ...incomingTextNotification, instanceData: { idInstance: 4100000000 } })).not.toBeNull();
    });

    it('accepts a notification of the current instance given as a string', () => {
      expect(parse({ ...incomingTextNotification, instanceData: { idInstance: '4100000000' } })).not.toBeNull();
    });

    it('accepts a notification without instance data', () => {
      expect(parse({ ...incomingTextNotification, instanceData: undefined })).not.toBeNull();
    });

    it('accepts instance data without an instance id', () => {
      expect(parse({ ...incomingTextNotification, instanceData: { wid: '79876543210@c.us' } })).not.toBeNull();
    });

    it.each([
      ['another instance', { idInstance: 4100000999 }],
      ['another instance given as a string', { idInstance: '4100000999' }],
      ['an instance id that is not a number or a string', { idInstance: { value: 4100000000 } }],
      ['an instance id that is null', { idInstance: null }],
      ['instance data that is not an object', 'x'],
      ['instance data that is null', null],
    ])('ignores a notification with %s', (_name, instanceData) => {
      for (const notification of [
        incomingTextNotification,
        outgoingPhoneNotification,
        outgoingApiNotification,
        statusNotification,
        stateChangedNotification,
        quotaExceededNotification,
      ]) {
        expect(parse({ ...notification, instanceData })).toBeNull();
      }
    });
  });

  describe('unknown and malformed bodies', () => {
    it('ignores an unknown webhook type', () => {
      expect(parse(unknownTypeNotification)).toBeNull();
    });

    it.each([
      ['without a webhook type', { ...incomingTextNotification, typeWebhook: undefined }],
      ['with a webhook type that is not a string', { ...incomingTextNotification, typeWebhook: 1 }],
      ['with the type in another case', { ...incomingTextNotification, typeWebhook: 'IncomingMessageReceived' }],
      ['that is an empty object', {}],
      ['that is a foreign object', { foo: 1 }],
      ['that is only a type', { typeWebhook: 'incomingMessageReceived' }],
      ['that is null', null],
      ['that is undefined', undefined],
      ['that is a string', 'garbage'],
      ['that is a number', 42],
      ['that is an array', [incomingTextNotification]],
    ])('ignores a body %s', (_name, body) => {
      expect(parse(body)).toBeNull();
    });

    it('never throws on hostile input', () => {
      const hostile = {
        typeWebhook: 'incomingMessageReceived',
        instanceData: 'x',
        idMessage: { toString: () => 'x' },
        senderData: [],
        messageData: () => 'text',
      };

      expect(() => parse(hostile)).not.toThrow();
      expect(parse(hostile)).toBeNull();
    });
  });
});
