import { render, screen } from '@testing-library/react';

import { App } from '@app/app';

describe('App', () => {
  it('renders the app name as the page heading', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'green-chat' })).toBeInTheDocument();
  });
});
