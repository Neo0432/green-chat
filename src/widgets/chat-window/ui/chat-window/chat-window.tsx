import { selectActiveChat } from '@entities/chat';

import { useAppSelector } from '@shared/lib/redux';

import { ChatHeader } from '../chat-header/chat-header';

import { getClasses } from './styles/get-classes';

export const ChatWindow = () => {
  const chat = useAppSelector(selectActiveChat);
  const { cnRoot, cnBody, cnPlaceholder } = getClasses();

  return (
    <main className={cnRoot}>
      {chat && <ChatHeader chat={chat} />}
      <div className={cnBody}>{!chat && <p className={cnPlaceholder}>Select a chat to start messaging</p>}</div>
    </main>
  );
};
