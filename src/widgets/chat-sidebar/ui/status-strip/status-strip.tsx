import { selectIsConnecting, selectStatusError } from '@features/receive-messages';

import { useAppSelector } from '@shared/lib/redux';
import { Spinner } from '@shared/ui/spinner';

import { getClasses } from './styles/get-classes';

/** §7.4: "Connecting…" while the polling cannot reach GREEN-API, otherwise what keeps messages from coming. */
export const StatusStrip = () => {
  const isConnecting = useAppSelector(selectIsConnecting);
  const error = useAppSelector(selectStatusError);
  const { cnConnecting, cnError } = getClasses();

  return (
    <div role="status">
      {isConnecting && (
        <div className={cnConnecting}>
          <Spinner size={16} />
          Connecting…
        </div>
      )}
      {!isConnecting && error !== null && <div className={cnError}>{error}</div>}
    </div>
  );
};
