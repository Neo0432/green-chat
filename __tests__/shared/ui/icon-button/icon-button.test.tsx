import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SvgPencil } from '@shared/assets/icons';
import { IconButton } from '@shared/ui/icon-button';

describe('IconButton', () => {
  it('is named by its label', () => {
    render(
      <IconButton label="New chat">
        <SvgPencil />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'New chat' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <IconButton label="New chat" variant="fab" onClick={onClick}>
        <SvgPencil />
      </IconButton>,
    );

    await user.click(screen.getByRole('button', { name: 'New chat' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <IconButton label="New chat" onClick={onClick}>
        <SvgPencil />
      </IconButton>,
    );

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'New chat' })).toHaveFocus();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
