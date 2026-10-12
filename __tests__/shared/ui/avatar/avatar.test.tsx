import { render, screen } from '@testing-library/react';

import { Avatar } from '@shared/ui/avatar';

describe('Avatar', () => {
  it('shows the initials of the title', () => {
    render(<Avatar chatId="10000000" title="alice smith" />);

    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('shows one digit for a phone title', () => {
    render(<Avatar chatId="10000000" title="+79001234567" />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('is hidden from assistive technology, the title is announced next to it', () => {
    render(<Avatar chatId="10000000" title="Alice" />);

    expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true');
  });

  it('passes the className through', () => {
    render(<Avatar chatId="10000000" title="Alice" size={42} className="custom" />);

    expect(screen.getByText('A')).toHaveClass('custom');
  });
});
