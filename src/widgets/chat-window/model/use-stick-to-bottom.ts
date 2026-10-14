import { useEffect, useLayoutEffect, useRef } from 'react';

import type { Message } from '@entities/chat';

/** FR-4.15 */
const NEAR_BOTTOM_PX = 100;

/**
 * Keeps a message list at its end: it scrolls down when a message is added and the reader is near the bottom
 * (or opens the chat), and always for an outgoing one. A reader who scrolled up is left alone.
 */
export const useStickToBottom = (lastMessage: Message | undefined) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastLocalId = lastMessage?.localId;
  const isOutgoing = lastMessage?.direction === 'out';

  useLayoutEffect(() => {
    const element = scrollRef.current;

    if (element && (isOutgoing || isNearBottomRef.current)) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lastLocalId, isOutgoing]);

  // The composer grows with the draft and shrinks the list: a reader at the end stays at the end.
  useEffect(() => {
    const element = scrollRef.current;
    const observer = new ResizeObserver(() => {
      if (element && isNearBottomRef.current) {
        element.scrollTop = element.scrollHeight;
      }
    });

    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Measured on scroll, so the answer is about the position before the new message made the list longer.
  const handleScroll = () => {
    const element = scrollRef.current;

    if (element) {
      isNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX;
    }
  };

  return { scrollRef, handleScroll };
};
