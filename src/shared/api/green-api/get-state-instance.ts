import { isNonEmptyString, isPlainObject } from '@shared/lib/predicates';

import { GreenApiError } from './green-api-error';
import { request } from './request';
import type { Credentials, RequestOptions, StateInstance } from './types';

export const getStateInstance = async (credentials: Credentials, options?: RequestOptions): Promise<StateInstance> => {
  const data = await request(credentials, { method: 'GET', endpoint: 'getStateInstance' }, options);

  if (!isPlainObject(data) || !isNonEmptyString(data.stateInstance)) {
    throw new GreenApiError({ kind: 'parse', message: 'Unexpected getStateInstance response' });
  }

  return data.stateInstance;
};
