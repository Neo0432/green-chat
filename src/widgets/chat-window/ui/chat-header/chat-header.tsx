import { type Chat, chatsActions } from '@entities/chat';

import { SvgArrowBack } from '@shared/assets/icons';
import { formatPhone, MOBILE_MEDIA_QUERY, useMediaQuery } from '@shared/lib';
import { useAppDispatch } from '@shared/lib/redux';
import { Avatar } from '@shared/ui/avatar';
import { IconButton } from '@shared/ui/icon-button';

import { getClasses } from './styles/get-classes';

interface ChatHeaderProps {
  chat: Chat;
}

export const ChatHeader = ({ chat }: ChatHeaderProps) => {
  const { chatId, phone, title } = chat;
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
  const { cnRoot, cnText, cnTitle, cnSubtitle } = getClasses();

  const handleBack = () => {
    dispatch(chatsActions.chatDeactivated());
  };

  return (
    <header className={cnRoot}>
      {isMobile && (
        <IconButton label="Back to chats" onClick={handleBack}>
          <SvgArrowBack />
        </IconButton>
      )}
      <Avatar chatId={chatId} title={title} size={42} />
      <div className={cnText}>
        <h2 className={cnTitle}>{title}</h2>
        <p className={cnSubtitle}>{phone === null ? `Telegram ID ${chatId}` : formatPhone(phone)}</p>
      </div>
    </header>
  );
};
