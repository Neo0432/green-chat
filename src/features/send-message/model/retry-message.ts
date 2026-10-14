import { messagesActions, selectMessagesByChat } from '@entities/chat';

import { createAppAsyncThunk } from '@shared/lib/redux';

import { deliverMessage } from './deliver-message';

interface RetryMessageParams {
  chatId: string;
  localId: string;
}

/** FR-3.7: the same message, with the same `localId`, goes out again. A message that is not `failed` is left alone. */
export const retryMessage = createAppAsyncThunk<void, RetryMessageParams>(
  'send-message/retryMessage',
  async ({ chatId, localId }, thunkApi) => {
    const message = selectMessagesByChat(thunkApi.getState(), chatId).find((item) => item.localId === localId);

    if (message?.status !== 'failed') {
      return;
    }

    thunkApi.dispatch(messagesActions.messageRetried({ chatId, localId }));
    await deliverMessage(thunkApi, message);
  },
);
