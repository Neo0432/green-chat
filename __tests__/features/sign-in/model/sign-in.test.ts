import { http, HttpResponse } from 'msw';

import { createAppStore } from '@app/store';

import { getSignInErrorMessage } from '@features/sign-in/lib/get-sign-in-error-message';
import { signIn } from '@features/sign-in/model/sign-in';

import { buildTestUrl, TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';
import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials } from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';

const signInWith = async (credentials = createMockCredentials()) => {
  const store = createAppStore({});
  const result = await store.dispatch(signIn(credentials)).unwrap();
  const message = result.ok ? null : getSignInErrorMessage(result.failure, credentials.apiUrl);

  return { store, result, message };
};

describe('signIn', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  it('signs in and saves the credentials when the instance is authorized', async () => {
    const credentials = createMockCredentials();

    const { store, result } = await signInWith(credentials);

    expect(result).toEqual({ ok: true });
    expect(store.getState().session).toEqual({ credentials, instanceState: 'authorized', forcedSignOut: null });
    expect(window.localStorage.getItem('green-chat:v1:credentials')).toBe(JSON.stringify(credentials));
  });

  it.each([
    ['4100000002', 'notAuthorized'],
    ['4100000003', 'starting'],
    ['4100000004', 'blocked'],
  ])('stays signed out for %s, which is %s (AC-3)', async (idInstance, stateInstance) => {
    const { store, result } = await signInWith(createMockCredentials(idInstance));

    expect(result).toEqual({ ok: false, failure: { reason: 'instance-not-authorized', stateInstance } });
    expect(store.getState().session.credentials).toBeNull();
    expect(window.localStorage).toHaveLength(0);
  });

  it('reports a wrong token as "Wrong API token." (AC-2)', async () => {
    const { store, result, message } = await signInWith(createMockCredentials('4100000001', 'wrong'));

    expect(result).toMatchObject({ ok: false, failure: { errorKind: 'http', status: 401 } });
    expect(message).toBe('Wrong API token.');
    expect(store.getState().session).toMatchObject({ credentials: null, forcedSignOut: null });
  });

  it('reports a 403, which only a client outside a browser gets', async () => {
    server.use(http.get(buildTestUrl('getStateInstance'), () => new HttpResponse(null, { status: 403 })));

    const { message } = await signInWith(TEST_CREDENTIALS);

    expect(message).toBe('Wrong Instance ID or API URL.');
  });

  it('reports an unreachable GREEN-API with the API URL it tried (AC-4)', async () => {
    const { result, message } = await signInWith(createMockCredentials('4100000009'));

    expect(result).toMatchObject({ ok: false, failure: { errorKind: 'network' } });
    expect(message).toBe(
      "Can't reach GREEN-API at https://4100.api.green-api.com. Check the Instance ID, the API URL and your connection.",
    );
  });

  it('reports an Instance ID that does not match the API URL host as a network error, like the browser sees the real 403', async () => {
    const credentials = { ...createMockCredentials('4100000001'), apiUrl: 'https://7103.api.green-api.com' };

    const { result, message } = await signInWith(credentials);

    expect(result).toMatchObject({ ok: false, failure: { errorKind: 'network' } });
    expect(message).toContain("Can't reach GREEN-API at https://7103.api.green-api.com.");
  });

  it('reports a 502 from GREEN-API', async () => {
    const { message } = await signInWith(createMockCredentials('4100000008'));

    expect(message).toBe('GREEN-API is unavailable (HTTP 502). Try again later.');
  });
});
