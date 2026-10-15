import {
  incomingGroupNotification,
  noAccountNotification,
  unknownTypeNotification,
} from '@shared/test/fixtures/green-api';

import { PRIMARY_INSTANCE_ID } from './mock-instances';
import type { GreenApiSeed } from './mock-state';
import {
  createIncomingNotification,
  createInstanceData,
  createOutgoingNotification,
  createStateChangedNotification,
} from './notification-factories';

const ALICE = { chatId: '20000001', senderName: 'Alice (mock)', senderPhone: 79990000001 };
const ROW_COUNT = 10;
const SECONDS_PER_ROW = 30;

export const createSeed = (nowMs: number = Date.now()): GreenApiSeed => {
  const idInstance = PRIMARY_INSTANCE_ID;
  const instanceData = createInstanceData(idInstance);
  const nowSeconds = Math.floor(nowMs / 1000);
  const timestampOf = (row: number) => nowSeconds - (ROW_COUNT - row + 1) * SECONDS_PER_ROW;

  const greeting = createIncomingNotification({
    idInstance,
    ...ALICE,
    idMessage: '1763115000000000001',
    text: 'Hi! This chat was created from an incoming message.',
    timestamp: timestampOf(1),
  });

  return {
    [idInstance]: [
      greeting,
      createIncomingNotification({
        idInstance,
        ...ALICE,
        idMessage: '1763115000000000002',
        text: 'A photo',
        typeMessage: 'imageMessage',
        timestamp: timestampOf(2),
      }),
      { ...incomingGroupNotification, instanceData, timestamp: timestampOf(3) },
      { foo: 1 },
      createIncomingNotification({
        idInstance,
        ...ALICE,
        idMessage: '1763115000000000005',
        text: 'Docs: https://green-api.com/en/telegram/docs/',
        typeMessage: 'extendedTextMessage',
        timestamp: timestampOf(5),
      }),
      createStateChangedNotification({ idInstance, stateInstance: 'authorized', timestamp: timestampOf(6) }),
      greeting,
      { ...unknownTypeNotification, instanceData, timestamp: timestampOf(8) },
      { ...noAccountNotification, instanceData, timestamp: timestampOf(9) },
      createOutgoingNotification({
        idInstance,
        chatId: ALICE.chatId,
        recipientName: ALICE.senderName,
        idMessage: '1763115000000000010',
        text: 'Sent from my phone',
        source: 'phone',
        timestamp: timestampOf(10),
      }),
    ],
  };
};
