import type { GreenApiErrorKind } from '@shared/api/green-api';

export type CreateChatFailure =
  | { reason: 'not-found' }
  | { reason: 'unavailable'; serverReason: string }
  | { reason: 'request-failed'; errorKind: GreenApiErrorKind; status?: number; serverMessage?: string };

export type CreateChatResult = { ok: true } | { ok: false; failure: CreateChatFailure };
