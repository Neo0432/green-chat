import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatWindow } from '@widgets/chat-window';

import { type Chat, chatsActions, messagesActions, type MessagesByChat, selectMessagesByChat } from '@entities/chat';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials } from '@shared/test/msw/green-api';

import { buildChat, buildMessage } from '../../../../entities/chat/fixtures';

const renderWindow = (chats: Chat[], activeChatId: string | null, messages: MessagesByChat = {}) => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });
  store.dispatch(chatsActions.chatsHydrated({ chats, activeChatId }));
  store.dispatch(messagesActions.messagesHydrated(messages));

  render(
    <Provider store={store}>
      <ChatWindow />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const getInput = () => screen.getByRole('textbox', { name: 'Message' });

describe('ChatWindow', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  it('asks to select a chat when none is active, and shows no header', () => {
    renderWindow([buildChat()], null);

    expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the title and the phone of the active chat in the header (FR-2.9, AC-7)', () => {
    renderWindow([buildChat({ chatId: '11', title: '+79001234567', phone: '79001234567' })], '11');

    expect(screen.getByRole('heading', { level: 2, name: '+79001234567' })).toBeInTheDocument();
    expect(screen.getByText('+79001234567', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('Select a chat to start messaging')).not.toBeInTheDocument();
  });

  it('shows the Telegram ID when the phone is not known', () => {
    renderWindow([buildChat({ chatId: '20000001', title: 'Alice (mock)', phone: null })], '20000001');

    expect(screen.getByRole('heading', { level: 2, name: 'Alice (mock)' })).toBeInTheDocument();
    expect(screen.getByText('Telegram ID 20000001')).toBeInTheDocument();
  });

  it('says there are no messages yet, and focuses the composer', () => {
    renderWindow([buildChat()], '10000001');

    expect(screen.getByRole('log')).toHaveTextContent('No messages here yet');
    expect(getInput()).toHaveFocus();
  });

  it('lists the messages with their times and a date separator (§7.9, §7.10)', () => {
    const today = new Date().setHours(9, 5, 0, 0);
    const lastYear = new Date(2025, 9, 11, 14, 30).getTime();
    renderWindow([buildChat()], '10000001', {
      '10000001': [
        buildMessage({ localId: 'a', direction: 'in', status: null, text: 'Hi there', timestamp: lastYear }),
        buildMessage({ localId: 'b', text: 'Hello', timestamp: today }),
      ],
    });

    const log = screen.getByRole('log');

    expect(log).not.toHaveTextContent('No messages here yet');
    expect(log).toHaveTextContent('October 11, 2025');
    expect(log).toHaveTextContent('Today');
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toHaveAttribute('title', 'October 11, 2025 at 14:30');
    expect(screen.getByText('09:05')).toBeInTheDocument();
  });

  it('shows one bubble for a sent message, which ends up sent (AC-11)', async () => {
    const { store, user } = renderWindow([buildChat()], '10000001');

    await user.type(getInput(), 'Hello{Enter}');

    expect(screen.getAllByText('Hello')).toHaveLength(1);
    await waitFor(() => {
      expect(selectMessagesByChat(store.getState(), '10000001')[0].status).toBe('sent');
    });
    expect(screen.getAllByText('Hello')).toHaveLength(1);
  });

  it('shows a failed message with a retry button, and sends it again on click (AC-14)', async () => {
    const { store, user } = renderWindow([buildChat()], '10000001');

    await user.type(getInput(), 'test #fail-once{Enter}');
    const retryButton = await screen.findByRole('button', { name: 'Retry sending' });

    expect(retryButton).toHaveAttribute('title', 'Not sent: GREEN-API error (HTTP 500).');

    await user.click(retryButton);

    await waitFor(() => {
      expect(selectMessagesByChat(store.getState(), '10000001')).toEqual([expect.objectContaining({ status: 'sent' })]);
    });
    expect(screen.queryByRole('button', { name: 'Retry sending' })).not.toBeInTheDocument();
    expect(screen.getAllByText('test #fail-once')).toHaveLength(1);
  });

  it('starts every chat with an empty field (the draft belongs to a chat)', async () => {
    const { store, user } = renderWindow(
      [buildChat({ chatId: '1', title: 'Alice' }), buildChat({ chatId: '2', title: 'Bob' })],
      '1',
    );

    await user.type(getInput(), 'unsent draft');
    store.dispatch(chatsActions.chatActivated('2'));

    expect(await screen.findByRole('heading', { level: 2, name: 'Bob' })).toBeInTheDocument();
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveFocus();
  });
});
