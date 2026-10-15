class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  onchange = null;

  constructor(
    readonly media: string,
    private readonly getMatches: () => boolean,
  ) {
    super();
  }

  get matches() {
    return this.getMatches();
  }

  addListener = () => undefined;

  removeListener = () => undefined;
}

export const mockMatchMedia = (initialMatches = false) => {
  let isMatching = initialMatches;
  const lists = new Set<FakeMediaQueryList>();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string) => {
      const list = new FakeMediaQueryList(media, () => isMatching);

      lists.add(list);

      return list;
    },
  });

  return {
    setMatches: (matches: boolean) => {
      isMatching = matches;
      lists.forEach((list) => list.dispatchEvent(new Event('change')));
    },
  };
};
