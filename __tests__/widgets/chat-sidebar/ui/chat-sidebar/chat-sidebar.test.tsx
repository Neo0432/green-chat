import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { ChatSidebar } from '@widgets/chat-sidebar';

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

  return { user: userEvent.setup() };
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
});
