import classNames from 'classnames/bind';

import styles from './text-field.module.scss';

const cn = classNames.bind(styles);

interface Props {
  className?: string;
  hasError: boolean;
  isDisabled?: boolean;
}

export const getClasses = ({ className, hasError, isDisabled }: Props) => {
  const cnRoot = cn('text-field', { 'text-field--error': hasError, 'text-field--disabled': isDisabled }, className);
  const cnControl = cn('text-field__control');
  const cnInput = cn('text-field__input');
  const cnLabel = cn('text-field__label');
  const cnLabelHidden = cn('text-field__label', 'text-field__label--hidden');
  const cnError = cn('text-field__label');
  const cnHint = cn('text-field__hint');

  return { cnRoot, cnControl, cnInput, cnLabel, cnLabelHidden, cnError, cnHint };
};
