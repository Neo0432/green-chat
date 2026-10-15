import type { ComponentPropsWithRef } from 'react';

import { Spinner } from '@shared/ui/spinner';

import { getClasses } from './styles/get-classes';
import type { ButtonVariant } from './constants';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingText?: string;
  isFullWidth?: boolean;
}

export const Button = ({
  variant = 'primary',
  isLoading = false,
  loadingText,
  isFullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) => {
  const { cnRoot } = getClasses({ className, isFullWidth, isLoading, variant });

  return (
    <button
      className={cnRoot}
      type={type}
      disabled={isLoading || disabled}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading && <Spinner size={20} />}
      {isLoading ? (loadingText ?? children) : children}
    </button>
  );
};
