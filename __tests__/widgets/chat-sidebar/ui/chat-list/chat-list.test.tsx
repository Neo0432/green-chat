import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatSidebar } from '@widgets/chat-sidebar';

import { type Chat, chatsActions, messagesActions, type MessagesByChat } from '@entities/chat';

import { createMockCredentials } from '@shared/test/msw/green-api';

import { buildChat, buildMessage } from '../../../../entities/chat/fixtures';

const renderSidebar = (chats: Chat[] = [], messages: MessagesByChat = {}, activeChatId: string | null = null) => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });
  store.dispatch(chatsActions.chatsHydrated({ chats, activeChatId }));
  store.dispatch(messagesActions.messagesHydrated(messages));

  render(
    <Provider store={store}>
      <ChatSidebar />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const getItems = () => screen.queryAllByRole('listitem').map((item) => within(item).getByRole('button'));

describe('ChatList', () => {
  it('shows the empty-list text and the "New chat" button when there are no chats', () => {
    renderSidebar();

    expect(screen.getByText('No chats yet. Tap ✎ to start a new chat.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument();
    expect(getItems()).toEqual([]);
  });

  it('lists the chats by last activity, newest first (FR-2.1)', () => {
    renderSidebar([
      buildChat({ chatId: '1', title: 'Old', lastActivityAt: 100 }),
      buildChat({ chatId: '2', title: 'New', lastActivityAt: 300 }),
      buildChat({ chatId: '3', title: 'Middle', lastActivityAt: 200 }),
    ]);

    expect(getItems().map((item) => item.textContent)).toEqual([
      expect.stringContaining('New'),
      expect.stringContaining('Middle'),
      expect.stringContaining('Old'),
    ]);
  });

  it('shows "No messages yet" for a chat without messages', () => {
    renderSidebar([buildChat({ title: 'Alice' })]);

    expect(screen.getByRole('button', { name: 'Alice, 0 unread, last message: No messages yet' })).toBeInTheDocument();
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('shows the last message, newlines shown as spaces (FR-2.2)', () => {
    renderSidebar([buildChat({ chatId: '1', title: 'Alice' }), buildChat({ chatId: '2', title: 'Bob' })], {
      '1': [buildMessage({ chatId: '1', text: 'Earlier' }), buildMessage({ chatId: '1', text: 'Line one\nLine two' })],
      '2': [buildMessage({ chatId: '2', direction: 'in', status: null, text: 'Hi there' })],
    });

    const alice = screen.getByRole('button', { name: /^Alice/ });
    const bob = screen.getByRole('button', { name: /^Bob/ });

    expect(alice).toHaveTextContent('Line one Line two');
    expect(bob).toHaveTextContent('Hi there');
  });

  it('shows the unread count in the badge and in the accessible name, capped at 99+', () => {
    renderSidebar([
      buildChat({ chatId: '1', title: 'Few', unreadCount: 3 }),
      buildChat({ chatId: '2', title: 'Many', unreadCount: 150 }),
      buildChat({ chatId: '3', title: 'None', unreadCount: 0 }),
    ]);

    expect(screen.getByRole('button', { name: /^Few, 3 unread/ })).not.toHaveTextContent('99+');
    expect(screen.getByRole('button', { name: /^Many, 150 unread/ })).toHaveTextContent('99+');
    expect(screen.getByRole('button', { name: /^None, 0 unread/ })).not.toHaveTextContent(/\d$/);
  });

  it('marks the active chat', () => {
    renderSidebar([buildChat({ chatId: '1', title: 'Alice' }), buildChat({ chatId: '2', title: 'Bob' })], {}, '2');

    expect(screen.getByRole('button', { name: /^Bob/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /^Alice/ })).not.toHaveAttribute('aria-current');
  });

  it('activates a chat on click and clears its unread badge (FR-2.7)', async () => {
    const { user, store } = renderSidebar([buildChat({ chatId: '1', title: 'Alice', unreadCount: 4 })]);

    await user.click(screen.getByRole('button', { name: /^Alice/ }));

    expect(store.getState().chats.activeChatId).toBe('1');
    expect(screen.getByRole('button', { name: 'Alice, 0 unread, last message: No messages yet' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('opens the New chat dialog from the button', async () => {
    const { user } = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'New chat' }));

    expect(screen.getByRole('dialog', { name: 'New chat' })).toBeInTheDocument();
  });
});
