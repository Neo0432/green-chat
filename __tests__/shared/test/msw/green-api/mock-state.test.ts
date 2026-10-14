import { createGreenApiMockState, type GreenApiMockState } from '@shared/test/msw/green-api';

const FIRST = '4100000001';
const SECOND = '4100000006';

describe('createGreenApiMockState', () => {
  describe('queue', () => {
    it('numbers receipt ids from 1, one step per enqueued notification', () => {
      const state = createGreenApiMockState();

      expect(state.enqueue(FIRST, 'a')).toBe(1);
      expect(state.enqueue(SECOND, 'b')).toBe(2);
      expect(state.enqueue(FIRST, 'c')).toBe(3);
    });

    it('peeks at the head without removing it', () => {
      const state = createGreenApiMockState();
      state.enqueue(FIRST, 'a');
      state.enqueue(FIRST, 'b');

      expect(state.peek(FIRST)).toEqual({ receiptId: 1, body: 'a' });
      expect(state.peek(FIRST)).toEqual({ receiptId: 1, body: 'a' });
      expect(state.getQueueLength(FIRST)).toBe(2);
    });

    it('has no head for an empty queue', () => {
      expect(createGreenApiMockState().peek(FIRST)).toBeUndefined();
    });

    it('serves the notifications first in, first out', () => {
      const state = createGreenApiMockState();
      state.enqueue(FIRST, 'a');
      state.enqueue(FIRST, 'b');

      expect(state.acknowledge(FIRST, 1)).toBe(true);
      expect(state.peek(FIRST)).toEqual({ receiptId: 2, body: 'b' });
    });

    it('removes nothing for a receipt id that is not the head', () => {
      const state = createGreenApiMockState();
      state.enqueue(FIRST, 'a');
      state.enqueue(FIRST, 'b');

      expect(state.acknowledge(FIRST, 2)).toBe(false);
      expect(state.acknowledge(FIRST, 99)).toBe(false);
      expect(state.getQueueLength(FIRST)).toBe(2);
    });

    it('cannot acknowledge the same notification twice', () => {
      const state = createGreenApiMockState();
      state.enqueue(FIRST, 'a');
      state.enqueue(FIRST, 'b');

      state.acknowledge(FIRST, 1);

      expect(state.acknowledge(FIRST, 1)).toBe(false);
      expect(state.getQueueLength(FIRST)).toBe(1);
    });

    it('keeps a queue per instance', () => {
      const state = createGreenApiMockState();
      state.enqueue(FIRST, 'a');

      expect(state.getQueueLength(SECOND)).toBe(0);
      expect(state.acknowledge(SECOND, 1)).toBe(false);
      expect(state.getQueueLength(FIRST)).toBe(1);
    });

    it('fills the queues from the seed in order', () => {
      const state = createGreenApiMockState({ seed: { [FIRST]: ['a', 'b'], [SECOND]: ['c'] } });

      expect(state.getQueueLength(FIRST)).toBe(2);
      expect(state.peek(FIRST)).toEqual({ receiptId: 1, body: 'a' });
      expect(state.peek(SECOND)).toEqual({ receiptId: 3, body: 'c' });
    });
  });

  describe('waitForNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const wait = (state: GreenApiMockState, idInstance: string, timeoutMs: number) => {
      const controller = new AbortController();
      const onSettled = jest.fn();
      void state.waitForNotification(idInstance, { timeoutMs, signal: controller.signal }).then(onSettled);

      return { controller, onSettled };
    };

    it('resolves early when something is enqueued for the instance', async () => {
      const state = createGreenApiMockState();
      const { onSettled } = wait(state, FIRST, 5000);

      await jest.advanceTimersByTimeAsync(1000);
      expect(onSettled).not.toHaveBeenCalled();

      state.enqueue(FIRST, 'a');
      await jest.advanceTimersByTimeAsync(0);

      expect(onSettled).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps waiting when another instance gets a notification', async () => {
      const state = createGreenApiMockState();
      const { onSettled } = wait(state, FIRST, 5000);

      state.enqueue(SECOND, 'a');
      await jest.advanceTimersByTimeAsync(4999);

      expect(onSettled).not.toHaveBeenCalled();
    });

    it('resolves when the time is up', async () => {
      const state = createGreenApiMockState();
      const { onSettled } = wait(state, FIRST, 5000);

      await jest.advanceTimersByTimeAsync(4999);
      expect(onSettled).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      expect(onSettled).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('resolves on abort and leaves no timer behind', async () => {
      const state = createGreenApiMockState();
      const { controller, onSettled } = wait(state, FIRST, 5000);

      controller.abort();
      await jest.advanceTimersByTimeAsync(0);

      expect(onSettled).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('resolves at once for a signal that is already aborted', async () => {
      const state = createGreenApiMockState();

      await state.waitForNotification(FIRST, { timeoutMs: 5000, signal: AbortSignal.abort() });

      expect(jest.getTimerCount()).toBe(0);
    });

    it('wakes every waiter of the instance', async () => {
      const state = createGreenApiMockState();
      const first = wait(state, FIRST, 5000);
      const second = wait(state, FIRST, 5000);

      state.enqueue(FIRST, 'a');
      await jest.advanceTimersByTimeAsync(0);

      expect(first.onSettled).toHaveBeenCalled();
      expect(second.onSettled).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('wakes the waiters of every instance when the mock goes offline', async () => {
      const state = createGreenApiMockState();
      const first = wait(state, FIRST, 5000);
      const second = wait(state, SECOND, 5000);

      state.setOffline(true);
      await jest.advanceTimersByTimeAsync(0);

      expect(first.onSettled).toHaveBeenCalled();
      expect(second.onSettled).toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('instances', () => {
    it('knows the mock instances and nothing else', () => {
      const state = createGreenApiMockState();

      expect(state.getInstance(FIRST)).toEqual({ stateInstance: 'authorized' });
      expect(state.getInstance('4100000007')).toBeUndefined();
    });

    it('overrides the state of one instance only', () => {
      const state = createGreenApiMockState();

      state.setStateInstance(FIRST, 'blocked');

      expect(state.getInstance(FIRST)?.stateInstance).toBe('blocked');
      expect(state.getInstance(SECOND)?.stateInstance).toBe('authorized');
    });

    it('keeps the fault of an instance when its state is overridden', () => {
      const state = createGreenApiMockState();

      state.setStateInstance(SECOND, 'notAuthorized');

      expect(state.getInstance(SECOND)).toEqual({ stateInstance: 'notAuthorized', fault: 'quota-exceeded' });
    });

    it('starts with the primary instance as the active one', () => {
      expect(createGreenApiMockState().activeInstance).toBe(FIRST);
    });
  });

  describe('offline flag', () => {
    it('is off at first and follows setOffline', () => {
      const state = createGreenApiMockState();
      expect(state.isOffline).toBe(false);

      state.setOffline(true);
      expect(state.isOffline).toBe(true);

      state.setOffline(false);
      expect(state.isOffline).toBe(false);
    });
  });

  describe('phones', () => {
    it('derives the chat id from the last 7 digits of the phone', () => {
      const state = createGreenApiMockState();

      expect(state.registerPhone('79001234567')).toBe('11234567');
      expect(state.registerPhone('12345678')).toBe('12345678');
    });

    it('uses a short phone as it is', () => {
      expect(createGreenApiMockState().registerPhone('123')).toBe('10000123');
    });

    it('remembers which phone a chat id came from', () => {
      const state = createGreenApiMockState();

      state.registerPhone('79001234567');

      expect(state.getPhone('11234567')).toBe('79001234567');
      expect(state.getPhone('19999999')).toBeNull();
    });
  });

  describe('consumeFailOnce', () => {
    it('is true the first time a key is seen and false after that', () => {
      const state = createGreenApiMockState();

      expect(state.consumeFailOnce('a')).toBe(true);
      expect(state.consumeFailOnce('a')).toBe(false);
      expect(state.consumeFailOnce('b')).toBe(true);
    });
  });

  describe('createMessageId', () => {
    it('makes unique 19-digit ids, also within one millisecond', () => {
      const state = createGreenApiMockState();
      const ids = Array.from({ length: 50 }, () => state.createMessageId());

      expect(new Set(ids).size).toBe(50);
      expect(ids.every((id) => /^\d{19}$/.test(id))).toBe(true);
    });
  });
});
