import { ChatSidebar } from '@widgets/chat-sidebar';
import { ChatWindow } from '@widgets/chat-window';

import { selectActiveChatId } from '@entities/chat';

import { MOBILE_MEDIA_QUERY, useMediaQuery } from '@shared/lib';
import { useAppSelector } from '@shared/lib/redux';

import { getClasses } from './styles/get-classes';

export const ChatPage = () => {
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
  const activeChatId = useAppSelector(selectActiveChatId);
  const isChatOpen = activeChatId !== null;
  const isSidebarShown = !isMobile || !isChatOpen;
  const isChatShown = !isMobile || isChatOpen;
  const { cnRoot } = getClasses();

  return (
    <div className={cnRoot}>
      {isSidebarShown && <ChatSidebar />}
      {isChatShown && <ChatWindow />}
    </div>
  );
};
