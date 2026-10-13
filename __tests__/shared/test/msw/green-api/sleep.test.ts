import { sleep } from '@shared/test/msw/green-api/sleep';

describe('sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves true once the time has passed', async () => {
    const onSettled = jest.fn();
    void sleep(1000, new AbortController().signal).then(onSettled);

    await jest.advanceTimersByTimeAsync(999);
    expect(onSettled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(onSettled).toHaveBeenCalledWith(true);
  });

  it('resolves false and drops its timer when the signal aborts', async () => {
    const controller = new AbortController();
    const onSettled = jest.fn();
    void sleep(1000, controller.signal).then(onSettled);

    controller.abort();
    await jest.advanceTimersByTimeAsync(0);

    expect(onSettled).toHaveBeenCalledWith(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves false at once when the signal is already aborted', async () => {
    await expect(sleep(1000, AbortSignal.abort())).resolves.toBe(false);

    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves true without a timer for a zero delay', async () => {
    await expect(sleep(0, new AbortController().signal)).resolves.toBe(true);

    expect(jest.getTimerCount()).toBe(0);
  });

  it('removes its abort listener once the time has passed', async () => {
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');

    const finished = sleep(10, controller.signal);
    await jest.advanceTimersByTimeAsync(10);
    await finished;

    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
