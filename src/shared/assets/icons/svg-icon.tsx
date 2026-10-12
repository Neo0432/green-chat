import type { SVGProps } from 'react';

export type SvgIconProps = SVGProps<SVGSVGElement>;

export const SvgIcon = ({ children, ...props }: SvgIconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);
