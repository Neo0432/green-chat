import type { GreenApiErrorKind, StateInstance } from '@shared/api/green-api';

export type SignInFailure =
  | { reason: 'instance-not-authorized'; stateInstance: StateInstance }
  | { reason: 'request-failed'; errorKind: GreenApiErrorKind; status?: number; serverMessage?: string };

export type SignInResult = { ok: true } | { ok: false; failure: SignInFailure };
