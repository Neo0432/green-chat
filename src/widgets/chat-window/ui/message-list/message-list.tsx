import { selectMessagesByChat } from '@entities/chat';

import { useAppSelector } from '@shared/lib/redux';

import { buildMessageItems } from '../../lib/build-message-items';
import { useStickToBottom } from '../../model/use-stick-to-bottom';
import { DateSeparator } from '../date-separator/date-separator';
import { MessageBubble } from '../message-bubble/message-bubble';

import { getClasses } from './styles/get-classes';

interface MessageListProps {
  chatId: string;
}

/** Mount it with the chat as its `key`: every chat then opens at its end. */
export const MessageList = ({ chatId }: MessageListProps) => {
  const messages = useAppSelector((state) => selectMessagesByChat(state, chatId));
  const { scrollRef, handleScroll } = useStickToBottom(messages.at(-1));
  const { cnRoot, cnColumn, cnEmpty } = getClasses();

  return (
    <div ref={scrollRef} className={cnRoot} role="log" aria-live="polite" onScroll={handleScroll}>
      {messages.length === 0 ? (
        <p className={cnEmpty}>No messages here yet</p>
      ) : (
        <div className={cnColumn}>
          {buildMessageItems(messages).map((item) =>
            item.type === 'date' ? (
              <DateSeparator key={item.key} timestamp={item.timestamp} />
            ) : (
              <MessageBubble key={item.key} message={item.message} />
            ),
          )}
        </div>
      )}
    </div>
  );
};
