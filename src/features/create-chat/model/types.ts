import type { GreenApiErrorKind } from '@shared/api/green-api';

/** Plain data only: it travels in the payload of a Redux action, which has to be serializable. */
export type CreateChatFailure =
  | { reason: 'not-found' }
  | { reason: 'unavailable'; serverReason: string }
  | { reason: 'request-failed'; errorKind: GreenApiErrorKind; status?: number; serverMessage?: string };

export type CreateChatResult = { ok: true } | { ok: false; failure: CreateChatFailure };
