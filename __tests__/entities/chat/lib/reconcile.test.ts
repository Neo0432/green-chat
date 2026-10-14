import { applySendSuccess, matchApiMessage } from '@entities/chat/lib/reconcile';
import { toServerLocalId } from '@entities/chat/lib/server-local-id';

import { buildMessage } from '../fixtures';

const NOW = 1_000_000;
const MINUTE = 60_000;

describe('matchApiMessage', () => {
  const pending = buildMessage({ localId: 'local', status: 'pending', timestamp: NOW - MINUTE });

  const match = (messages = [pending], idMessage = 'srv-1', text = 'Hello') =>
    matchApiMessage(messages, { idMessage, text, now: NOW });

  it('is a new message when nothing matches', () => {
    expect(match([])).toBeNull();
  });

  it('matches a pending message with the same text', () => {
    expect(match()).toBe(0);
  });

  it('matches a failed message that is at most 5 minutes old (FR-4.8 (2))', () => {
    const failed = buildMessage({ status: 'failed', error: 'Not sent', timestamp: NOW - 5 * MINUTE });

    expect(match([failed])).toBe(0);
  });

  it('is a new message when the local one is older than 5 minutes', () => {
    const old = buildMessage({ status: 'pending', timestamp: NOW - 5 * MINUTE - 1 });

    expect(match([old])).toBeNull();
  });

  it('is a new message when the text differs', () => {
    expect(match([pending], 'srv-1', 'Bye')).toBeNull();
  });

  it('takes the oldest of several matches', () => {
    const newer = buildMessage({ localId: 'newer', status: 'pending', timestamp: NOW - 1_000 });

    expect(match([pending, newer])).toBe(0);
  });

  it('skips messages that are not unsent copies of ours', () => {
    const sent = buildMessage({ status: 'sent', timestamp: NOW - 1_000 });
    const incoming = buildMessage({ direction: 'in', status: null, timestamp: NOW - 1_000 });
    const withId = buildMessage({ status: 'failed', idMessage: 'srv-9', timestamp: NOW - 1_000 });

    expect(match([sent, incoming, withId])).toBeNull();
  });

  it('is a duplicate when a message has the idMessage already (FR-4.9)', () => {
    const known = buildMessage({ localId: 'srv-1', idMessage: 'srv-1', status: 'sent' });

    expect(match([pending, known])).toBe('duplicate');
  });
});

describe('applySendSuccess', () => {
  const local = buildMessage({ localId: 'local', status: 'pending', timestamp: 1_000 });
  const other = buildMessage({ localId: 'other', status: 'sent', idMessage: 'srv-0', timestamp: 2_000 });

  it('marks the local message as sent with the idMessage', () => {
    const result = applySendSuccess([local, other], 'local', 'srv-1');

    expect(result).toEqual([{ ...local, status: 'sent', idMessage: 'srv-1', error: null }, other]);
  });

  it('returns the same list when the message holds an idMessage already, whatever its status', () => {
    const failedByServer = { ...local, idMessage: 'srv-1', status: 'failed' as const, error: 'Rejected' };
    const messages = [failedByServer];

    expect(applySendSuccess(messages, 'local', 'srv-1')).toBe(messages);
  });

  it('drops the copy made by the API notification, and takes its higher status (FR-4.8 (3))', () => {
    const copy = buildMessage({
      localId: toServerLocalId('srv-1'),
      idMessage: 'srv-1',
      status: 'read',
      timestamp: 1_100,
    });

    const result = applySendSuccess([local, copy, other], 'local', 'srv-1');

    expect(result).toEqual([{ ...local, status: 'read', idMessage: 'srv-1', error: null }, other]);
  });

  it('returns the same list when the message is gone', () => {
    const messages = [local];

    expect(applySendSuccess(messages, 'missing', 'srv-1')).toBe(messages);
  });

  describe('when another local message adopted the idMessage by its text', () => {
    const first = buildMessage({ localId: 'first', status: 'pending', timestamp: 1_000 });
    const third = buildMessage({ localId: 'third', status: 'pending', timestamp: 1_002 });
    const adopted = { ...first, idMessage: 'srv-3', status: 'sent' as const };

    it('swaps the idMessage and the status: the response is the truth, no message is lost or moved', () => {
      const result = applySendSuccess([adopted, third], 'third', 'srv-3');

      expect(result).toEqual([first, { ...third, idMessage: 'srv-3', status: 'sent' }]);
    });

    it('moves the status the notifications gave to the idMessage along with it', () => {
      const delivered = { ...adopted, status: 'delivered' as const };

      const result = applySendSuccess([delivered, third], 'third', 'srv-3');

      expect(result).toEqual([first, { ...third, idMessage: 'srv-3', status: 'delivered' }]);
    });

    it('swaps the guesses of two messages that both adopted a wrong idMessage', () => {
      const wrong = { ...third, idMessage: 'srv-1', status: 'sent' as const };
      const guessed = { ...adopted, idMessage: 'srv-3' };

      const result = applySendSuccess([guessed, wrong], 'third', 'srv-3');

      expect(result).toEqual([
        { ...first, idMessage: 'srv-1', status: 'sent' },
        { ...third, idMessage: 'srv-3', status: 'sent' },
      ]);
    });

    it('takes the idMessage from the response when the message adopted another one', () => {
      const result = applySendSuccess([adopted, third], 'first', 'srv-1');

      expect(result).toEqual([{ ...first, idMessage: 'srv-1', status: 'sent' }, third]);
    });
  });
});
