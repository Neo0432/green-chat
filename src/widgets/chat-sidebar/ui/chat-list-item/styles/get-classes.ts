import classNames from 'classnames/bind';

import styles from './chat-list-item.module.scss';

const cn = classNames.bind(styles);

interface Props {
  isActive: boolean;
  isStatusFailed: boolean;
}

export const getClasses = ({ isActive, isStatusFailed }: Props) => {
  const cnRoot = cn('chat-list-item', { 'chat-list-item--active': isActive });
  const cnAvatar = cn('chat-list-item__avatar');
  const cnTitle = cn('chat-list-item__title');
  const cnMeta = cn('chat-list-item__meta');
  const cnStatus = cn('chat-list-item__status', { 'chat-list-item__status--failed': isStatusFailed });
  const cnTime = cn('chat-list-item__time');
  const cnPreview = cn('chat-list-item__preview');
  const cnBadge = cn('chat-list-item__badge');

  return { cnRoot, cnAvatar, cnTitle, cnMeta, cnStatus, cnTime, cnPreview, cnBadge };
};
