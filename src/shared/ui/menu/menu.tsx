import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { getClasses } from './styles/get-classes';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  tone?: 'danger';
  onSelect: () => void;
}

export interface MenuTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  id: string;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
}

export interface MenuProps {
  items: MenuItem[];
  caption?: string;
  renderTrigger: (props: MenuTriggerProps) => ReactNode;
  className?: string;
}

const getNextIndex = (key: string, current: number, lastIndex: number) => {
  switch (key) {
    case 'ArrowDown':
      return current >= lastIndex ? 0 : current + 1;
    case 'ArrowUp':
      return current <= 0 ? lastIndex : current - 1;
    case 'Home':
      return 0;
    case 'End':
      return lastIndex;
    default:
      return undefined;
  }
};

export const Menu = ({ items, caption, renderTrigger, className }: MenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();
  const captionId = useId();
  const { cnRoot, cnDropdown, cnCaption, cnItem, cnItemDanger, cnIcon, cnLabel } = getClasses({ className });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => document.removeEventListener('click', handleClick, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trigger = triggerRef.current;

    dropdownRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    return () => {
      if (document.activeElement === document.body) {
        trigger?.focus();
      }
    };
  }, [isOpen]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);

      return;
    }

    if (event.key === 'Tab') {
      setIsOpen(false);

      return;
    }

    const menuItems = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const current = menuItems.findIndex((item) => item === document.activeElement);
    const nextIndex = getNextIndex(event.key, current, menuItems.length - 1);

    if (nextIndex !== undefined) {
      event.preventDefault();
      menuItems.at(nextIndex)?.focus();
    }
  };

  const handleSelect = (item: MenuItem) => {
    triggerRef.current?.focus();
    setIsOpen(false);
    item.onSelect();
  };

  return (
    <div ref={rootRef} className={cnRoot}>
      {renderTrigger({
        ref: triggerRef,
        id: triggerId,
        onClick: () => setIsOpen((prev) => !prev),
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? menuId : undefined,
      })}

      {isOpen && (
        <div ref={dropdownRef} className={cnDropdown} role="presentation" tabIndex={-1} onKeyDown={handleKeyDown}>
          {caption && (
            <p id={captionId} className={cnCaption}>
              {caption}
            </p>
          )}
          <div id={menuId} role="menu" aria-labelledby={triggerId} aria-describedby={caption ? captionId : undefined}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={item.tone === 'danger' ? cnItemDanger : cnItem}
                onClick={() => handleSelect(item)}
              >
                {item.icon && (
                  <span className={cnIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className={cnLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
