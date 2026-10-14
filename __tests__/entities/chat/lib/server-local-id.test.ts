import { toServerLocalId } from '@entities/chat/lib/server-local-id';

describe('toServerLocalId', () => {
  it('prefixes the idMessage, so a message told by the server has the same localId every time', () => {
    expect(toServerLocalId('3EB0A1')).toBe('srv-3EB0A1');
  });
});
