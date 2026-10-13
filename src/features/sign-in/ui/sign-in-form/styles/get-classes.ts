import classNames from 'classnames/bind';

import styles from './sign-in-form.module.scss';

const cn = classNames.bind(styles);

export const getClasses = () => {
  const cnRoot = cn('sign-in-form');
  const cnToggle = cn('sign-in-form__toggle');
  const cnError = cn('sign-in-form__error');
  const cnNote = cn('sign-in-form__note');

  return { cnRoot, cnToggle, cnError, cnNote };
};
