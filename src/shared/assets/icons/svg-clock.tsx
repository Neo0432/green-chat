import { SvgIcon, type SvgIconProps } from './svg-icon';

export const SvgClock = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 7v5l3 2" />
  </SvgIcon>
);
