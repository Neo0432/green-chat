import { act, renderHook } from '@testing-library/react';

import { matchesMedia, useMediaQuery } from '@shared/lib';
import { mockMatchMedia } from '@shared/test/mock-match-media';

const QUERY = '(width < 600px)';

describe('useMediaQuery', () => {
  it('returns whether the query matches now', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery(QUERY));

    expect(result.current).toBe(true);
  });

  it('returns false when the query does not match', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery(QUERY));

    expect(result.current).toBe(false);
  });

  it('follows the window across the breakpoint', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(QUERY));

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);

    act(() => media.setMatches(false));

    expect(result.current).toBe(false);
  });

  it('stops listening when the component unmounts', () => {
    const mediaQueryList = window.matchMedia(QUERY);
    jest.spyOn(window, 'matchMedia').mockReturnValue(mediaQueryList);
    const add = jest.spyOn(mediaQueryList, 'addEventListener');
    const remove = jest.spyOn(mediaQueryList, 'removeEventListener');
    const { unmount } = renderHook(() => useMediaQuery(QUERY));

    expect(add).toHaveBeenCalledTimes(1);

    unmount();

    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
  });
});

describe('matchesMedia', () => {
  it('reads the current state of the query', () => {
    const media = mockMatchMedia(false);

    expect(matchesMedia(QUERY)).toBe(false);

    media.setMatches(true);

    expect(matchesMedia(QUERY)).toBe(true);
  });
});
