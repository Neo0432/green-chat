import { formatDateSeparator } from '@shared/lib';

import { getClasses } from './styles/get-classes';

interface DateSeparatorProps {
  timestamp: number;
}

export const DateSeparator = ({ timestamp }: DateSeparatorProps) => {
  const { cnRoot } = getClasses();

  return <p className={cnRoot}>{formatDateSeparator(timestamp)}</p>;
};
