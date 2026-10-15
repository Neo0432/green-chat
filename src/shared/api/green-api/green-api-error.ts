import { assertNever } from '@shared/lib';

export type GreenApiErrorKind = 'http' | 'network' | 'timeout' | 'parse' | 'aborted';

interface GreenApiErrorParams {
  kind: GreenApiErrorKind;
  status?: number;
  serverMessage?: string;
  message?: string;
}

const getDefaultMessage = ({ kind, status, serverMessage }: GreenApiErrorParams) => {
  switch (kind) {
    case 'http':
      return serverMessage
        ? `GREEN-API responded with HTTP ${status}: ${serverMessage}`
        : `GREEN-API responded with HTTP ${status}`;
    case 'network':
      return 'GREEN-API is unreachable';
    case 'timeout':
      return 'GREEN-API did not respond in time';
    case 'parse':
      return 'Unexpected response from GREEN-API';
    case 'aborted':
      return 'Request to GREEN-API was aborted';
    default:
      return assertNever(kind);
  }
};

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind;
  readonly status?: number;
  readonly serverMessage?: string;

  constructor(params: GreenApiErrorParams) {
    super(params.message ?? getDefaultMessage(params));

    this.name = 'GreenApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.serverMessage = params.serverMessage;
  }
}

export const isGreenApiError = (error: unknown): error is GreenApiError => error instanceof GreenApiError;

type HttpError<Status extends number> = GreenApiError & { kind: 'http'; status: Status };

// Typed as narrow as the check: a wider guard makes the else branch of a chain narrow a GreenApiError to `never`.
const isHttpError = <Status extends number>(error: unknown, status: Status): error is HttpError<Status> =>
  isGreenApiError(error) && error.kind === 'http' && error.status === status;

export const isAuthError = (error: unknown): error is HttpError<401 | 403> =>
  isHttpError(error, 401) || isHttpError(error, 403);

export const isQuotaError = (error: unknown): error is HttpError<466> => isHttpError(error, 466);

export const isWebhookUrlError = (error: unknown): error is HttpError<400> =>
  isHttpError(error, 400) && /webhook url/i.test(error.serverMessage ?? '');
