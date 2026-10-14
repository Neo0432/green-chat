/** jsdom has no `ResizeObserver`. `resize` tells every observer that is watching, like an element that changed size. */
export const mockResizeObserver = () => {
  const watchers = new Set<FakeResizeObserver>();

  class FakeResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}

    observe = () => {
      watchers.add(this);
    };

    unobserve = () => {
      watchers.delete(this);
    };

    disconnect = () => {
      watchers.delete(this);
    };

    notify = () => {
      this.callback([], this);
    };
  }

  Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: FakeResizeObserver });

  return {
    resize: () => {
      watchers.forEach((watcher) => {
        watcher.notify();
      });
    },
  };
};
