import classNames from 'classnames/bind';

import type { MenuProps } from '../menu';

import styles from './menu.module.scss';

const cn = classNames.bind(styles);

type Props = Pick<MenuProps, 'className'>;

export const getClasses = ({ className }: Props) => {
  const cnRoot = cn('menu', className);
  const cnDropdown = cn('menu__dropdown');
  const cnCaption = cn('menu__caption');
  const cnItem = cn('menu__item');
  const cnItemDanger = cn('menu__item', 'menu__item--danger');
  const cnIcon = cn('menu__icon');
  const cnLabel = cn('menu__label');

  return { cnRoot, cnDropdown, cnCaption, cnItem, cnItemDanger, cnIcon, cnLabel };
};
