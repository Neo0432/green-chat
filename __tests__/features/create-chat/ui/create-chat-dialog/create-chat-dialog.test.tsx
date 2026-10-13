import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { CreateChatDialog } from '@features/create-chat/ui/create-chat-dialog/create-chat-dialog';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials } from '@shared/test/msw/green-api';
import { server } from '@shared/test/msw/server';

const renderDialog = () => {
  const onClose = jest.fn();
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });

  render(
    <Provider store={store}>
      <CreateChatDialog onClose={onClose} />
    </Provider>,
  );

  return { store, onClose, user: userEvent.setup() };
};

const getPhoneField = () => screen.getByLabelText('Phone number');

describe('CreateChatDialog', () => {
  const onRequest = jest.fn();

  beforeEach(() => {
    mockGreenApi();
    server.events.on('request:start', onRequest);
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('shows the field with its hint and focuses it', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'New chat' })).toBeInTheDocument();
    expect(getPhoneField()).toHaveFocus();
    expect(getPhoneField()).toHaveAccessibleDescription('International format, e.g. +7 900 123-45-67');
  });

  it('shows an error and sends no request for a number that is not valid (AC-10)', async () => {
    const { user, onClose } = renderDialog();

    await user.type(getPhoneField(), '12ab{Enter}');

    expect(getPhoneField()).toHaveAccessibleDescription('Enter the number in international format, digits only');
    expect(onRequest).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('creates the chat and closes when Enter is pressed (AC-7)', async () => {
    const { user, onClose, store } = renderDialog();

    await user.type(getPhoneField(), '+7 (900) 123-45-67{Enter}');

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(Object.values(store.getState().chats.entities)).toEqual([expect.objectContaining({ phone: '79001234567' })]);
    expect(store.getState().chats.activeChatId).toBe('11234567');
  });

  it('creates the chat when "Start chat" is clicked', async () => {
    const { user, onClose } = renderDialog();

    await user.type(getPhoneField(), '79001234567');
    await user.click(screen.getByRole('button', { name: 'Start chat' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes on Escape and on "Cancel" without a request', async () => {
    const { user, onClose } = renderDialog();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('shows the error of the server and stays open (AC-9)', async () => {
    const { user, onClose } = renderDialog();

    await user.type(getPhoneField(), '+7 900 000-00-00{Enter}');

    await waitFor(() => expect(getPhoneField()).toBeInvalid());
    expect(getPhoneField()).toHaveAccessibleDescription(
      "This number isn't on Telegram, or its owner hides it in privacy settings.",
    );
    expect(getPhoneField()).toBeEnabled();
    expect(getPhoneField()).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cannot be closed while the number is being checked', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post('*/checkAccount/*', async () => {
        await gate;

        return HttpResponse.json({ exist: true, chatId: '11234567' });
      }),
    );
    const { user, onClose } = renderDialog();

    await user.type(getPhoneField(), '79001234567{Enter}');
    await user.keyboard('{Escape}');

    expect(getPhoneField()).toHaveAttribute('readonly');
    expect(getPhoneField()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    release();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
