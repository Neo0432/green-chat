import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { createAppStore } from '@app/store';

import { LoginPage } from '@pages/login';

describe('LoginPage', () => {
  it('links the GREEN-API console in a new tab without a referrer', () => {
    render(
      <Provider store={createAppStore()}>
        <LoginPage />
      </Provider>,
    );

    const link = screen.getByRole('link', { name: 'console.green-api.com' });

    expect(link).toHaveAttribute('href', 'https://console.green-api.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
