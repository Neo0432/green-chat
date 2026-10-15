import { messagesActions, selectMessagesByChat } from '@entities/chat';

import { createAppAsyncThunk } from '@shared/lib/redux';

import { deliverMessage } from './deliver-message';

interface RetryMessageParams {
  chatId: string;
  localId: string;
}

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
