import { type Credentials, deriveApiUrl, type StateInstance } from '@shared/api/green-api';

export const MOCK_TOKEN = 'mock-token';

export const PRIMARY_INSTANCE_ID = '4100000001';

type MockInstanceFault = 'webhook-url' | 'quota-exceeded' | 'bad-gateway' | 'unreachable';

export interface MockInstance {
  stateInstance: StateInstance;
  fault?: MockInstanceFault;
}

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

export const createMockCredentials = (
  idInstance = PRIMARY_INSTANCE_ID,
  apiTokenInstance = MOCK_TOKEN,
): Credentials => ({
  idInstance,
  apiTokenInstance,
  apiUrl: deriveApiUrl(idInstance),
});
