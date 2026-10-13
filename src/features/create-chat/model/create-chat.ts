import { chatsActions, selectChatById, selectChatByPhone } from '@entities/chat';
import { handleAuthError, selectCredentials } from '@entities/session';

import { checkAccount, type CheckAccountResult, isGreenApiError } from '@shared/api/green-api';
import { formatPhone } from '@shared/lib';
import { createAppAsyncThunk } from '@shared/lib/redux';

import type { CreateChatResult } from './types';

/**
 * Opens the chat of a normalized phone (FR-2.5, FR-2.6). A known phone costs no request, because the free tariff
 * allows only 100 checks a month. An expected failure is a result, not a rejection.
 */
export const createChat = createAppAsyncThunk<CreateChatResult, string>(
  'create-chat/createChat',
  async (phone, { dispatch, getState }) => {
    const knownChat = selectChatByPhone(getState(), phone);

    if (knownChat) {
      dispatch(chatsActions.chatActivated(knownChat.chatId));

      return { ok: true };
    }

    const credentials = selectCredentials(getState());

    if (credentials === null) {
      throw new Error('Cannot create a chat while signed out');
    }

    let account: CheckAccountResult;

    try {
      account = await checkAccount(credentials, { phoneNumber: phone });
    } catch (error) {
      if (!isGreenApiError(error)) {
        throw error;
      }

      handleAuthError(dispatch, error);

      return {
        ok: false,
        failure: {
          reason: 'request-failed',
          errorKind: error.kind,
          status: error.status,
          serverMessage: error.serverMessage,
        },
      };
    }

    if (account.kind === 'not-found') {
      return { ok: false, failure: { reason: 'not-found' } };
    }

    if (account.kind === 'unavailable') {
      return { ok: false, failure: { reason: 'unavailable', serverReason: account.reason } };
    }

    // The session ended during the request: its chats are gone, and a new one must not land in the next session.
    if (selectCredentials(getState()) !== credentials) {
      return { ok: true };
    }

    if (selectChatById(getState(), account.chatId)) {
      dispatch(chatsActions.chatPhoneSet({ chatId: account.chatId, phone }));
    } else {
      dispatch(chatsActions.chatCreated({ chatId: account.chatId, phone, title: formatPhone(phone) }));
    }

    dispatch(chatsActions.chatActivated(account.chatId));

    return { ok: true };
  },
);
