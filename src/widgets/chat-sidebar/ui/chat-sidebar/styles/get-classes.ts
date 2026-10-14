import classNames from 'classnames/bind';

import styles from './chat-sidebar.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-sidebar');
  const cnCreateChatButton = cn('chat-sidebar__create-chat-button');

  return { cnRoot, cnCreateChatButton };
};
