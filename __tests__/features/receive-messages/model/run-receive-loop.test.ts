import { type ReceiveLoopDeps, runReceiveLoop } from '@features/receive-messages/model/run-receive-loop';

import { GreenApiError, isAuthError, type ReceivedNotification } from '@shared/api/green-api';

const NOTIFICATION: ReceivedNotification = { receiptId: 7, body: { typeWebhook: 'incomingCall' } };

const createNetworkError = () => new GreenApiError({ kind: 'network' });

const createDeps = () => ({
  receive: jest.fn<Promise<ReceivedNotification | null>, [signal: AbortSignal]>(),
  remove: jest.fn((_receiptId: number, _signal: AbortSignal) => Promise.resolve({ result: true })),
  onNotification: jest.fn<void, [body: unknown]>(),
  onFailure: jest.fn<void, [error: unknown, failureCount: number]>(),
  onRecovered: jest.fn<void, []>(),
  handleAuthError: jest.fn(isAuthError),
});

type DepMocks = ReturnType<typeof createDeps>;

const hangUntilAborted: ReceiveLoopDeps['receive'] = (signal) =>
  new Promise((_resolve, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        reject(new GreenApiError({ kind: 'aborted' }));
      },
      { once: true },
    );
  });

const start = (deps: DepMocks) => {
  const controller = new AbortController();
  const done = runReceiveLoop(deps, controller.signal);

  return { controller, done };
};

const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

