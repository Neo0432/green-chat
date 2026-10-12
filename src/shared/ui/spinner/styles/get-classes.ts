import classNames from 'classnames/bind';

import type { SpinnerProps } from '../spinner';

import styles from './spinner.module.scss';

const cn = classNames.bind(styles);

type Props = Pick<SpinnerProps, 'className' | 'size'>;

export const getClasses = ({ className, size }: Props) => {
  const cnRoot = cn('spinner', `spinner--${size}`, className);
  const cnLabel = cn('spinner__label');

  return { cnRoot, cnLabel };
};
