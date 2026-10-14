import { messagesActions } from '@entities/chat';

import { createAppAsyncThunk } from '@shared/lib/redux';

import { deliverMessage } from './deliver-message';

interface SendMessageParams {
  chatId: string;
  /** Already trimmed and valid, see `validateMessageText`. */
  text: string;
}

/** FR-3.5: the bubble appears at once, as `pending`, and the request follows. Sends do not wait for each other. */
export const sendMessage = createAppAsyncThunk<void, SendMessageParams>(
  'send-message/sendMessage',
  async ({ chatId, text }, thunkApi) => {
    const { payload: message } = thunkApi.dispatch(messagesActions.outgoingMessageQueued({ chatId, text }));

    await deliverMessage(thunkApi, message);
  },
);
