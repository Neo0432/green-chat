import { getNextStatus, withStatus } from '@entities/chat/lib/status-rank';
import type { MessageStatus } from '@entities/chat/model/types';

import { buildMessage } from '../fixtures';

describe('getNextStatus', () => {
  it.each<[MessageStatus, MessageStatus]>([
    ['pending', 'sent'],
    ['sent', 'delivered'],
    ['delivered', 'read'],
    ['pending', 'read'],
    ['failed', 'sent'],
    ['failed', 'delivered'],
  ])('raises %s to %s', (current, incoming) => {
    expect(getNextStatus(current, incoming)).toBe(incoming);
  });

  it.each<[MessageStatus, MessageStatus]>([
    ['read', 'delivered'],
    ['read', 'sent'],
    ['delivered', 'sent'],
    ['sent', 'pending'],
    ['sent', 'sent'],
  ])('keeps %s when %s arrives', (current, incoming) => {
    expect(getNextStatus(current, incoming)).toBe(current);
  });

  it.each<MessageStatus>(['pending', 'sent', 'delivered'])('lets failed replace %s', (current) => {
    expect(getNextStatus(current, 'failed')).toBe('failed');
  });

  it('keeps read when failed arrives after it', () => {
    expect(getNextStatus('read', 'failed')).toBe('read');
  });
});

describe('withStatus', () => {
  it('sets the status and the error of a failure', () => {
    const message = withStatus(buildMessage({ status: 'sent' }), 'failed', 'Not sent: no connection.');

    expect(message).toMatchObject({ status: 'failed', error: 'Not sent: no connection.' });
  });

  it('drops the error when the message gets past a failure', () => {
    const message = withStatus(buildMessage({ status: 'failed', error: 'Not sent' }), 'sent');

    expect(message).toMatchObject({ status: 'sent', error: null });
  });

  it('returns the very same message when nothing changes', () => {
    const message = buildMessage({ status: 'read' });

    expect(withStatus(message, 'delivered')).toBe(message);
    expect(withStatus(message, 'failed', 'Late failure')).toBe(message);
  });

  it('leaves an incoming message alone', () => {
    const message = buildMessage({ direction: 'in', status: null });

    expect(withStatus(message, 'read')).toBe(message);
  });
});
