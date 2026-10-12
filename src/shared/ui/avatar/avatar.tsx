import { getAvatarColor, getInitials } from '@shared/lib/avatar';

import { getClasses } from './styles/get-classes';
import type { AvatarSize } from './constants';

export interface AvatarProps {
  chatId: string;
  title: string;
  size?: AvatarSize;
  className?: string;
}

export const Avatar = ({ chatId, title, size = 54, className }: AvatarProps) => {
  const { cnRoot } = getClasses({ className, color: getAvatarColor(chatId), size });

  return (
    <span className={cnRoot} aria-hidden="true">
      {getInitials(title)}
    </span>
  );
};
