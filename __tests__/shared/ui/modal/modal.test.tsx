import { useEffect, useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Modal } from '@shared/ui/modal';

const renderModal = ({ isOpen = true, withFooter = true } = {}) => {
  const onClose = jest.fn();

  const view = render(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New chat"
      footer={withFooter ? <button type="button">Cancel</button> : undefined}
    >
      <input aria-label="Phone number" />
    </Modal>,
  );

  return { onClose, ...view };
};

const ModalWithTrigger = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New chat">
        <input aria-label="Phone number" />
      </Modal>
    </>
  );
};

const SelfFocusingInput = ({ label }: { label: string }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return <input ref={ref} aria-label={label} />;
};

describe('Modal', () => {
  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a modal dialog named by its title', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'New chat' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'New chat' })).toBeInTheDocument();
  });

  it('renders the dialog in a portal outside of the render container', () => {
    const { container } = renderModal();

    expect(container).not.toContainElement(screen.getByRole('dialog'));
  });

  it('renders the children and the footer', () => {
    renderModal();

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on other keys', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard('a{Enter}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a click on the backdrop', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('presentation'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a click inside the dialog', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('dialog'));
    await user.click(screen.getByRole('heading', { name: 'New chat' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when a press starts inside the dialog and ends on the backdrop', () => {
    const { onClose } = renderModal();

    fireEvent.mouseDown(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('presentation'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves the focus to the first focusable element when it opens', () => {
    renderModal();

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();
  });

  it('moves the focus to the dialog when it has nothing focusable', () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Notice">
        Nothing to click here.
      </Modal>,
    );

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('keeps the focus inside the dialog when Tab is pressed past the last element', async () => {
    const user = userEvent.setup();

    renderModal();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();
  });

  it('keeps the focus inside the dialog when Shift+Tab is pressed before the first element', async () => {
    const user = userEvent.setup();

    renderModal();

    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('keeps the focus on the dialog when Tab is pressed and nothing inside is focusable', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside</button>
        <Modal isOpen onClose={jest.fn()} title="Notice">
          Nothing to click here.
        </Modal>
      </>,
    );

    await user.tab();
    await user.tab({ shift: true });

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('returns the focus to the element that opened it', async () => {
    const user = userEvent.setup();

    render(<ModalWithTrigger />);

    const trigger = screen.getByRole('button', { name: 'Open' });

    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('returns the focus to the opener after a backdrop click', async () => {
    const user = userEvent.setup();

    render(<ModalWithTrigger />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('presentation'));

    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('returns the focus to the opener when a child moves the focus on mount', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [isOpen, setIsOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New chat">
            <input aria-label="Name" />
            <SelfFocusingInput label="Phone number" />
          </Modal>
        </>
      );
    };

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('keeps the focus a child has already set instead of moving it to the first focusable element', () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="New chat">
        <input aria-label="Name" />
        <SelfFocusingInput label="Phone number" />
      </Modal>,
    );

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();
  });

  it('ignores Escape that another handler has already handled', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <Modal isOpen onClose={onClose} title="New chat">
        <input
          aria-label="Phone number"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
            }
          }}
        />
      </Modal>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores Escape that cancels an IME composition', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Phone number' }), { key: 'Escape', isComposing: true });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('skips hidden inputs and elements taken out of the tab order', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen onClose={jest.fn()} title="New chat">
        <input type="hidden" name="token" />
        <button type="button" tabIndex={-1}>
          Not tabbable
        </button>
        <input aria-label="Phone number" />
        <button type="button">Cancel</button>
        <button type="button" tabIndex={-1}>
          Also not tabbable
        </button>
      </Modal>,
    );

    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus();
  });
});
