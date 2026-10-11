import classNames from 'classnames/bind';

import styles from './app.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('app');
  const cnTitle = cn('app__title');

  return { cnRoot, cnTitle };
};
