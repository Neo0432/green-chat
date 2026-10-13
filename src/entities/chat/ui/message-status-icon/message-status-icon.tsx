import type { ComponentType } from 'react';

import { SvgAlertCircle, SvgCheck, SvgCheckDouble, SvgClock, type SvgIconProps } from '@shared/assets/icons';

import type { MessageStatus } from '../../model/types';

/** FR-3.8: `delivered` has no icon of its own, Telegram has no real "delivered". */
const STATUS_ICONS = {
  pending: SvgClock,
  sent: SvgCheck,
  delivered: SvgCheck,
  read: SvgCheckDouble,
  failed: SvgAlertCircle,
} satisfies Record<MessageStatus, ComponentType<SvgIconProps>>;

interface MessageStatusIconProps {
  status: MessageStatus;
  className?: string;
}

/** Draws in `currentColor`: the consumer picks the color. */
export const MessageStatusIcon = ({ status, className }: MessageStatusIconProps) => {
  const Icon = STATUS_ICONS[status];

  return <Icon width={16} height={16} className={className} />;
};
