import classNames from 'classnames/bind';

import styles from './chat-window.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-window');
  const cnBody = cn('chat-window__body');
  const cnPlaceholder = cn('chat-window__placeholder');

  return { cnRoot, cnBody, cnPlaceholder };
};
