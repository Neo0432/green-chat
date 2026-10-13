import classNames from 'classnames/bind';

import styles from './chat-page.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-page');
  const cnChatArea = cn('chat-page__chat-area');
  const cnPlaceholder = cn('chat-page__placeholder');

  return { cnRoot, cnChatArea, cnPlaceholder };
};
