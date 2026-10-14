import classNames from 'classnames/bind';

import styles from './chat-page.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-page');

  return { cnRoot };
};
