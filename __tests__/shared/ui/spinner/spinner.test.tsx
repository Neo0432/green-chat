import { render, screen } from '@testing-library/react';

import { Spinner } from '@shared/ui/spinner';

describe('Spinner', () => {
  it('exposes a status with the label for screen readers', () => {
    render(<Spinner label="Connecting…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Connecting…');
  });

  it('is hidden from screen readers without a label', () => {
    render(<Spinner />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
