import { type Credentials, deriveApiUrl, type StateInstance } from '@shared/api/green-api';

/** Valid for every known mock instance (MK-6). */
export const MOCK_TOKEN = 'mock-token';

/** The happy-path instance: it carries the seed queue (MK-9) and is where the dev helpers write by default. */
export const PRIMARY_INSTANCE_ID = '4100000001';

/** What goes wrong on an instance besides its state. */
type MockInstanceFault =
  /** receiveNotification and deleteNotification fail with the "custom webhook url is set" 400. */
  | 'webhook-url'
  /** checkAccount and sendMessage fail with a 466; every login queues a `quotaExceeded` notification. */
  | 'quota-exceeded'
  /** getStateInstance fails with a 502. */
  | 'bad-gateway'
  /** Every request fails with a network error, as a CORS failure or an offline browser would. */
  | 'unreachable';

export interface MockInstance {
  stateInstance: StateInstance;
  fault?: MockInstanceFault;
}

/** MK-6. Any other instance ID is unknown to the mock and answers 401. */
export const MOCK_INSTANCES: ReadonlyMap<string, MockInstance> = new Map<string, MockInstance>([
  [PRIMARY_INSTANCE_ID, { stateInstance: 'authorized' }],
  ['4100000002', { stateInstance: 'notAuthorized' }],
  ['4100000003', { stateInstance: 'starting' }],
  ['4100000004', { stateInstance: 'blocked' }],
  ['4100000005', { stateInstance: 'authorized', fault: 'webhook-url' }],
  ['4100000006', { stateInstance: 'authorized', fault: 'quota-exceeded' }],
  ['4100000008', { stateInstance: 'authorized', fault: 'bad-gateway' }],
  ['4100000009', { stateInstance: 'authorized', fault: 'unreachable' }],
]);

/** Credentials the app accepts in mock mode. The API URL is derived from the instance ID, as the app does it. */
export const createMockCredentials = (
  idInstance = PRIMARY_INSTANCE_ID,
  apiTokenInstance = MOCK_TOKEN,
): Credentials => ({
  idInstance,
  apiTokenInstance,
  apiUrl: deriveApiUrl(idInstance),
});
