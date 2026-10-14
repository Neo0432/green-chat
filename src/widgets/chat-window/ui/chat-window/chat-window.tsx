import { Fragment } from 'react';

import { Composer } from '@features/send-message';

import { selectActiveChat } from '@entities/chat';

import { useAppSelector } from '@shared/lib/redux';

import { ChatHeader } from '../chat-header/chat-header';
import { MessageList } from '../message-list/message-list';

import { getClasses } from './styles/get-classes';

export const ChatWindow = () => {
  const chat = useAppSelector(selectActiveChat);
  const { cnRoot, cnBody, cnPlaceholder } = getClasses();

  return (
    <main className={cnRoot}>
      {chat ? (
        // The key makes every chat start with its own scroll position, draft and focus.
        <Fragment key={chat.chatId}>
          <ChatHeader chat={chat} />
          <MessageList chatId={chat.chatId} />
          <Composer chatId={chat.chatId} />
        </Fragment>
      ) : (
        <div className={cnBody}>
          <p className={cnPlaceholder}>Select a chat to start messaging</p>
        </div>
      )}
    </main>
  );
};
