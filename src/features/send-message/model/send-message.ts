import { messagesActions } from '@entities/chat';

import { createAppAsyncThunk } from '@shared/lib/redux';

import { deliverMessage } from './deliver-message';

interface SendMessageParams {
  chatId: string;
  text: string;
}

export const sendMessage = createAppAsyncThunk<void, SendMessageParams>(
  'send-message/sendMessage',
  async ({ chatId, text }, thunkApi) => {
    const { payload: message } = thunkApi.dispatch(messagesActions.outgoingMessageQueued({ chatId, text }));

    await deliverMessage(thunkApi, message);
  },
);
