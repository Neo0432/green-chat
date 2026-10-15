import type { StateInstance } from '@shared/api/green-api';

import { MOCK_INSTANCES, type MockInstance, PRIMARY_INSTANCE_ID } from './mock-instances';
import { sleep } from './sleep';

export type GreenApiSeed = Readonly<Record<string, readonly unknown[]>>;

interface QueuedNotification {
  receiptId: number;
  body: unknown;
}

interface WaitOptions {
  timeoutMs: number;
  signal: AbortSignal;
}

interface Waiter {
  idInstance: string;
  wake: () => void;
}

export interface GreenApiMockState {
  readonly activeInstance: string;
  setActiveInstance: (idInstance: string) => void;
  readonly isOffline: boolean;
  setOffline: (isOffline: boolean) => void;
  getInstance: (idInstance: string) => MockInstance | undefined;
  setStateInstance: (idInstance: string, stateInstance: StateInstance) => void;
  enqueue: (idInstance: string, body: unknown) => number;
  peek: (idInstance: string) => QueuedNotification | undefined;
  acknowledge: (idInstance: string, receiptId: number) => boolean;
  getQueueLength: (idInstance: string) => number;
  waitForNotification: (idInstance: string, options: WaitOptions) => Promise<void>;
  registerPhone: (phone: string) => string;
  getPhone: (chatId: string) => string | null;
  consumeFailOnce: (key: string) => boolean;
  createMessageId: () => string;
}

const CHAT_ID_BASE = 10_000_000;
const PHONE_DIGITS_IN_CHAT_ID = 7;
const MESSAGE_COUNTER_DIGITS = 6;

export const createGreenApiMockState = ({ seed = {} }: { seed?: GreenApiSeed } = {}): GreenApiMockState => {
  const queues = new Map<string, QueuedNotification[]>();
  const waiters = new Set<Waiter>();
  const stateOverrides = new Map<string, StateInstance>();
  const phones = new Map<string, string>();
  const failedOnce = new Set<string>();
  let nextReceiptId = 1;
  let messageCounter = 0;
  let isOffline = false;
  let activeInstance = PRIMARY_INSTANCE_ID;

  const getQueue = (idInstance: string) => {
    const existing = queues.get(idInstance);

    if (existing) {
      return existing;
    }

    const created: QueuedNotification[] = [];
    queues.set(idInstance, created);

    return created;
  };

  const enqueue = (idInstance: string, body: unknown) => {
    const receiptId = nextReceiptId;
    nextReceiptId += 1;
    getQueue(idInstance).push({ receiptId, body });

    for (const waiter of waiters) {
      if (waiter.idInstance === idInstance) {
        waiter.wake();
      }
    }

    return receiptId;
  };

  for (const [idInstance, bodies] of Object.entries(seed)) {
    for (const body of bodies) {
      enqueue(idInstance, body);
    }
  }

  return {
    get activeInstance() {
      return activeInstance;
    },

    setActiveInstance: (idInstance) => {
      activeInstance = idInstance;
    },

    get isOffline() {
      return isOffline;
    },

    setOffline: (nextIsOffline) => {
      isOffline = nextIsOffline;

      for (const waiter of waiters) {
        waiter.wake();
      }
    },

    getInstance: (idInstance) => {
      const instance = MOCK_INSTANCES.get(idInstance);
      const stateInstance = stateOverrides.get(idInstance);

      return instance && stateInstance ? { ...instance, stateInstance } : instance;
    },

    setStateInstance: (idInstance, stateInstance) => {
      stateOverrides.set(idInstance, stateInstance);
    },

    enqueue,

    peek: (idInstance) => getQueue(idInstance).at(0),

    acknowledge: (idInstance, receiptId) => {
      const queue = getQueue(idInstance);

      if (queue.at(0)?.receiptId !== receiptId) {
        return false;
      }

      queue.shift();

      return true;
    },

    getQueueLength: (idInstance) => getQueue(idInstance).length,

    waitForNotification: async (idInstance, { timeoutMs, signal }) => {
      const wakeUp = new AbortController();
      const waiter: Waiter = {
        idInstance,
        wake: () => {
          wakeUp.abort();
        },
      };

      waiters.add(waiter);
      await sleep(timeoutMs, AbortSignal.any([signal, wakeUp.signal]));
      waiters.delete(waiter);
    },

    registerPhone: (phone) => {
      const chatId = String(CHAT_ID_BASE + Number(phone.slice(-PHONE_DIGITS_IN_CHAT_ID)));
      phones.set(chatId, phone);

      return chatId;
    },

    getPhone: (chatId) => phones.get(chatId) ?? null,

    consumeFailOnce: (key) => {
      const isFirstAttempt = !failedOnce.has(key);
      failedOnce.add(key);

      return isFirstAttempt;
    },

    createMessageId: () => {
      messageCounter += 1;

      return `${Date.now()}${String(messageCounter).padStart(MESSAGE_COUNTER_DIGITS, '0')}`;
    },
  };
};
