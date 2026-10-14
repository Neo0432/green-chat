import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatPage } from '@pages/chat';

import { chatsActions, selectActiveChatId } from '@entities/chat';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { mockMatchMedia } from '@shared/test/mock-match-media';
import { createMockCredentials } from '@shared/test/msw/green-api';

import { buildChat } from '../../../../entities/chat/fixtures';

const renderPage = (activeChatId: string | null = null) => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });
  store.dispatch(chatsActions.chatsHydrated({ chats: [buildChat({ chatId: '11', title: 'Alice' })], activeChatId }));

  render(
    <Provider store={store}>
      <ChatPage />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const getChatList = () => screen.queryByRole('complementary', { name: 'Chats' });
const getChatWindow = () => screen.queryByRole('main');
const getBackButton = () => screen.queryByRole('button', { name: 'Back to chats' });
const getComposerInput = () => screen.queryByRole('textbox', { name: 'Message' });

describe('ChatPage', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  describe('on a phone (< 600 px)', () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it('shows only the chat list when no chat is active', () => {
      renderPage();

      expect(getChatList()).toBeInTheDocument();
      expect(getChatWindow()).not.toBeInTheDocument();
    });

    it('goes from the list to the chat and back with the back button (AC-22)', async () => {
      const { store, user } = renderPage();

      await user.click(screen.getByRole('button', { name: /^Alice, / }));

      expect(getChatList()).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Alice' })).toBeInTheDocument();
      expect(getComposerInput()).toBeInTheDocument();
      expect(getBackButton()).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Back to chats' }));

      expect(getChatList()).toBeInTheDocument();
      expect(getChatWindow()).not.toBeInTheDocument();
      expect(selectActiveChatId(store.getState())).toBeNull();
    });

    it('does not focus the composer of a chat that was just opened (FR-2.7)', async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole('button', { name: /^Alice, / }));

      expect(getComposerInput()).not.toHaveFocus();
    });

    it('opens on the chat that was active before a reload', () => {
      renderPage('11');

      expect(getChatList()).not.toBeInTheDocument();
      expect(getBackButton()).toBeInTheDocument();
    });
  });

  describe('on a wider window (>= 600 px)', () => {
    it('shows the list next to the chat, without a back button', () => {
      renderPage('11');

      expect(getChatList()).toBeInTheDocument();
      expect(getChatWindow()).toBeInTheDocument();
      expect(getBackButton()).not.toBeInTheDocument();
      expect(getComposerInput()).toHaveFocus();
    });

    it('focuses the composer when the chat that is active already is clicked (FR-2.7)', async () => {
      const { user } = renderPage('11');
      const chatItem = screen.getByRole('button', { name: /^Alice, / });
      act(() => chatItem.focus());

      expect(getComposerInput()).not.toHaveFocus();

      await user.click(chatItem);

      expect(getComposerInput()).toHaveFocus();
    });

    it('focuses the composer when the active chat is selected with the keyboard', async () => {
      const { user } = renderPage('11');
      act(() => screen.getByRole('button', { name: /^Alice, / }).focus());

      await user.keyboard('{Enter}');

      expect(getComposerInput()).toHaveFocus();
    });

    it('shows the placeholder next to the list when no chat is active', () => {
      renderPage();

      expect(getChatList()).toBeInTheDocument();
      expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
    });
  });

  it('drops the list when the window shrinks below the breakpoint', () => {
    const media = mockMatchMedia(false);
    renderPage('11');

    act(() => media.setMatches(true));

    expect(getChatList()).not.toBeInTheDocument();
    expect(getBackButton()).toBeInTheDocument();
  });
});
