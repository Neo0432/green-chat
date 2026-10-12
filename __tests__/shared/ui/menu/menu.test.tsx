import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Menu } from '@shared/ui/menu';
import { Modal } from '@shared/ui/modal';

const renderMenu = () => {
  const user = userEvent.setup();
  const onLogout = jest.fn();
  const onSettings = jest.fn();

  render(
    <>
      <button type="button">Outside</button>
      <Menu
        caption="Instance 4100000001"
        items={[
          { label: 'Settings', icon: <svg data-testid="settings-icon" />, onSelect: onSettings },
          { label: 'Log out', tone: 'danger', onSelect: onLogout },
        ]}
        renderTrigger={(triggerProps) => (
          <button type="button" {...triggerProps}>
            Open menu
          </button>
        )}
      />
    </>,
  );

  return { user, onLogout, onSettings, trigger: screen.getByRole('button', { name: 'Open menu' }) };
};

describe('Menu', () => {
  it('is closed until the trigger is clicked', () => {
    const { trigger } = renderMenu();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a menu named by the trigger with one menuitem per item', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);

    expect(screen.getByRole('menu', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Settings', 'Log out']);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('menu').id);
  });

  it('shows the caption as plain text, not as a menuitem', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);

    expect(screen.getByText('Instance 4100000001')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Instance/ })).not.toBeInTheDocument();
  });

  it('describes the menu with the caption', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);

    expect(screen.getByRole('menu')).toHaveAccessibleDescription('Instance 4100000001');
  });

  it('renders the icon of an item inside its menuitem', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'Settings' })).toContainElement(screen.getByTestId('settings-icon'));
  });

  it('moves the focus to the first item when it opens', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);

    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();
  });

  it('closes on Escape and returns the focus to the trigger', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when the trigger is clicked again', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.click(trigger);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on a click outside and leaves the focus on the clicked control', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Outside' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });

  it('returns the focus to the trigger after a click on a non-focusable area', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.click(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('stays open on a click on the caption', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.click(screen.getByText('Instance 4100000001'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onSelect of the clicked item, closes and returns the focus to the trigger', async () => {
    const { user, trigger, onLogout, onSettings } = renderMenu();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onSettings).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('selects the focused item with Enter', async () => {
    const { user, trigger, onSettings } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{Enter}');

    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('moves the focus between items with the arrow keys, wrapping around', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus();
  });

  it('moves the focus to the first and the last item with Home and End', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();
  });

  it('closes on Tab', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.tab();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape after a click on the caption took the focus off the items', async () => {
    const { user, trigger } = renderMenu();

    await user.click(trigger);
    await user.click(screen.getByText('Instance 4100000001'));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not close an enclosing modal when Escape closes the menu', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal isOpen onClose={onClose} title="Settings">
        <Menu
          items={[{ label: 'Log out', onSelect: jest.fn() }]}
          renderTrigger={(triggerProps) => (
            <button type="button" {...triggerProps}>
              Open menu
            </button>
          )}
        />
      </Modal>,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
