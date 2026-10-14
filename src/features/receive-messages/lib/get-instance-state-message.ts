import type { StateInstance } from '@shared/api/green-api';

/** FR-6.2: the receive loop column. `null` while the instance is fine, or its state is not known yet. */
export const getInstanceStateMessage = (stateInstance: StateInstance | null) => {
  switch (stateInstance) {
    case null:
    case 'authorized':
      return null;
    case 'notAuthorized':
    case 'pendingCode':
    case 'pendingPassword':
      return "The instance isn't linked to a Telegram account. Authorize it in console.green-api.com.";
    case 'starting':
      return 'The instance is starting.';
    case 'blocked':
      return 'The Telegram account of this instance is blocked.';
    case 'suspended':
    case 'yellowCard':
    case 'sleepMode':
    default:
      return `The instance is not ready (state: ${stateInstance}).`;
  }
};
