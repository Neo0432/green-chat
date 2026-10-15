import classNames from 'classnames/bind';

import styles from './login-page.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('login-page');
  const cnContent = cn('login-page__content');
  const cnLogo = cn('login-page__logo');
  const cnTitle = cn('login-page__title');
  const cnSubtitle = cn('login-page__subtitle');
  const cnLink = cn('login-page__link');

  return { cnRoot, cnContent, cnLogo, cnTitle, cnSubtitle, cnLink };
};
