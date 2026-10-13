import { ChatSidebar } from '@widgets/chat-sidebar';

import { getClasses } from './styles/get-classes';

export const ChatPage = () => {
  const { cnRoot, cnChatArea, cnPlaceholder } = getClasses();

  return (
    <div className={cnRoot}>
      <ChatSidebar />
      <main className={cnChatArea}>
        <p className={cnPlaceholder}>Select a chat to start messaging</p>
      </main>
    </div>
  );
};
