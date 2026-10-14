import type { GreenApiErrorKind, StateInstance } from '@shared/api/green-api';

/** Plain data only: it travels in the payload of a Redux action, which has to be serializable. */
export type SignInFailure =
  | { reason: 'instance-not-authorized'; stateInstance: StateInstance }
  | { reason: 'request-failed'; errorKind: GreenApiErrorKind; status?: number; serverMessage?: string };

export type SignInResult = { ok: true } | { ok: false; failure: SignInFailure };
