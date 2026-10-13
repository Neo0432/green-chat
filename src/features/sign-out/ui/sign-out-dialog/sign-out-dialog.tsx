import { useAppDispatch } from '@shared/lib/redux';
import { Button } from '@shared/ui/button';
import { Modal } from '@shared/ui/modal';

import { signOut } from '../../model/sign-out';

interface SignOutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignOutDialog = ({ isOpen, onClose }: SignOutDialogProps) => {
  const dispatch = useAppDispatch();

  const handleConfirm = () => {
    dispatch(signOut());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log out of green-chat?"
      footer={
        <>
          <Button variant="text-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="text-danger" onClick={handleConfirm}>
            Log out
          </Button>
        </>
      }
    >
      <p>Local chat history on this device will be deleted.</p>
    </Modal>
  );
};
