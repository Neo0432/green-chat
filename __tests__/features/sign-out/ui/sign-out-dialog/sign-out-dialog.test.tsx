import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { SignOutDialog } from '@features/sign-out';

import { createMockCredentials } from '@shared/test/msw/green-api';

const renderDialog = () => {
  const store = createAppStore({
    session: { credentials: createMockCredentials(), instanceState: 'authorized', forcedSignOut: null },
  });
  const onClose = jest.fn();

  render(
    <Provider store={store}>
      <SignOutDialog isOpen onClose={onClose} />
    </Provider>,
  );

  return { store, onClose, user: userEvent.setup() };
};

describe('SignOutDialog', () => {
  it('asks for a confirmation and warns about the local history (§7.12)', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Log out of green-chat?' })).toBeInTheDocument();
    expect(screen.getByText('Local chat history on this device will be deleted.')).toBeInTheDocument();
  });

  it('closes on Cancel and stays signed in', async () => {
    const { user, onClose, store } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(store.getState().session.credentials).not.toBeNull();
  });
});
