import { type ComponentPropsWithRef, useId } from 'react';

import { getClasses } from './styles/get-classes';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string;
  /**
   * With a `hint` the error replaces the hint and can wrap onto several lines. Without one it replaces the
   * label text, like Telegram does, and has to stay short. The label always stays the accessible name.
   */
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
          // The floating label relies on `:placeholder-shown`, which needs a non-empty placeholder.
          placeholder={placeholder ?? ' '}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
        />
        <label htmlFor={id} className={isErrorInLabel ? cnLabelHidden : cnLabel}>
          {label}
        </label>
        {/* The live regions stay mounted: a screen reader only announces text that changes inside one. */}
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
