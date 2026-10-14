import { getInstanceStateMessage } from '@features/receive-messages/lib/get-instance-state-message';

describe('getInstanceStateMessage', () => {
  it.each([null, 'authorized'] as const)('has nothing to say when the state is %s', (stateInstance) => {
    expect(getInstanceStateMessage(stateInstance)).toBeNull();
  });

  it.each(['notAuthorized', 'pendingCode', 'pendingPassword'])(
    'asks to authorize the instance in %s',
    (stateInstance) => {
      expect(getInstanceStateMessage(stateInstance)).toBe(
        "The instance isn't linked to a Telegram account. Authorize it in console.green-api.com.",
      );
    },
  );

  it('says that the instance is starting', () => {
    expect(getInstanceStateMessage('starting')).toBe('The instance is starting.');
  });

  it('says that the account is blocked', () => {
    expect(getInstanceStateMessage('blocked')).toBe('The Telegram account of this instance is blocked.');
  });

  it.each(['suspended', 'yellowCard', 'sleepMode', 'something-new'])(
    'names the state %s when the instance is not ready',
    (stateInstance) => {
      expect(getInstanceStateMessage(stateInstance)).toBe(`The instance is not ready (state: ${stateInstance}).`);
    },
  );
});
