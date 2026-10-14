import classNames from 'classnames/bind';

import type { Message } from '@entities/chat';

import styles from './message-bubble.module.scss';

const cn = classNames.bind(styles);

interface Props {
  direction: Message['direction'];
}

export const getClasses = ({ direction }: Props) => {
  const cnRoot = cn('message-bubble', `message-bubble--${direction}`);
  const cnText = cn('message-bubble__text');
  const cnMeta = cn('message-bubble__meta');
  const cnStatus = cn('message-bubble__status');
  const cnRetry = cn('message-bubble__retry');

  return { cnRoot, cnText, cnMeta, cnStatus, cnRetry };
};
