import classNames from 'classnames/bind';

import styles from './message-list.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('message-list');
  const cnColumn = cn('message-list__column');
  const cnEmpty = cn('message-list__empty');

  return { cnRoot, cnColumn, cnEmpty };
};
