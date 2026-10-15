import type { ComponentPropsWithRef } from 'react';

import { getClasses } from './styles/get-classes';
import type { IconButtonVariant } from './constants';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'aria-label'> {
  label: string;
  variant?: IconButtonVariant;
}

export const IconButton = ({
  label,
  variant = 'ghost',
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) => {
  const { cnRoot } = getClasses({ className, variant });

  return (
    <button className={cnRoot} type={type} aria-label={label} {...rest}>
      {children}
    </button>
  );
};
