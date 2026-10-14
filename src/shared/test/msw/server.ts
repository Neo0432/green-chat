import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** MSW for tests (Node). */
export const server = setupServer(...handlers);
