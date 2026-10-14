import { retryMessage } from '@features/send-message';

import { type Message, MessageStatusIcon } from '@entities/chat';

import { formatMessageDateTime, formatMessageTime } from '@shared/lib';
import { useAppDispatch } from '@shared/lib/redux';

import { getClasses } from './styles/get-classes';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const dispatch = useAppDispatch();
  const { chatId, localId, direction, text, timestamp, status, error } = message;
  const { cnRoot, cnText, cnMeta, cnStatus, cnRetry } = getClasses({ direction });

  const handleRetry = () => {
    void dispatch(retryMessage({ chatId, localId }));
  };

  return (
    <div className={cnRoot}>
      <span className={cnText}>{text}</span>
      <span className={cnMeta}>
        <time dateTime={new Date(timestamp).toISOString()} title={formatMessageDateTime(timestamp)}>
          {formatMessageTime(timestamp)}
        </time>
        {status === 'failed' && (
          <button
            type="button"
            className={cnRetry}
            aria-label="Retry sending"
            title={error ?? undefined}
            onClick={handleRetry}
          >
            <MessageStatusIcon status={status} />
          </button>
        )}
        {status !== null && status !== 'failed' && <MessageStatusIcon className={cnStatus} status={status} />}
      </span>
    </div>
  );
};
