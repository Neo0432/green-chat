import classNames from 'classnames/bind';

import type { ModalProps } from '../modal';

import styles from './modal.module.scss';

const cn = classNames.bind(styles);

type Props = Pick<ModalProps, 'className'>;

export const getClasses = ({ className }: Props) => {
  const cnBackdrop = cn('modal');
  const cnDialog = cn('modal__dialog', className);
  const cnTitle = cn('modal__title');
  const cnBody = cn('modal__body');
  const cnFooter = cn('modal__footer');

  return { cnBackdrop, cnDialog, cnTitle, cnBody, cnFooter };
};
