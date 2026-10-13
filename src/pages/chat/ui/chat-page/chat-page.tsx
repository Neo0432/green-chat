import { ChatSidebar } from '@widgets/chat-sidebar';
import { ChatWindow } from '@widgets/chat-window';

import { getClasses } from './styles/get-classes';

export const ChatPage = () => {
  const { cnRoot } = getClasses();

  return (
    <div className={cnRoot}>
      <ChatSidebar />
      <ChatWindow />
    </div>
  );
};
