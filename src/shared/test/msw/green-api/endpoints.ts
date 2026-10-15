import { HttpResponse } from 'msw';

import { isPlainObject } from '@shared/lib';

import type { MockInstance } from './mock-instances';
import type { GreenApiMockState } from './mock-state';
import { createQuotaExceededNotification } from './notification-factories';
import { type Scheduler, startSendEffects } from './send-effects';
import { sleep } from './sleep';

interface EndpointContext {
  state: GreenApiMockState;
  scheduler: Scheduler;
  idInstance: string;
  instance: MockInstance;
  request: Request;
  receiptId: string | undefined;
}

export type Endpoint = (context: EndpointContext) => Response | Promise<Response>;

const NOT_AUTHORIZED_REASON = 'instance is starting or not authorized';
const MESSAGE_MAX_LENGTH = 4096;
const SLOW_RESPONSE_MS = 20_000;
const MIN_RECEIVE_TIMEOUT_S = 5;
const MAX_MOCK_WAIT_S = 10;

const CHAT_ID_PATTERN = /^-?\d+$/;
const PHONE_CHAT_ID_PATTERN = /^(\d+)@c\.us$/;
const RECEIPT_ID_PATTERN = /^\d+$/;
const MARKER_PATTERN = /#[\w-]+/g;

const CHECK_ACCOUNT_QUOTA_BODY = {
  invokeStatus: {
    method: 'checkAccount',
    used: 100,
    total: 100,
    status: 'QUOTE_EXCEEDED',
    description: 'Monthly quota has been exceeded. Upgrade the tariff or wait for the next month.',
  },
};

const CHECK_ACCOUNT_OUTCOMES: readonly { phoneEnding: string; respond: () => Response }[] = [
  { phoneEnding: '0000', respond: () => HttpResponse.json({ exist: false, chatId: '' }) },
  {
    phoneEnding: '4690',
    respond: () => HttpResponse.json({ status: false, reason: 'Rate limited by messenger' }, { status: 469 }),
  },
  {
    phoneEnding: '2000',
    respond: () =>
      HttpResponse.json({ status: false, data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 7200 } }),
  },
  {
    phoneEnding: '5000',
    respond: () =>
      HttpResponse.json({ status: false, reason: 'Messenger is temporarily unavailable' }, { status: 500 }),
  },
  { phoneEnding: '4290', respond: () => new HttpResponse(null, { status: 429 }) },
];

const failure = (status: number, text: string) => new HttpResponse(text, { status });

const validationFailed = (details: string) => failure(400, `Validation failed. Details: ${details}`);

const readJson = async (request: Request): Promise<unknown> => {
  try {
    const body: unknown = await request.json();

    return body;
  } catch {
    return undefined;
  }
};

const readFields = async (request: Request) => {
  const body = await readJson(request);

  return isPlainObject(body) ? body : null;
};

const isChatId = (value: unknown): value is string =>
  typeof value === 'string' && (CHAT_ID_PATTERN.test(value) || PHONE_CHAT_ID_PATTERN.test(value));

const getMarkerFailure = (state: GreenApiMockState, markers: ReadonlySet<string>, failOnceKey: string) => {
  if (markers.has('#fail')) {
    return failure(500, 'Internal Server Error');
  }

  if (markers.has('#fail-once') && state.consumeFailOnce(failOnceKey)) {
    return failure(500, 'Internal Server Error');
  }

  if (markers.has('#429')) {
    return new HttpResponse(null, { status: 429 });
  }

  return markers.has('#offline') ? HttpResponse.error() : null;
};

const readReceiveTimeoutMs = (url: string) => {
  const requested = Number(new URL(url).searchParams.get('receiveTimeout') ?? MIN_RECEIVE_TIMEOUT_S);
  const seconds = Number.isNaN(requested) ? MIN_RECEIVE_TIMEOUT_S : requested;

  return Math.min(Math.max(seconds, MIN_RECEIVE_TIMEOUT_S), MAX_MOCK_WAIT_S) * 1000;
};

const webhookUrlFailure = (idInstance: string) =>
  failure(
    400,
    `Message cannot be received because custom webhook url is set. Go to cabinet, clear webhook url for instance: ${idInstance} and wait for about 1 minute for another attempt`,
  );

