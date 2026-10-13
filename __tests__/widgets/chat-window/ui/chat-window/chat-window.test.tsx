import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatWindow } from '@widgets/chat-window';

import { type Chat, chatsActions } from '@entities/chat';

import { createMockCredentials } from '@shared/test/msw/green-api';

import { buildChat } from '../../../../entities/chat/fixtures';

const renderWindow = (chats: Chat[], activeChatId: string | null) => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });
  store.dispatch(chatsActions.chatsHydrated({ chats, activeChatId }));

  render(
    <Provider store={store}>
      <ChatWindow />
    </Provider>,
  );
};

describe('ChatWindow', () => {
  it('asks to select a chat when none is active, and shows no header', () => {
    renderWindow([buildChat()], null);

    expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
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
});
