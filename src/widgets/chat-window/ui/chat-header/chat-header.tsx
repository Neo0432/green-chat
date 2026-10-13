import type { Chat } from '@entities/chat';

import { formatPhone } from '@shared/lib';
import { Avatar } from '@shared/ui/avatar';

import { getClasses } from './styles/get-classes';

interface ChatHeaderProps {
  chat: Chat;
}

export const ChatHeader = ({ chat }: ChatHeaderProps) => {
  const { chatId, phone, title } = chat;
  const { cnRoot, cnText, cnTitle, cnSubtitle } = getClasses();

  return (
    <header className={cnRoot}>
      <Avatar chatId={chatId} title={title} size={42} />
      <div className={cnText}>
        <h2 className={cnTitle}>{title}</h2>
        <p className={cnSubtitle}>{phone === null ? `Telegram ID ${chatId}` : formatPhone(phone)}</p>
      </div>
    </header>
  );
};
