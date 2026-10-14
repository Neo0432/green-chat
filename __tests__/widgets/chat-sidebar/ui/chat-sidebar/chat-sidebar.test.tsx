import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatSidebar } from '@widgets/chat-sidebar';

import { receiveActions } from '@features/receive-messages/model/receive-slice';

import { sessionActions } from '@entities/session';

import { ENV } from '@shared/config';
import { createMockCredentials } from '@shared/test/msw/green-api';

const renderSidebar = () => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });

  render(
    <Provider store={store}>
      <ChatSidebar />
    </Provider>,
  );

  return { store, user: userEvent.setup() };
};

describe('ChatSidebar', () => {
  it('shows the app title', () => {
    renderSidebar();

    expect(screen.getByRole('heading', { level: 1, name: 'green-chat' })).toBeInTheDocument();
  });

  it('opens a menu that names the instance and offers "Log out"', async () => {
    const { user } = renderSidebar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByText('Instance 4100000001')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Log out']);
  });

  it('hides the MOCK pill outside mock mode', () => {
    renderSidebar();

    expect(screen.queryByText('MOCK')).not.toBeInTheDocument();
  });

  it('shows the MOCK pill in mock mode (MK-4)', () => {
    jest.replaceProperty(ENV, 'enableApiMocks', true);

    renderSidebar();

    expect(screen.getByText('MOCK')).toBeInTheDocument();
  });

  describe('status strip', () => {
    it('shows nothing while all is well', () => {
      renderSidebar();

      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('says "Connecting…" while the polling cannot reach GREEN-API, and goes away when it can (AC-24)', () => {
      const { store } = renderSidebar();

      act(() => {
        store.dispatch(receiveActions.pollFailed(null));
      });

      expect(screen.getByRole('status')).toHaveTextContent('Connecting…');

      act(() => {
        store.dispatch(receiveActions.pollRecovered());
      });

      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('shows a problem of the polling (AC-19) and a state of the instance that is not authorized (AC-18)', () => {
      const { store } = renderSidebar();

      act(() => {
        store.dispatch(sessionActions.instanceStateChanged('notAuthorized'));
      });

      expect(screen.getByRole('status')).toHaveTextContent("The instance isn't linked to a Telegram account");

      act(() => {
        store.dispatch(receiveActions.errorSet('Tariff limit reached.'));
      });

      expect(screen.getByRole('status')).toHaveTextContent('Tariff limit reached.');

      act(() => {
        store.dispatch(receiveActions.pollRecovered());
        store.dispatch(sessionActions.instanceStateChanged('authorized'));
      });

      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });
});
