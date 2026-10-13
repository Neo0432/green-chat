import {
  selectCredentials,
  selectForcedSignOut,
  selectIdInstance,
  selectIsSignedIn,
  sessionActions,
  sessionReducer,
  type SessionState,
} from '@entities/session';

import { createMockCredentials } from '@shared/test/msw/green-api';

const CREDENTIALS = createMockCredentials();

const SIGNED_OUT: SessionState = { credentials: null, instanceState: null, forcedSignOut: null };
const SIGNED_IN: SessionState = { credentials: CREDENTIALS, instanceState: 'authorized', forcedSignOut: null };
const FORCED_OUT: SessionState = {
  credentials: null,
  instanceState: null,
  forcedSignOut: { idInstance: CREDENTIALS.idInstance },
};

describe('session slice', () => {
  describe('reducer', () => {
    it('starts signed out', () => {
      expect(sessionReducer(undefined, { type: '@@init' })).toEqual(SIGNED_OUT);
    });

    it('signs in and forgets an earlier forced sign-out', () => {
      expect(sessionReducer(FORCED_OUT, sessionActions.signedIn(CREDENTIALS))).toEqual(SIGNED_IN);
    });

    it('signs out and forgets everything', () => {
      expect(sessionReducer({ ...SIGNED_IN, instanceState: 'blocked' }, sessionActions.signedOut())).toEqual(
        SIGNED_OUT,
      );
      expect(sessionReducer(FORCED_OUT, sessionActions.signedOut())).toEqual(SIGNED_OUT);
    });

    describe('forcedSignOut', () => {
      it('drops the credentials and remembers the Instance ID, but not the token', () => {
        const state = sessionReducer({ ...SIGNED_IN, instanceState: 'blocked' }, sessionActions.forcedSignOut());

        expect(state).toEqual(FORCED_OUT);
        expect(JSON.stringify(state)).not.toContain(CREDENTIALS.apiTokenInstance);
      });

      it('changes nothing when nobody is signed in', () => {
        expect(sessionReducer(SIGNED_OUT, sessionActions.forcedSignOut())).toEqual(SIGNED_OUT);
        expect(sessionReducer(FORCED_OUT, sessionActions.forcedSignOut())).toEqual(FORCED_OUT);
      });
    });

    it('stores the instance state', () => {
      const state = sessionReducer(SIGNED_IN, sessionActions.instanceStateChanged('notAuthorized'));

      expect(state).toEqual({ ...SIGNED_IN, instanceState: 'notAuthorized' });
    });
  });

  describe('selectors', () => {
    it('select the credentials, the Instance ID, the sign-in flag and the forced sign-out', () => {
      expect(selectCredentials({ session: SIGNED_IN })).toEqual(CREDENTIALS);
      expect(selectCredentials({ session: SIGNED_OUT })).toBeNull();
      expect(selectIdInstance({ session: SIGNED_IN })).toBe(CREDENTIALS.idInstance);
      expect(selectIdInstance({ session: SIGNED_OUT })).toBeNull();
      expect(selectIsSignedIn({ session: SIGNED_IN })).toBe(true);
      expect(selectIsSignedIn({ session: FORCED_OUT })).toBe(false);
      expect(selectForcedSignOut({ session: FORCED_OUT })).toEqual({ idInstance: CREDENTIALS.idInstance });
      expect(selectForcedSignOut({ session: SIGNED_IN })).toBeNull();
    });
  });
});
