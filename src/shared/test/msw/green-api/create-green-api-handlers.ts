import { http, HttpResponse, type PathParams, type RequestHandler } from 'msw';

import {
  checkAccount,
  deleteNotification,
  type Endpoint,
  getStateInstance,
  receiveNotification,
  sendMessage,
} from './endpoints';
import { MOCK_TOKEN } from './mock-instances';
import type { GreenApiMockState } from './mock-state';
import { type Scheduler, timerScheduler } from './send-effects';
import { sleep } from './sleep';

export interface GreenApiHandlersOptions {
  latencyMs: number | { min: number; max: number };
  scheduler?: Scheduler;
}

const ENDPOINTS = new Map<string, Endpoint>([
  ['GET getstateinstance', getStateInstance],
  ['POST checkaccount', checkAccount],
  ['POST sendmessage', sendMessage],
  ['GET receivenotification', receiveNotification],
  ['DELETE deletenotification', deleteNotification],
]);

const HOST_PATTERN = /^(\d{4})\.api\.green-api\.com$/;

const isForeignInstance = (url: URL, idInstance: string) => {
  const hostPrefix = HOST_PATTERN.exec(url.hostname)?.[1];

  return hostPrefix !== undefined && hostPrefix !== idInstance.slice(0, 4);
};

const readParam = (params: PathParams, name: string) => {
  const value = params[name];

  return typeof value === 'string' ? value : '';
};

const pickLatencyMs = (latencyMs: GreenApiHandlersOptions['latencyMs']) =>
  typeof latencyMs === 'number' ? latencyMs : latencyMs.min + Math.random() * (latencyMs.max - latencyMs.min);

export const createGreenApiHandlers = (
  state: GreenApiMockState,
  { latencyMs, scheduler = timerScheduler }: GreenApiHandlersOptions,
): RequestHandler[] => {
  const respond = async ({ request, params }: { request: Request; params: PathParams }) => {
    const idInstance = readParam(params, 'idInstance');
    const receiptId = readParam(params, 'receiptId') || undefined;
    const endpoint = ENDPOINTS.get(`${request.method} ${readParam(params, 'method').toLowerCase()}`);

    if (state.isOffline) {
      return HttpResponse.error();
    }

    if (endpoint !== receiveNotification && !(await sleep(pickLatencyMs(latencyMs), request.signal))) {
      return HttpResponse.error();
    }

    const instance = state.getInstance(idInstance);

    if (isForeignInstance(new URL(request.url), idInstance) || instance?.fault === 'unreachable') {
      return HttpResponse.error();
    }

    if (endpoint === undefined) {
      return new HttpResponse('Not Found', { status: 404 });
    }

    if (instance === undefined || readParam(params, 'token') !== MOCK_TOKEN) {
      return new HttpResponse(null, { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    state.setActiveInstance(idInstance);

    return endpoint({ state, scheduler, idInstance, instance, request, receiptId });
  };

  return [
    http.all('*/waInstance:idInstance/:method/:token', respond),
    http.all('*/waInstance:idInstance/:method/:token/:receiptId', respond),
  ];
};
