import { useEffect, useLayoutEffect, useRef } from 'react';

import type { Message } from '@entities/chat';

const NEAR_BOTTOM_PX = 100;

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

  const handleScroll = () => {
    const element = scrollRef.current;

    if (element) {
      isNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_PX;
    }
  };

  return { scrollRef, handleScroll };
};
