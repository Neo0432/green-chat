import { handleAuthError, sessionActions } from '@entities/session';

import { GreenApiError } from '@shared/api/green-api';

describe('handleAuthError', () => {
  it.each([401, 403])('signs the user out on HTTP %i and reports the error as handled', (status) => {
    const dispatch = jest.fn();

    expect(handleAuthError(dispatch, new GreenApiError({ kind: 'http', status }))).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(sessionActions.forcedSignOut());
  });

  it.each([
    ['an HTTP 500', new GreenApiError({ kind: 'http', status: 500 })],
    ['a network error', new GreenApiError({ kind: 'network' })],
    ['a plain Error', new Error('boom')],
  ])('leaves %s alone and reports it as not handled', (_name, error) => {
    const dispatch = jest.fn();

    expect(handleAuthError(dispatch, error)).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
