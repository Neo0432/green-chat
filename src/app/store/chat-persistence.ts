import type { ListenerEffectAPI, UnknownAction } from '@reduxjs/toolkit';

import { chatsActions, loadChatData, messagesActions, saveChatData, selectChatData } from '@entities/chat';
import { selectCredentials, sessionActions } from '@entities/session';

import { startAppListening } from '@shared/lib/redux';

const SAVE_DELAY_MS = 500;

type EffectApi = ListenerEffectAPI<RootState, AppDispatch>;

const hydrate = (idInstance: string, dispatch: AppDispatch) => {
  const data = loadChatData(idInstance);

  if (data === null) {
    return;
  }

  dispatch(chatsActions.chatsHydrated({ chats: data.chats, activeChatId: data.activeChatId }));
  dispatch(messagesActions.messagesHydrated(data.messages));
};

/** Nothing to save without a session: the chat state is empty by then, and the key must not come back after a logout. */
const saveChats = (state: RootState) => {
  const credentials = selectCredentials(state);

  if (credentials) {
    saveChatData(credentials.idInstance, selectChatData(state));
  }
};

const isChatStateChanged = (_action: UnknownAction, state: RootState, previousState: RootState) =>
  state.chats !== previousState.chats || state.messages !== previousState.messages;

const hydrateOnSignIn = ({ payload }: ReturnType<typeof sessionActions.signedIn>, { dispatch }: EffectApi) => {
  hydrate(payload.idInstance, dispatch);
};

const saveAfterDelay = async (_action: UnknownAction, api: EffectApi) => {
  api.cancelActiveListeners();
  await api.delay(SAVE_DELAY_MS);
  saveChats(api.getState());
};

/** FR-1.9: a forced sign-out keeps the history, so what is still waiting for its debounce is written first. */
const saveAndResetOnForcedSignOut = (_action: UnknownAction, { getOriginalState, dispatch }: EffectApi) => {
  saveChats(getOriginalState());
  dispatch(chatsActions.chatsReset());
  dispatch(messagesActions.messagesReset());
};

/** FR-1.8: the storage is already wiped by then. */
const resetOnSignOut = (_action: UnknownAction, { dispatch }: EffectApi) => {
  dispatch(chatsActions.chatsReset());
  dispatch(messagesActions.messagesReset());
};

/**
 * Loads the chats of the signed-in instance, keeps the storage in sync (FR-5.3) and clears the state when the
 * session ends. The listeners are module-level, so RTK adds them once; the hydration and the pagehide flush belong to
 * the store that is passed in.
 */
export const startChatPersistence = (store: { dispatch: AppDispatch; getState: () => RootState }) => {
  startAppListening({ actionCreator: sessionActions.signedIn, effect: hydrateOnSignIn });
  startAppListening({ actionCreator: sessionActions.signedOut, effect: resetOnSignOut });
  startAppListening({ actionCreator: sessionActions.forcedSignOut, effect: saveAndResetOnForcedSignOut });
  startAppListening({ predicate: isChatStateChanged, effect: saveAfterDelay });

  const credentials = selectCredentials(store.getState());

  if (credentials) {
    hydrate(credentials.idInstance, store.dispatch);
  }

  window.addEventListener('pagehide', () => {
    saveChats(store.getState());
  });
};
