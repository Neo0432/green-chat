import classNames from 'classnames/bind';

import type { ButtonProps } from '../button';

import styles from './button.module.scss';

const cn = classNames.bind(styles);

type Props = Pick<ButtonProps, 'className' | 'isFullWidth' | 'isLoading' | 'variant'>;

export const getClasses = ({ className, isFullWidth, isLoading, variant }: Props) => {
  const cnRoot = cn(
    'button',
    `button--${variant}`,
    { 'button--full-width': isFullWidth, 'button--loading': isLoading },
    className,
  );

  return { cnRoot };
};
