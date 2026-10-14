import { applySendSuccess, matchApiMessage } from '@entities/chat/lib/reconcile';

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
    const copy = buildMessage({ localId: 'srv-1', idMessage: 'srv-1', status: 'read', timestamp: 1_100 });

    const result = applySendSuccess([local, copy, other], 'local', 'srv-1');

    expect(result).toEqual([{ ...local, status: 'read', idMessage: 'srv-1', error: null }, other]);
  });

  it('returns the same list when the message is gone', () => {
    const messages = [local];

    expect(applySendSuccess(messages, 'missing', 'srv-1')).toBe(messages);
  });
});
