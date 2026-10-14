import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button, BUTTON_VARIANTS } from '@shared/ui/button';

describe('Button', () => {
  it.each(BUTTON_VARIANTS)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Cancel</Button>);

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(`button--${variant}`);
  });

  it('renders a button of type "button" by default', () => {
    render(<Button>Sign in</Button>);

    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'button');
  });

  it('passes the type through', () => {
    render(<Button type="submit">Sign in</Button>);

    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<Button onClick={onClick}>Sign in</Button>);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <Button disabled onClick={onClick}>
        Sign in
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  describe('when loading', () => {
    it('is disabled and busy', () => {
      render(<Button isLoading>Sign in</Button>);

      const button = screen.getByRole('button', { name: 'Sign in' });

      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('does not call onClick', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();

      render(
        <Button isLoading onClick={onClick}>
          Sign in
        </Button>,
      );

      await user.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('shows the loading text instead of the children', () => {
      render(
        <Button isLoading loadingText="Please wait…">
          Sign in
        </Button>,
      );

      expect(screen.getByRole('button', { name: 'Please wait…' })).toBeInTheDocument();
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
    });

    it('keeps the children when there is no loading text', () => {
      render(<Button isLoading>Start chat</Button>);

      expect(screen.getByRole('button', { name: 'Start chat' })).toBeInTheDocument();
    });
  });

  it('is not busy when idle', () => {
    render(
      <Button loadingText="Please wait…" variant="text">
        Cancel
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveAttribute('aria-busy');
  });
});
