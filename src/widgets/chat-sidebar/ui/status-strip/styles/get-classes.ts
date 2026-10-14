import classNames from 'classnames/bind';

import styles from './status-strip.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnConnecting = cn('status-strip', 'status-strip--connecting');
  const cnError = cn('status-strip', 'status-strip--error');

  return { cnConnecting, cnError };
};
