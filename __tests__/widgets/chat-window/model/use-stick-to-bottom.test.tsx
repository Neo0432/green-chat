import { fireEvent, render, screen } from '@testing-library/react';

import { useStickToBottom } from '@widgets/chat-window/model/use-stick-to-bottom';

import type { Message } from '@entities/chat';

import { buildMessage } from '../../../entities/chat/fixtures';

const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;

interface HostProps {
  lastMessage: Message | undefined;
}

const Host = ({ lastMessage }: HostProps) => {
  const { scrollRef, handleScroll } = useStickToBottom(lastMessage);

  return <div ref={scrollRef} role="log" onScroll={handleScroll} />;
};

const incoming = (localId: string) => buildMessage({ localId, direction: 'in', status: null });
const outgoing = (localId: string) => buildMessage({ localId, direction: 'out' });

describe('useStickToBottom', () => {
  let scrollTop = 0;

  // jsdom has no layout: the list is 1000 px tall in a 400 px window, and scrolling is a plain number.
  beforeEach(() => {
    scrollTop = 0;
    jest.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(SCROLL_HEIGHT);
    jest.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(CLIENT_HEIGHT);
    jest.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(() => scrollTop);
    jest.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation((value) => {
      scrollTop = value;
    });
  });

  const scrollTo = (position: number) => {
    scrollTop = position;
    fireEvent.scroll(screen.getByRole('log'));
  };

  it('starts at the end of the list', () => {
    render(<Host lastMessage={incoming('a')} />);

    expect(scrollTop).toBe(SCROLL_HEIGHT);
  });

  it('leaves a reader who scrolled up in place when a message arrives, and follows one who is near the end', () => {
    const { rerender } = render(<Host lastMessage={incoming('a')} />);

    scrollTo(100);
    rerender(<Host lastMessage={incoming('b')} />);

    expect(scrollTop).toBe(100);

    scrollTo(SCROLL_HEIGHT - CLIENT_HEIGHT - 100);
    rerender(<Host lastMessage={incoming('c')} />);

    expect(scrollTop).toBe(SCROLL_HEIGHT);
  });

  it('scrolls to the end for an outgoing message, also when the reader scrolled up', () => {
    const { rerender } = render(<Host lastMessage={incoming('a')} />);

    scrollTo(100);
    rerender(<Host lastMessage={outgoing('b')} />);

    expect(scrollTop).toBe(SCROLL_HEIGHT);
  });
});
