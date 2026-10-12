import classNames from 'classnames/bind';

import type { IconButtonProps } from '../icon-button';

import styles from './icon-button.module.scss';

const cn = classNames.bind(styles);

type Props = Pick<IconButtonProps, 'className' | 'variant'>;

export const getClasses = ({ className, variant }: Props) => {
  const cnRoot = cn('icon-button', `icon-button--${variant}`, className);

  return { cnRoot };
};
