import { toServerMessage } from '@shared/api/green-api/server-message';

const token = 'secretToken123';

const fromJson = (body: unknown) => toServerMessage(JSON.stringify(body), token);

describe('toServerMessage', () => {
  describe('plain text', () => {
    it('returns the body as is', () => {
      expect(toServerMessage('Bad Gateway', token)).toBe('Bad Gateway');
    });

    it('trims the text', () => {
      expect(toServerMessage('  Forbidden\n', token)).toBe('Forbidden');
    });

    it('returns an empty string for an empty body', () => {
      expect(toServerMessage('', token)).toBe('');
    });

    it('keeps the text of a JSON value that is not an object', () => {
      expect(toServerMessage('null', token)).toBe('null');
      expect(toServerMessage('"text"', token)).toBe('"text"');
      expect(toServerMessage('[{"reason":"x"}]', token)).toBe('[{"reason":"x"}]');
    });
  });

  describe('JSON bodies', () => {
    it('reads the reason (CheckAccount 469 and 500)', () => {
      expect(fromJson({ status: false, reason: 'Rate limited by messenger' })).toBe('Rate limited by messenger');
      expect(fromJson({ status: false, reason: 'Messenger is temporarily unavailable' })).toBe(
        'Messenger is temporarily unavailable',
      );
    });

    it('reads the reason of a DeleteNotification body', () => {
      expect(fromJson({ result: false, reason: 'notification not found' })).toBe('notification not found');
    });

    it('reads the message', () => {
      expect(fromJson({ message: 'Validation failed' })).toBe('Validation failed');
    });

    it('reads the description', () => {
      expect(fromJson({ description: 'Quota exceeded' })).toBe('Quota exceeded');
    });

    it.each(['invokeStatus', 'correspondentsStatus', 'quotaData'])(
      'reads the description nested in %s (466)',
      (key) => {
        const body = {
          [key]: { method: 'checkAccount', used: 100, total: 100, description: 'Monthly quota exceeded' },
        };

        expect(fromJson(body)).toBe('Monthly quota exceeded');
      },
    );

    it('reads the description of a quotaExceeded-shaped 466 body', () => {
      const body = {
        typeWebhook: 'quotaExceeded',
        instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
        quotaData: {
          method: 'correspondents',
          used: 3,
          total: 3,
          status: 'CORRESPONDENTS_QUOTA_EXCEEDED',
          description: 'Allowed chats: 10000000, 10000001, 10000002',
        },
      };

      expect(fromJson(body)).toBe('Allowed chats: 10000000, 10000001, 10000002');
    });

    it('reads the reason nested in data (CheckAccount rate limit)', () => {
      const body = { status: false, data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 11930619 } };

      expect(fromJson(body)).toBe('rate_limit_exceeded');
    });

    it('never leaves a 466 body as raw JSON', () => {
      const body = {
        invokeStatus: {
          method: 'checkAccount',
          used: 100,
          total: 100,
          status: 'QUOTE_EXCEEDED',
          description: 'Monthly quota has been exceeded.',
        },
      };

      expect(fromJson(body)).toBe('Monthly quota has been exceeded.');
    });

    it('puts the texts in the order reason, message, description, nested description, nested reason', () => {
      const body = {
        data: { reason: 'nested reason' },
        quotaData: { description: 'nested description' },
        description: 'description',
        message: 'message',
        reason: 'reason',
      };

      expect(fromJson(body)).toBe('reason: message: description: nested description: nested reason');
    });

    it('keeps a phrase that sits in the less important field', () => {
      const body = { description: 'Bad Request', message: 'custom webhook url is set' };

      expect(fromJson(body)).toBe('custom webhook url is set: Bad Request');
    });

    it('does not repeat a text that occurs twice', () => {
      expect(fromJson({ reason: 'Forbidden', message: ' Forbidden ', data: { reason: 'Forbidden' } })).toBe(
        'Forbidden',
      );
    });

    it('skips blank and non-string fields', () => {
      const body = {
        reason: ' ',
        message: 5,
        description: null,
        invokeStatus: 'x',
        data: { reason: 'Validation failed' },
      };

      expect(fromJson(body)).toBe('Validation failed');
    });

    it('keeps the raw text when the body has no readable field', () => {
      expect(toServerMessage('{"code":1}', token)).toBe('{"code":1}');
      expect(toServerMessage('{"description":"  "}', token)).toBe('{"description":"  "}');
      expect(toServerMessage('{"invokeStatus":{"used":1}}', token)).toBe('{"invokeStatus":{"used":1}}');
    });
  });

  describe('token and length', () => {
    it('redacts the token in plain text', () => {
      expect(toServerMessage(`Cannot GET /waInstance1/getStateInstance/${token}`, token)).toBe(
        'Cannot GET /waInstance1/getStateInstance/***',
      );
    });

    it.each([
      ['reason', { reason: `bad ${token}` }],
      ['message', { message: `bad ${token}` }],
      ['description', { description: `bad ${token}` }],
      ['a nested description', { invokeStatus: { description: `bad ${token}` } }],
      ['a nested reason', { data: { reason: `bad ${token}` } }],
    ])('redacts the token in %s', (_name, body) => {
      expect(fromJson(body)).toBe('bad ***');
    });

    it('cuts the text to 300 characters', () => {
      expect(toServerMessage('x'.repeat(1000), token)).toHaveLength(300);
      expect(fromJson({ reason: 'x'.repeat(1000) })).toHaveLength(300);
    });

    it('redacts the token before cutting, so a token on the edge cannot leak in part', () => {
      const text = `${'x'.repeat(295)}${token}`;

      expect(toServerMessage(text, token)).toBe(`${'x'.repeat(295)}***`);
    });
  });
});
