import { useState } from 'react';

import { SignOutDialog } from '@features/sign-out';

import { selectCredentials } from '@entities/session';

import { SvgLogout, SvgMenu } from '@shared/assets/icons';
import { ENV } from '@shared/config';
import { useAppSelector } from '@shared/lib/redux';
import { IconButton } from '@shared/ui/icon-button';
import { Menu } from '@shared/ui/menu';

import { getClasses } from './styles/get-classes';

export const SidebarHeader = () => {
  const idInstance = useAppSelector((state) => selectCredentials(state)?.idInstance);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const { cnRoot, cnTitle, cnMockPill } = getClasses();

  return (
    <header className={cnRoot}>
      <Menu
        caption={idInstance === undefined ? undefined : `Instance ${idInstance}`}
        items={[{ label: 'Log out', icon: <SvgLogout />, tone: 'danger', onSelect: () => setIsSignOutOpen(true) }]}
        renderTrigger={(triggerProps) => (
          <IconButton label="Open menu" {...triggerProps}>
            <SvgMenu />
          </IconButton>
        )}
      />
      <h1 className={cnTitle}>green-chat</h1>
      {ENV.enableApiMocks && <span className={cnMockPill}>MOCK</span>}
      <SignOutDialog isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} />
    </header>
  );
};
