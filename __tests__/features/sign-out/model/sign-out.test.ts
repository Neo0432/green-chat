import { createAppStore } from '@app/store';

import { signOut } from '@features/sign-out/model/sign-out';

import { createMockCredentials } from '@shared/test/msw/green-api';

describe('signOut', () => {
  it('signs out and removes every green-chat key, leaving the keys of other apps untouched (FR-1.8)', () => {
    const store = createAppStore({
      session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
    });
    window.localStorage.setItem('green-chat:v1:credentials', '{}');
    window.localStorage.setItem('green-chat:v1:data:4100000001', '{}');
    window.localStorage.setItem('theme', 'dark');

    store.dispatch(signOut());

    expect(store.getState().session).toEqual({ credentials: null, instanceState: null, forcedSignOut: null });
    expect(Object.keys(window.localStorage)).toEqual(['theme']);
  });
});
