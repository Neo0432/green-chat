import classNames from 'classnames/bind';

import styles from './chat-list.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-list');
  const cnList = cn('chat-list__list');
  const cnEmpty = cn('chat-list__empty');

  return { cnRoot, cnList, cnEmpty };
};
