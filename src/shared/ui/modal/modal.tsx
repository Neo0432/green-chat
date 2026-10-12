import { type MouseEvent, type ReactNode, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getClasses } from './styles/get-classes';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(',');

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

type ModalDialogProps = Omit<ModalProps, 'isOpen'>;

const ModalDialog = ({ onClose, title, children, footer, className }: ModalDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isPressedInsideRef = useRef(false);
  const titleId = useId();
  // Read during render: the children's effects run before this component's and may already have moved the focus.
  const [opener] = useState(() => document.activeElement);
  const handleClose = useEffectEvent(onClose);
  const { cnBackdrop, cnDialog, cnTitle, cnBody, cnFooter } = getClasses({ className });

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog?.contains(document.activeElement)) {
      (dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialog)?.focus();
    }

    return () => {
      // Focus is on <body> when the focused element was inside the dialog. Focus a consumer moved elsewhere stays there.
      if (opener instanceof HTMLElement && document.activeElement === document.body) {
        opener.focus();
      }
    };
  }, [opener]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!event.defaultPrevented && !event.isComposing) {
          event.preventDefault();
          handleClose();
        }

        return;
      }

      const dialog = dialogRef.current;

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const first = focusable.at(0) ?? dialog;
      const last = focusable.at(-1) ?? dialog;
      const { activeElement } = document;
      const isOnContainer = activeElement === dialog || !dialog.contains(activeElement);

      if (event.shiftKey && (isOnContainer || activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (isOnContainer || activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (event: MouseEvent) => {
    isPressedInsideRef.current = event.target !== event.currentTarget;
  };

  // A text selection dragged from the dialog onto the backdrop also ends in a click on the backdrop.
  const handleClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget && !isPressedInsideRef.current) {
      onClose();
    }
  };

  return createPortal(
    <div className={cnBackdrop} role="presentation" onMouseDown={handleMouseDown} onClick={handleClick}>
      <div ref={dialogRef} className={cnDialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className={cnTitle}>
          {title}
        </h2>
        <div className={cnBody}>{children}</div>
        {footer && <div className={cnFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export const Modal = ({ isOpen, ...rest }: ModalProps) => (isOpen ? <ModalDialog {...rest} /> : null);
