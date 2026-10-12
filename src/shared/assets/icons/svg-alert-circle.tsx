import { SvgIcon, type SvgIconProps } from './svg-icon';

export const SvgAlertCircle = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <circle cx={12} cy={12} r={9} />
    <path d="M12 7.5v5M12 16.5h.01" />
  </SvgIcon>
);
