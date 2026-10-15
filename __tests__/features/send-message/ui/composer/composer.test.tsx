import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { Composer } from '@features/send-message';

import { selectMessagesByChat } from '@entities/chat';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { mockMatchMedia } from '@shared/test/mock-match-media';
import { createMockCredentials } from '@shared/test/msw/green-api';

const CHAT_ID = '10000001';

const renderComposer = () => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });

  render(
    <Provider store={store}>
      <Composer chatId={CHAT_ID} />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const getInput = () => screen.getByRole('textbox', { name: 'Message' });
const getSendButton = () => screen.getByRole('button', { name: 'Send message' });

const waitForSent = (store: ReturnType<typeof renderComposer>['store']) =>
  waitFor(() => {
    expect(selectMessagesByChat(store.getState(), CHAT_ID).every(({ status }) => status === 'sent')).toBe(true);
  });

describe('Composer', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  it('is focused, with the placeholder, and cannot send an empty field', () => {
    renderComposer();

    expect(getInput()).toHaveFocus();
    expect(getInput()).toHaveAttribute('placeholder', 'Message');
    expect(getSendButton()).toBeDisabled();
  });

  it('does not take the focus on a phone, so that the keyboard stays closed (FR-2.7)', () => {
    mockMatchMedia(true);

    renderComposer();

    expect(getInput()).not.toHaveFocus();
  });

  it('sends the text on Enter, clears the field and keeps the focus (AC-11)', async () => {
    const { store, user } = renderComposer();

    await user.type(getInput(), 'Hello{Enter}');

    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toEqual([
      expect.objectContaining({ text: 'Hello', direction: 'out' }),
    ]);
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveFocus();
    await waitForSent(store);
  });

  it('sends the text from the button, and the focus returns to the field', async () => {
    const { store, user } = renderComposer();

    await user.type(getInput(), 'Hello');
    await user.click(getSendButton());

    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toHaveLength(1);
    expect(getInput()).toHaveFocus();
    await waitForSent(store);
  });

  it('sends one message with a line break on Shift+Enter and then Enter (AC-12)', async () => {
    const { store, user } = renderComposer();

    await user.type(getInput(), 'first{Shift>}{Enter}{/Shift}second{Enter}');

    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toEqual([
      expect.objectContaining({ text: 'first\nsecond' }),
    ]);
    await waitForSent(store);
  });

  it('sends the trimmed text', async () => {
    const { store, user } = renderComposer();

    await user.type(getInput(), '  padded  {Enter}');

    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toEqual([expect.objectContaining({ text: 'padded' })]);
    await waitForSent(store);
  });

  it('sends nothing on Enter in an empty or whitespace-only field, and disables the button (AC-13)', async () => {
    const { store, user } = renderComposer();

    await user.type(getInput(), '{Enter}');
    await user.type(getInput(), '   {Enter}');

    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toEqual([]);
    expect(getSendButton()).toBeDisabled();
    expect(getInput()).toHaveValue('   ');
  });

  it('allows 4096 characters', async () => {
    const { store, user } = renderComposer();

    await user.click(getInput());
    await user.paste('x'.repeat(4096));

    expect(getSendButton()).toBeEnabled();
    expect(screen.queryByText(/too long/)).not.toBeInTheDocument();

    await user.click(getSendButton());
    await waitForSent(store);
  });

  it('blocks 4097 characters, with a hint above the field (FR-3.3)', async () => {
    const { store, user } = renderComposer();

    await user.click(getInput());
    await user.paste('x'.repeat(4097));
    await user.keyboard('{Enter}');

    expect(screen.getByText('Message is too long (4097/4096)')).toBeInTheDocument();
    expect(getInput()).toHaveAccessibleDescription('Message is too long (4097/4096)');
    expect(getSendButton()).toBeDisabled();
    expect(selectMessagesByChat(store.getState(), CHAT_ID)).toEqual([]);
  });
});
