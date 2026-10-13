import { SidebarHeader } from '../sidebar-header/sidebar-header';

import { getClasses } from './styles/get-classes';

export const ChatSidebar = () => {
  const { cnRoot } = getClasses();

  return (
    <aside className={cnRoot} aria-label="Chats">
      <SidebarHeader />
    </aside>
  );
};
