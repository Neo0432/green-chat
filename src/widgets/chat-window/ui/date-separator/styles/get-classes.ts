import classNames from 'classnames/bind';

import styles from './date-separator.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('date-separator');

  return { cnRoot };
};