export const getStateInstance: Endpoint = ({ state, idInstance, instance }) => {
  if (instance.fault === 'bad-gateway') {
    return failure(502, 'Bad Gateway');
  }

  if (instance.fault === 'quota-exceeded') {
    state.enqueue(idInstance, createQuotaExceededNotification({ idInstance }));
  }

  return HttpResponse.json({ stateInstance: instance.stateInstance });
};

export const checkAccount: Endpoint = async ({ state, instance, request }) => {
  const fields = await readFields(request);

  if (fields === null) {
    return validationFailed('the body must be a JSON object');
  }

  const { phoneNumber } = fields;

  if (phoneNumber === undefined) {
    return HttpResponse.json({ status: false, reason: "request should contain 'phoneNumber' or 'username'" });
  }

  if (typeof phoneNumber !== 'number' || !Number.isSafeInteger(phoneNumber) || phoneNumber <= 0) {
    return validationFailed("Wrong format. 'phoneNumber' must contain only digits");
  }

  if (instance.stateInstance !== 'authorized') {
    return HttpResponse.json({ status: false, reason: NOT_AUTHORIZED_REASON });
  }

  if (instance.fault === 'quota-exceeded') {
    return HttpResponse.json(CHECK_ACCOUNT_QUOTA_BODY, { status: 466 });
  }

  const phone = String(phoneNumber);
  const outcome = CHECK_ACCOUNT_OUTCOMES.find(({ phoneEnding }) => phone.endsWith(phoneEnding));

  if (outcome) {
    return outcome.respond();
  }

  return HttpResponse.json({ exist: true, chatId: state.registerPhone(phone), phoneNumber, fromCache: false });
};

export const sendMessage: Endpoint = async ({ state, scheduler, idInstance, instance, request }) => {
  const { chatId: requestedChatId, message } = (await readFields(request)) ?? {};

  if (!isChatId(requestedChatId)) {
    return validationFailed("'chatId' must be one of the next formats: 'phone_number@c.us' or 'chatId'");
  }

  if (typeof message !== 'string' || message.length === 0 || message.length > MESSAGE_MAX_LENGTH) {
    return validationFailed(`'message' length must be less than or equal to ${MESSAGE_MAX_LENGTH} characters long`);
  }

  if (instance.stateInstance !== 'authorized') {
    return failure(400, NOT_AUTHORIZED_REASON);
  }

  if (instance.fault === 'quota-exceeded') {
    return HttpResponse.json(createQuotaExceededNotification({ idInstance }), { status: 466 });
  }

  const markers = new Set(message.match(MARKER_PATTERN));
  const markerFailure = getMarkerFailure(state, markers, `${idInstance}|${requestedChatId}|${message}`);

  if (markerFailure) {
    return markerFailure;
  }

  const phone = PHONE_CHAT_ID_PATTERN.exec(requestedChatId)?.[1];
  const chatId = phone === undefined ? requestedChatId : state.registerPhone(phone);
  const idMessage = state.createMessageId();

  const startEffects = () => {
    startSendEffects({ state, scheduler, idInstance, chatId, idMessage, text: message, markers });
  };

  if (markers.has('#slow')) {
    scheduler(startEffects, SLOW_RESPONSE_MS);

    if (!(await sleep(SLOW_RESPONSE_MS, request.signal))) {
      return HttpResponse.error();
    }
  } else {
    startEffects();
  }

  return HttpResponse.json({ idMessage });
};

export const receiveNotification: Endpoint = async ({ state, idInstance, instance, request }) => {
  if (instance.fault === 'webhook-url') {
    return webhookUrlFailure(idInstance);
  }

  if (state.getQueueLength(idInstance) === 0) {
    await state.waitForNotification(idInstance, {
      timeoutMs: readReceiveTimeoutMs(request.url),
      signal: request.signal,
    });
  }

  if (request.signal.aborted || state.isOffline) {
    return HttpResponse.error();
  }

  return HttpResponse.json(state.peek(idInstance) ?? null);
};

export const deleteNotification: Endpoint = ({ state, idInstance, instance, receiptId }) => {
  if (instance.fault === 'webhook-url') {
    return webhookUrlFailure(idInstance);
  }

  if (receiptId === undefined || !RECEIPT_ID_PATTERN.test(receiptId)) {
    return failure(400, 'Parameter receiptId must be a Number!');
  }

  return HttpResponse.json(
    state.acknowledge(idInstance, Number(receiptId))
      ? { result: true, reason: '' }
      : { result: false, reason: 'notification not found' },
  );
};
