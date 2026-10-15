import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useAppDispatch } from '@shared/lib/redux';
import { Button } from '@shared/ui/button';
import { Modal } from '@shared/ui/modal';
import { TextField } from '@shared/ui/text-field';

import { getCreateChatErrorMessage } from '../../lib/get-create-chat-error-message';
import { createChat } from '../../model/create-chat';
import { type CreateChatFormOutput, type CreateChatFormValues, createChatSchema } from '../../model/create-chat-schema';

interface CreateChatDialogProps {
  onClose: () => void;
}

export const CreateChatDialog = ({ onClose }: CreateChatDialogProps) => {
  const dispatch = useAppDispatch();
  const formId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateChatFormValues, unknown, CreateChatFormOutput>({
    resolver: zodResolver(createChatSchema),
    defaultValues: { phone: '' },
  });

  const handleValidSubmit = async ({ phone }: CreateChatFormOutput) => {
    const result = await dispatch(createChat(phone)).unwrap();

    if (result.ok) {
      onClose();
    } else {
      setError('phone', { message: getCreateChatErrorMessage(result.failure) });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title="New chat"
      footer={
        <>
          <Button variant="text-secondary" disabled={isSubmitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="text" isLoading={isSubmitting}>
            Start chat
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(handleValidSubmit)}>
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="International format, e.g. +7 900 123-45-67"
          readOnly={isSubmitting}
          error={errors.phone?.message}
          {...register('phone')}
        />
      </form>
    </Modal>
  );
};
