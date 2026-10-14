import { CreateChatButton } from '@features/create-chat';

import { ChatList } from '../chat-list/chat-list';
import { SidebarHeader } from '../sidebar-header/sidebar-header';
import { StatusStrip } from '../status-strip/status-strip';

import { getClasses } from './styles/get-classes';

export const ChatSidebar = () => {
  const { cnRoot, cnCreateChatButton } = getClasses();

  return (
    <aside className={cnRoot} aria-label="Chats">
      <SidebarHeader />
      <StatusStrip />
      <ChatList />
      <CreateChatButton className={cnCreateChatButton} />
    </aside>
  );
};
