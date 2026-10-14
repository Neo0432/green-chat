import { type FormEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { SvgSend } from '@shared/assets/icons';
import { matchesMedia, MOBILE_MEDIA_QUERY } from '@shared/lib';
import { useAppDispatch } from '@shared/lib/redux';
import { IconButton } from '@shared/ui/icon-button';

import { isSendShortcut } from '../../lib/is-send-shortcut';
import { MAX_MESSAGE_LENGTH, validateMessageText } from '../../lib/validate-message-text';
import { sendMessage } from '../../model/send-message';

import { getClasses } from './styles/get-classes';

interface ComposerProps {
  chatId: string;
}

/** Mount it with the chat as its `key`: every chat then starts with an empty draft and, on desktop, the focus in it. */
export const Composer = ({ chatId }: ComposerProps) => {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const { canSend, text, isTooLong, length } = validateMessageText(draft);
  const { cnRoot, cnHint, cnRow, cnInput } = getClasses();

  // FR-2.7: on a phone the focus would open the virtual keyboard over the chat that was just opened.
  useEffect(() => {
    if (!matchesMedia(MOBILE_MEDIA_QUERY)) {
      inputRef.current?.focus();
    }
  }, []);

  // FR-3.1: the field is as tall as its text, up to the limit in the styles.
  useLayoutEffect(() => {
    const input = inputRef.current;

    if (input) {
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    }
  }, [draft]);

  const send = () => {
    if (!canSend) {
      return;
    }

    void dispatch(sendMessage({ chatId, text }));
    setDraft('');
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSendShortcut(event.nativeEvent)) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form className={cnRoot} onSubmit={handleSubmit}>
      {isTooLong && (
        <p id={hintId} className={cnHint}>
          Message is too long ({length}/{MAX_MESSAGE_LENGTH})
        </p>
      )}
      <div className={cnRow}>
        <textarea
          ref={inputRef}
          className={cnInput}
          rows={1}
          placeholder="Message"
          aria-label="Message"
          aria-invalid={isTooLong || undefined}
          aria-describedby={isTooLong ? hintId : undefined}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <IconButton type="submit" variant="raised" label="Send message" disabled={!canSend}>
          <SvgSend />
        </IconButton>
      </div>
    </form>
  );
};
