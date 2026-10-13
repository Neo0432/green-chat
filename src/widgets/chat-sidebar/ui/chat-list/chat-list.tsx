import { chatsActions, selectActiveChatId, selectSortedChats } from '@entities/chat';

import { useAppDispatch, useAppSelector } from '@shared/lib/redux';

import { ChatListItem } from '../chat-list-item/chat-list-item';

import { getClasses } from './styles/get-classes';

export const ChatList = () => {
  const dispatch = useAppDispatch();
  const chats = useAppSelector(selectSortedChats);
  const activeChatId = useAppSelector(selectActiveChatId);
  const { cnRoot, cnList, cnEmpty } = getClasses();

  if (chats.length === 0) {
    return (
      <div className={cnRoot}>
        <p className={cnEmpty}>No chats yet. Tap ✎ to start a new chat.</p>
      </div>
    );
  }

  return (
    <div className={cnRoot}>
      <ul className={cnList}>
        {chats.map((chat) => (
          <li key={chat.chatId}>
            <ChatListItem
              chat={chat}
              isActive={chat.chatId === activeChatId}
              onSelect={() => dispatch(chatsActions.chatActivated(chat.chatId))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
