import { parseNotification } from '@shared/api/green-api';

import { type GreenApiMockState, PRIMARY_INSTANCE_ID } from './msw/green-api';

export const drainNotifications = (state: GreenApiMockState, idInstance = PRIMARY_INSTANCE_ID) => {
  const parsed = [];

  for (let head = state.peek(idInstance); head; head = state.peek(idInstance)) {
    parsed.push(parseNotification(head.body, idInstance));
    state.acknowledge(idInstance, head.receiptId);
  }

  return parsed;
};
