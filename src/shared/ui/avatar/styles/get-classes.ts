import classNames from 'classnames/bind';

import type { AvatarColor } from '@shared/lib';

import type { AvatarProps } from '../avatar';

import styles from './avatar.module.scss';

const cn = classNames.bind(styles);

interface Props extends Pick<AvatarProps, 'className' | 'size'> {
  color: AvatarColor;
}

export const getClasses = ({ className, color, size }: Props) => {
  const cnRoot = cn('avatar', `avatar--${size}`, `avatar--${color}`, className);

  return { cnRoot };
};
