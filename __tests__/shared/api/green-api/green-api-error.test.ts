import { GreenApiError, isAuthError, isGreenApiError, isQuotaError, isWebhookUrlError } from '@shared/api/green-api';

const httpError = (status: number, serverMessage?: string) =>
  new GreenApiError({ kind: 'http', status, serverMessage });

describe('GreenApiError', () => {
  it('carries the kind, the status and the server message', () => {
    const error = new GreenApiError({ kind: 'http', status: 400, serverMessage: 'Validation failed' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'GreenApiError',
      kind: 'http',
      status: 400,
      serverMessage: 'Validation failed',
      message: 'GREEN-API responded with HTTP 400: Validation failed',
    });
  });

  it('omits the server message from the text when there is none', () => {
    expect(httpError(502).message).toBe('GREEN-API responded with HTTP 502');
  });

  it.each([
    ['network', 'GREEN-API is unreachable'],
    ['timeout', 'GREEN-API did not respond in time'],
    ['parse', 'Unexpected response from GREEN-API'],
    ['aborted', 'Request to GREEN-API was aborted'],
  ] as const)('describes a %s error', (kind, message) => {
    const error = new GreenApiError({ kind });

    expect(error.message).toBe(message);
    expect(error.status).toBeUndefined();
    expect(error.serverMessage).toBeUndefined();
  });

  it('prefers an explicit message', () => {
    expect(new GreenApiError({ kind: 'parse', message: 'Unexpected sendMessage response' }).message).toBe(
      'Unexpected sendMessage response',
    );
  });
});

describe('isGreenApiError', () => {
  it('recognizes only GreenApiError instances', () => {
    expect(isGreenApiError(httpError(500))).toBe(true);
    expect(isGreenApiError(new Error('x'))).toBe(false);
    expect(isGreenApiError({ kind: 'http', status: 401 })).toBe(false);
    expect(isGreenApiError(null)).toBe(false);
  });
});

describe('isAuthError', () => {
  it.each([401, 403])('is true for HTTP %i', (status) => {
    expect(isAuthError(httpError(status))).toBe(true);
  });

  it('is false for other statuses, other kinds and foreign values', () => {
    expect(isAuthError(httpError(400))).toBe(false);
    expect(isAuthError(httpError(404))).toBe(false);
    expect(isAuthError(new GreenApiError({ kind: 'network' }))).toBe(false);
    expect(isAuthError(new Error('401'))).toBe(false);
  });
});

describe('isQuotaError', () => {
  it('is true for HTTP 466 only', () => {
    expect(isQuotaError(httpError(466))).toBe(true);
    expect(isQuotaError(httpError(469))).toBe(false);
    expect(isQuotaError(new GreenApiError({ kind: 'timeout' }))).toBe(false);
  });
});

describe('isWebhookUrlError', () => {
  it('is true for a 400 that mentions the webhook url', () => {
    const message = 'Message cannot be received because custom webhook url is set. Go to cabinet';

    expect(isWebhookUrlError(httpError(400, message))).toBe(true);
    expect(isWebhookUrlError(httpError(400, 'Custom Webhook URL is set'))).toBe(true);
  });

  it('is false for other 400 errors, other statuses and a missing message', () => {
    expect(isWebhookUrlError(httpError(400, 'Validation failed'))).toBe(false);
    expect(isWebhookUrlError(httpError(400))).toBe(false);
    expect(isWebhookUrlError(httpError(500, 'webhook url'))).toBe(false);
  });
});

describe('error guards used one after another', () => {
  // Compiles only while each guard narrows no further than its own check: otherwise `error` becomes `never`.
  const classify = (error: unknown) => {
    if (!isGreenApiError(error)) {
      return 'foreign';
    }

    if (isAuthError(error)) {
      return `auth ${error.status}`;
    }

    if (isWebhookUrlError(error)) {
      return `webhook ${error.status}`;
    }

    if (isQuotaError(error)) {
      return `quota ${error.status}`;
    }

    return `${error.kind} ${error.status}`;
  };

  it('tells every kind of error apart in a chain', () => {
    expect(classify(httpError(401))).toBe('auth 401');
    expect(classify(httpError(403))).toBe('auth 403');
    expect(classify(httpError(400, 'custom webhook url is set'))).toBe('webhook 400');
    expect(classify(httpError(466))).toBe('quota 466');
    expect(classify(httpError(500))).toBe('http 500');
    expect(classify(httpError(400, 'Validation failed'))).toBe('http 400');
    expect(classify(new GreenApiError({ kind: 'network' }))).toBe('network undefined');
    expect(classify(new Error('x'))).toBe('foreign');
  });
});
