import classNames from 'classnames/bind';

import styles from './chat-header.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('chat-header');
  const cnText = cn('chat-header__text');
  const cnTitle = cn('chat-header__title');
  const cnSubtitle = cn('chat-header__subtitle');

  return { cnRoot, cnText, cnTitle, cnSubtitle };
};
