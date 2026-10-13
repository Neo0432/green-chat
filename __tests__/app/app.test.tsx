import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { App } from '@app/app';
import { createAppStore } from '@app/store';

import { sessionActions } from '@entities/session';
import { saveCredentials } from '@entities/session/lib/credentials-storage';

import { mockGreenApi } from '@shared/test/mock-green-api';
import { createMockCredentials, MOCK_TOKEN, PRIMARY_INSTANCE_ID } from '@shared/test/msw/green-api';

const renderApp = () => {
  const store = createAppStore();

  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

const getLoginHeading = () => screen.queryByRole('heading', { level: 1, name: 'Sign in to green-chat' });

const getChatTitle = () => screen.queryByRole('heading', { level: 1, name: 'green-chat' });

describe('App', () => {
  beforeEach(() => {
    mockGreenApi();
  });

  it('shows the login page when nobody is signed in', () => {
    renderApp();

    expect(getLoginHeading()).toBeInTheDocument();
    expect(getChatTitle()).not.toBeInTheDocument();
  });

  it('shows the chat page straight away when credentials are stored (FR-1.7, AC-5)', () => {
    saveCredentials(createMockCredentials());

    renderApp();

    expect(getChatTitle()).toBeInTheDocument();
    expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
    expect(getLoginHeading()).not.toBeInTheDocument();
  });

  it('opens the chat page after a successful sign-in', async () => {
    const { user } = renderApp();

    await user.type(screen.getByLabelText('Instance ID'), PRIMARY_INSTANCE_ID);
    await user.type(screen.getByLabelText('API token'), MOCK_TOKEN);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'green-chat' })).toBeInTheDocument();
    expect(getLoginHeading()).not.toBeInTheDocument();
  });

  it('returns to an empty login page after logging out, with no green-chat keys left (AC-6)', async () => {
    saveCredentials(createMockCredentials());
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(getLoginHeading()).toBeInTheDocument();
    expect(screen.getByLabelText('Instance ID')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.localStorage).toHaveLength(0);
  });

  it('returns to the login page on a forced sign-out, with the Instance ID and the reason (FR-1.9)', () => {
    saveCredentials(createMockCredentials());
    window.localStorage.setItem('green-chat:v1:data:4100000001', '{}');
    const { store } = renderApp();

    act(() => {
      store.dispatch(sessionActions.forcedSignOut());
    });

    expect(getLoginHeading()).toBeInTheDocument();
    expect(screen.getByLabelText('Instance ID')).toHaveValue(PRIMARY_INSTANCE_ID);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your credentials were rejected by GREEN-API. Please sign in again.',
    );
    expect(Object.keys(window.localStorage)).toEqual(['green-chat:v1:data:4100000001']);
  });
});
