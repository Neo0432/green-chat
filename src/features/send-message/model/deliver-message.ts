import { type Message, messagesActions } from '@entities/chat';
import { handleAuthError, selectCredentials } from '@entities/session';

import { isGreenApiError, sendMessage } from '@shared/api/green-api';

import { getSendErrorMessage } from '../lib/get-send-error-message';

const UNEXPECTED_ERROR_MESSAGE = 'Not sent.';

interface ThunkApi {
  dispatch: AppDispatch;
  getState: () => RootState;
}

export const deliverMessage = async ({ dispatch, getState }: ThunkApi, { chatId, localId, text }: Message) => {
  const credentials = selectCredentials(getState());

  if (credentials === null) {
    throw new Error('Cannot send a message while signed out');
  }

  try {
    const { idMessage } = await sendMessage(credentials, { chatId, message: text });

    dispatch(messagesActions.messageSendSucceeded({ chatId, localId, idMessage }));
  } catch (error) {
    if (!isGreenApiError(error)) {
      dispatch(messagesActions.messageSendFailed({ chatId, localId, error: UNEXPECTED_ERROR_MESSAGE }));

      throw error;
    }

    if (selectCredentials(getState()) !== credentials) {
      return;
    }

    if (!handleAuthError(dispatch, error)) {
      dispatch(messagesActions.messageSendFailed({ chatId, localId, error: getSendErrorMessage(error) }));
    }
  }
};
