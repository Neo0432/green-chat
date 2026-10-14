import classNames from 'classnames/bind';

import styles from './sidebar-header.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('sidebar-header');
  const cnTitle = cn('sidebar-header__title');
  const cnMockPill = cn('sidebar-header__mock-pill');

  return { cnRoot, cnTitle, cnMockPill };
};
