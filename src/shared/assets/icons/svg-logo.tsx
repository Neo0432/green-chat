import { SvgIcon, type SvgIconProps } from './svg-icon';

export const SvgLogo = (props: SvgIconProps) => (
  <SvgIcon fill="currentColor" stroke="none" {...props}>
    <path
      fillRule="evenodd"
      d="M6 3h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-7l-5 4.5V17a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM6.75 14.5 17.25 10 6.75 5.5V9l7.5 1-7.5 1z"
    />
  </SvgIcon>
);
