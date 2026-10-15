import { type ComponentPropsWithRef, useId } from 'react';

import { getClasses } from './styles/get-classes';

const FLOATING_LABEL_PLACEHOLDER = ' ';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = ({
  label,
  error,
  hint,
  className,
  disabled,
  placeholder,
  'aria-describedby': describedByProp,
  ...rest
}: TextFieldProps) => {
  const id = useId();
  const messageId = `${id}-message`;
  const hasError = Boolean(error);
  const isErrorInLabel = hasError && !hint;

  const { cnRoot, cnControl, cnInput, cnLabel, cnLabelHidden, cnError, cnHint } = getClasses({
    className,
    hasError,
    isDisabled: disabled,
  });

  const describedBy = [describedByProp, (hasError || Boolean(hint)) && messageId].filter(Boolean).join(' ');

  return (
    <div className={cnRoot}>
      <div className={cnControl}>
        <input
          id={id}
          className={cnInput}
          disabled={disabled}
          placeholder={placeholder ?? FLOATING_LABEL_PLACEHOLDER}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
        />
        <label htmlFor={id} className={isErrorInLabel ? cnLabelHidden : cnLabel}>
          {label}
        </label>
        {!hint && (
          <span id={messageId} className={cnError} aria-live="polite">
            {error}
          </span>
        )}
      </div>
      {hint && (
        <p id={messageId} className={cnHint} aria-live="polite">
          {hasError ? error : hint}
        </p>
      )}
    </div>
  );
};
