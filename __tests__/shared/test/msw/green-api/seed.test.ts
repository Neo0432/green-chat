import { parseNotification } from '@shared/api/green-api';
import { isPlainObject } from '@shared/lib';
import { createGreenApiMockState, createSeed, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';

const NOW_MS = Date.parse('2026-10-12T12:00:00Z');

const getRows = (nowMs = NOW_MS) => createSeed(nowMs)[PRIMARY_INSTANCE_ID] ?? [];

const readField = (row: unknown, key: string) => (isPlainObject(row) ? row[key] : undefined);

const parseRow = (row: number) => parseNotification(getRows().at(row - 1), PRIMARY_INSTANCE_ID);

describe('createSeed', () => {
  it('fills the queue of the primary instance only', () => {
    expect(Object.keys(createSeed(NOW_MS))).toEqual([PRIMARY_INSTANCE_ID]);
  });

  it('has the 10 rows of MK-9', () => {
    expect(getRows()).toHaveLength(10);
  });

  it('numbers the rows from receipt id 1', () => {
    const state = createGreenApiMockState({ seed: createSeed(NOW_MS) });

    expect(state.getQueueLength(PRIMARY_INSTANCE_ID)).toBe(10);
    expect(state.peek(PRIMARY_INSTANCE_ID)?.receiptId).toBe(1);
  });

  it('1: Alice writes a text, which creates her chat', () => {
    expect(parseRow(1)).toMatchObject({
      type: 'message',
      source: 'incoming',
      chatId: '20000001',
      idMessage: '1763115000000000001',
      text: 'Hi! This chat was created from an incoming message.',
      senderName: 'Alice (mock)',
      senderPhone: '79990000001',
    });
  });

  it('2: an image of the same chat is ignored for being a file', () => {
    expect(getRows().at(1)).toMatchObject({ messageData: { typeMessage: 'imageMessage' } });
    expect(parseRow(2)).toBeNull();
  });

  it('3: a supergroup text is ignored for being a group', () => {
    expect(getRows().at(2)).toMatchObject({
      typeWebhook: 'incomingMessageReceived',
      senderData: { chatId: '-1000000000001', chatType: 'supergroup' },
      messageData: { typeMessage: 'textMessage' },
    });
    expect(parseRow(3)).toBeNull();
  });

  it('4: a malformed body is ignored', () => {
    expect(getRows().at(3)).toEqual({ foo: 1 });
    expect(parseRow(4)).toBeNull();
  });

  it('5: a link text of the same chat is shown as plain text', () => {
    expect(getRows().at(4)).toMatchObject({ messageData: { typeMessage: 'extendedTextMessage' } });
    expect(parseRow(5)).toMatchObject({
      type: 'message',
      source: 'incoming',
      chatId: '20000001',
      text: 'Docs: https://green-api.com/en/telegram/docs/',
    });
  });

  it('6: the instance is reported authorized', () => {
    expect(parseRow(6)).toEqual({ type: 'state', stateInstance: 'authorized' });
  });

  it('7: row 1 comes again, as the same notification', () => {
    expect(getRows().at(6)).toEqual(getRows().at(0));
    expect(parseRow(7)).toEqual(parseRow(1));
  });

  it('8: an incoming call is ignored for being an unknown type', () => {
    expect(getRows().at(7)).toMatchObject({ typeWebhook: 'incomingCall' });
    expect(parseRow(8)).toBeNull();
  });

  it('9: a noAccount status without an idMessage is ignored', () => {
    const row = getRows().at(8);

    expect(row).toMatchObject({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '77777777777@c.us',
      status: 'noAccount',
      sendByApi: true,
    });
    expect(row).not.toHaveProperty('idMessage');
    expect(parseRow(9)).toBeNull();
  });

  it('10: a message from the phone to Alice, with the live outgoing semantics', () => {
    expect(parseRow(10)).toMatchObject({
      type: 'message',
      source: 'outgoing-phone',
      chatId: '20000001',
      text: 'Sent from my phone',
      senderName: 'Alice (mock)',
      senderPhone: null,
    });
    expect(getRows().at(9)).toMatchObject({
      senderData: {
        chatName: 'Alice (mock)',
        sender: '20000000',
        senderName: 'Me (mock)',
        senderPhoneNumber: 79876543210,
      },
    });
  });

  it('addresses every row to the primary instance, except the malformed one', () => {
    for (const row of getRows().filter((_row, index) => index !== 3)) {
      expect(row).toMatchObject({ instanceData: { idInstance: 4100000001 } });
    }
  });

  it('keeps the idMessages fixed', () => {
    const idMessages = (rows: readonly unknown[]) => rows.map((row) => readField(row, 'idMessage'));

    expect(idMessages(getRows(NOW_MS + 60_000))).toEqual(idMessages(getRows()));
  });

  it('dates the rows 30 seconds apart, the last one 30 seconds before now', () => {
    const timestampOf = (row: number) => readField(getRows().at(row - 1), 'timestamp');
    const nowSeconds = NOW_MS / 1000;

    expect(timestampOf(1)).toBe(nowSeconds - 300);
    expect(timestampOf(5)).toBe(nowSeconds - 180);
    expect(timestampOf(10)).toBe(nowSeconds - 30);
  });
});
