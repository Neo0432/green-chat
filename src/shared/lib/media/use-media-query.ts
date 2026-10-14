import { useCallback, useSyncExternalStore } from 'react';

export const matchesMedia = (query: string) => window.matchMedia(query).matches;

export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);

      mediaQueryList.addEventListener('change', onChange);

      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(subscribe, () => matchesMedia(query));
};
