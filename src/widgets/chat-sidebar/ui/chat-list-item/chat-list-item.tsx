import { type Chat, MessageStatusIcon, selectLastMessage } from '@entities/chat';

import { formatChatListTime } from '@shared/lib';
import { useAppSelector } from '@shared/lib/redux';
import { Avatar } from '@shared/ui/avatar';

import { getClasses } from './styles/get-classes';

const MAX_UNREAD_SHOWN = 99;
const NO_MESSAGES_TEXT = 'No messages yet';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
}

export const ChatListItem = ({ chat, isActive, onSelect }: ChatListItemProps) => {
  const { chatId, title, unreadCount, lastActivityAt } = chat;
  const lastMessage = useAppSelector((state) => selectLastMessage(state, chatId));
  const status = lastMessage?.status ?? null;
  const preview = lastMessage?.text ?? NO_MESSAGES_TEXT;
  const unreadLabel = unreadCount > MAX_UNREAD_SHOWN ? `${MAX_UNREAD_SHOWN}+` : String(unreadCount);
  const { cnRoot, cnAvatar, cnTitle, cnMeta, cnStatus, cnTime, cnPreview, cnBadge } = getClasses({
    isActive,
    isStatusFailed: status === 'failed',
  });

  return (
    <button
      type="button"
      className={cnRoot}
      aria-current={isActive || undefined}
      aria-label={`${title}, ${unreadCount} unread, last message: ${preview}`}
      onClick={onSelect}
    >
      <Avatar className={cnAvatar} chatId={chatId} title={title} />
      <span className={cnTitle}>{title}</span>
      <span className={cnMeta}>
        {status !== null && (
          <span className={cnStatus}>
            <MessageStatusIcon status={status} />
          </span>
        )}
        <span className={cnTime}>{formatChatListTime(lastActivityAt)}</span>
      </span>
      <span className={cnPreview}>{preview}</span>
      {unreadCount > 0 && <span className={cnBadge}>{unreadLabel}</span>}
    </button>
  );
};
