import { getClasses } from './styles/get-classes';
import type { SpinnerSize } from './constants';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Screen-reader text. Leave it out when the surrounding element already says what is loading. */
  label?: string;
  className?: string;
}

export const Spinner = ({ size = 20, label, className }: SpinnerProps) => {
  const { cnRoot, cnLabel } = getClasses({ className, size });

  return (
    <span className={cnRoot} role={label ? 'status' : undefined} aria-hidden={label ? undefined : true}>
      {label && <span className={cnLabel}>{label}</span>}
    </span>
  );
};