describe('runReceiveLoop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('processes a notification, deletes it by its receiptId and polls again (FR-4.2)', async () => {
    const deps = createDeps();
    deps.receive.mockResolvedValueOnce(NOTIFICATION).mockImplementation(hangUntilAborted);

    const { controller, done } = start(deps);
    await advance(0);

    expect(deps.onNotification).toHaveBeenCalledWith(NOTIFICATION.body);
    expect(deps.remove).toHaveBeenCalledWith(7, controller.signal);
    expect(deps.onNotification.mock.invocationCallOrder[0]).toBeLessThan(deps.remove.mock.invocationCallOrder[0]);
    expect(deps.receive).toHaveBeenCalledTimes(2);

    controller.abort();
    await done;
  });

  it('deletes the notification even when processing it throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const deps = createDeps();
    deps.receive.mockResolvedValueOnce(NOTIFICATION).mockImplementation(hangUntilAborted);
    deps.onNotification.mockImplementation(() => {
      throw new Error('boom');
    });

    const { controller, done } = start(deps);
    await advance(0);

    expect(deps.remove).toHaveBeenCalledWith(7, controller.signal);

    controller.abort();
    await done;
  });

  it('goes on when the delete fails: the notification comes back and is received again', async () => {
    const deps = createDeps();
    deps.receive
      .mockResolvedValueOnce(NOTIFICATION)
      .mockResolvedValueOnce(NOTIFICATION)
      .mockImplementation(hangUntilAborted);
    deps.remove.mockRejectedValueOnce(createNetworkError());

    const { controller, done } = start(deps);
    await advance(0);

    expect(deps.receive).toHaveBeenCalledTimes(1);

    await advance(1_000);

    expect(deps.receive).toHaveBeenCalledTimes(3);
    expect(deps.onNotification).toHaveBeenCalledTimes(2);
    expect(deps.remove).toHaveBeenCalledTimes(2);
    expect(deps.onFailure).not.toHaveBeenCalled();

    controller.abort();
    await done;
  });

  describe('an empty queue', () => {
    it('is polled again after the minimum interval when the answer came at once', async () => {
      const deps = createDeps();
      deps.receive.mockResolvedValue(null);

      const { controller, done } = start(deps);
      await advance(0);

      expect(deps.receive).toHaveBeenCalledTimes(1);

      await advance(999);

      expect(deps.receive).toHaveBeenCalledTimes(1);

      await advance(1);

      expect(deps.receive).toHaveBeenCalledTimes(2);
      expect(deps.onNotification).not.toHaveBeenCalled();
      expect(deps.remove).not.toHaveBeenCalled();

      controller.abort();
      await done;
    });

    it('is polled again at once when the server held the request for a while', async () => {
      const deps = createDeps();
      deps.receive
        .mockImplementationOnce(() => {
          jest.setSystemTime(Date.now() + 20_000);

          return Promise.resolve(null);
        })
        .mockImplementation(hangUntilAborted);

      const { controller, done } = start(deps);
      await advance(0);

      expect(deps.receive).toHaveBeenCalledTimes(2);

      controller.abort();
      await done;
    });
  });

  describe('a failed poll', () => {
    it('backs off 1, 2 and 4 s, and starts over from 1 s after a poll that worked (FR-4.3)', async () => {
      const deps = createDeps();
      const [first, second, third, fifth] = [
        createNetworkError(),
        new GreenApiError({ kind: 'http', status: 500 }),
        new GreenApiError({ kind: 'parse' }),
        createNetworkError(),
      ];
      deps.receive
        .mockRejectedValueOnce(first)
        .mockRejectedValueOnce(second)
        .mockRejectedValueOnce(third)
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(fifth)
        .mockImplementation(hangUntilAborted);

      const { controller, done } = start(deps);
      await advance(0);

      expect(deps.receive).toHaveBeenCalledTimes(1);
      expect(deps.onFailure).toHaveBeenCalledTimes(1);
      expect(deps.onFailure).toHaveBeenLastCalledWith(first, 1);

      await advance(999);

      expect(deps.receive).toHaveBeenCalledTimes(1);

      await advance(1);

      expect(deps.receive).toHaveBeenCalledTimes(2);
      expect(deps.onFailure).toHaveBeenLastCalledWith(second, 2);

      await advance(1_999);

      expect(deps.receive).toHaveBeenCalledTimes(2);

      await advance(1);

      expect(deps.receive).toHaveBeenCalledTimes(3);
      expect(deps.onFailure).toHaveBeenLastCalledWith(third, 3);

      await advance(3_999);

      expect(deps.receive).toHaveBeenCalledTimes(3);
      expect(deps.onRecovered).not.toHaveBeenCalled();

      await advance(1);

      expect(deps.receive).toHaveBeenCalledTimes(4);
      expect(deps.onRecovered).toHaveBeenCalledTimes(1);

      await advance(1_000);

      expect(deps.receive).toHaveBeenCalledTimes(5);
      expect(deps.onFailure).toHaveBeenCalledTimes(4);
      expect(deps.onFailure).toHaveBeenLastCalledWith(fifth, 1);

      await advance(999);

      expect(deps.receive).toHaveBeenCalledTimes(5);

      await advance(1);

      expect(deps.receive).toHaveBeenCalledTimes(6);

      controller.abort();
      await done;
    });

    it('reports the error to onFailure, and recovery only once', async () => {
      const deps = createDeps();
      const error = new GreenApiError({ kind: 'http', status: 400, serverMessage: 'custom webhook url is set' });
      deps.receive
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockImplementation(hangUntilAborted);

      const { controller, done } = start(deps);
      await advance(10_000);

      expect(deps.onFailure).toHaveBeenCalledWith(error, 1);
      expect(deps.onRecovered).toHaveBeenCalledTimes(1);

      controller.abort();
      await done;
    });
  });

  it('stops and leaves the sign-out to handleAuthError when the session is rejected (401)', async () => {
    const deps = createDeps();
    const error = new GreenApiError({ kind: 'http', status: 401 });
    deps.receive.mockRejectedValueOnce(error);

    const { done } = start(deps);
    await done;

    expect(deps.handleAuthError).toHaveBeenCalledWith(error);
    expect(deps.onFailure).not.toHaveBeenCalled();
    expect(deps.receive).toHaveBeenCalledTimes(1);
  });

  it('exits quietly when aborted during a request', async () => {
    const deps = createDeps();
    deps.receive.mockImplementation(hangUntilAborted);

    const { controller, done } = start(deps);
    await advance(0);
    controller.abort();
    await done;

    expect(deps.handleAuthError).not.toHaveBeenCalled();
    expect(deps.onFailure).not.toHaveBeenCalled();
    expect(deps.receive).toHaveBeenCalledTimes(1);
  });

  it('exits at once when aborted while waiting to retry', async () => {
    const deps = createDeps();
    deps.receive.mockRejectedValue(createNetworkError());

    const { controller, done } = start(deps);
    await advance(0);
    controller.abort();
    await done;

    expect(deps.receive).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not process a notification that arrives after the abort', async () => {
    const deps = createDeps();
    const controller = new AbortController();
    deps.receive.mockImplementation(() => {
      controller.abort();

      return Promise.resolve(NOTIFICATION);
    });

    await runReceiveLoop(deps, controller.signal);

    expect(deps.onNotification).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it('never has two receives in flight', async () => {
    const deps = createDeps();
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;
    deps.receive.mockImplementation(async (signal) => {
      calls += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;

      if (calls <= 3) {
        return NOTIFICATION;
      }

      return hangUntilAborted(signal);
    });

    const { controller, done } = start(deps);
    await advance(10_000);

    expect(calls).toBe(4);
    expect(maxInFlight).toBe(1);

    controller.abort();
    await done;
  });
});
