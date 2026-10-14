import classNames from 'classnames/bind';

import styles from './composer.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('composer');
  const cnHint = cn('composer__hint');
  const cnRow = cn('composer__row');
  const cnInput = cn('composer__input');

  return { cnRoot, cnHint, cnRow, cnInput };
};
