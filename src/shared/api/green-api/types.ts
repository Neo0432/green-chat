export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type StateInstance =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'suspended'
  | 'starting'
  | 'pendingCode'
  | 'pendingPassword'
  | 'sleepMode'
  | 'yellowCard'
  | (string & {});

export type CheckAccountResult =
  { kind: 'found'; chatId: string } | { kind: 'not-found' } | { kind: 'unavailable'; reason: string };

export interface SendMessageResult {
  idMessage: string;
}

export interface ReceivedNotification {
  receiptId: number;
  body: unknown;
}

export interface DeleteNotificationResult {
  result: boolean;
}

export type MessageSource = 'incoming' | 'outgoing-phone' | 'outgoing-api';

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface ParsedMessageNotification {
  type: 'message';
  source: MessageSource;
  chatId: string;
  idMessage: string;
  /** Milliseconds since the epoch. */
  timestamp: number;
  text: string;
  senderName: string | null;
  /** Digits only. */
  senderPhone: string | null;
}

export interface ParsedStatusNotification {
  type: 'status';
  chatId: string | null;
  idMessage: string;
  status: DeliveryStatus;
  description: string | null;
}

export interface ParsedStateNotification {
  type: 'state';
  stateInstance: StateInstance;
}

export interface ParsedQuotaNotification {
  type: 'quota';
  description: string | null;
}

export type ParsedNotification =
  ParsedMessageNotification | ParsedStatusNotification | ParsedStateNotification | ParsedQuotaNotification;
