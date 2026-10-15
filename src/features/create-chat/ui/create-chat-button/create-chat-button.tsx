import { useState } from 'react';

import { SvgPencil } from '@shared/assets/icons';
import { IconButton } from '@shared/ui/icon-button';

import { CreateChatDialog } from '../create-chat-dialog/create-chat-dialog';

interface CreateChatButtonProps {
  className?: string;
}

export const CreateChatButton = ({ className }: CreateChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton variant="fab" label="New chat" className={className} onClick={() => setIsOpen(true)}>
        <SvgPencil />
      </IconButton>
      {isOpen && <CreateChatDialog onClose={() => setIsOpen(false)} />}
    </>
  );
};
