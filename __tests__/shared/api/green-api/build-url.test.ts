import { buildUrl } from '@shared/api/green-api/build-url';
import { ENV } from '@shared/config';
import { TEST_CREDENTIALS } from '@shared/test/fixtures/green-api';

const { idInstance, apiTokenInstance } = TEST_CREDENTIALS;

describe('buildUrl', () => {
  it('joins the api url, the instance, the method and the token', () => {
    expect(buildUrl(TEST_CREDENTIALS, 'getStateInstance')).toBe(
      `https://4100.api.green-api.com/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`,
    );
  });

  it('ignores a trailing slash of the api url', () => {
    expect(buildUrl({ ...TEST_CREDENTIALS, apiUrl: 'https://4100.api.green-api.com/' }, 'getStateInstance')).toBe(
      `https://4100.api.green-api.com/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`,
    );
  });

  it('appends a path suffix after the token', () => {
    expect(buildUrl(TEST_CREDENTIALS, 'deleteNotification', { suffix: '1234567' })).toBe(
      `https://4100.api.green-api.com/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/1234567`,
    );
  });

  it('appends a query string', () => {
    expect(buildUrl(TEST_CREDENTIALS, 'receiveNotification', { query: { receiveTimeout: 20 } })).toBe(
      `https://4100.api.green-api.com/waInstance${idInstance}/receiveNotification/${apiTokenInstance}?receiveTimeout=20`,
    );
  });

  it('encodes a token that is not safe for a path segment', () => {
    const url = buildUrl({ ...TEST_CREDENTIALS, apiTokenInstance: 'a/b?c#d' }, 'getStateInstance');

    expect(url).toBe(`https://4100.api.green-api.com/waInstance${idInstance}/getStateInstance/a%2Fb%3Fc%23d`);
  });

  it('uses the same-origin proxy prefix instead of the api url when the proxy is configured', () => {
    jest.replaceProperty(ENV, 'greenApiProxyTarget', 'https://4100.api.green-api.com');

    expect(buildUrl(TEST_CREDENTIALS, 'sendMessage')).toBe(
      `/green-api/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
    );
  });

  it('goes back to the api url once the proxy is not configured', () => {
    expect(buildUrl(TEST_CREDENTIALS, 'sendMessage')).toMatch(/^https:\/\/4100\.api\.green-api\.com\//);
  });
});
