import { assertNever, isNonBlankString, isNonEmptyString, isPlainObject } from '@shared/lib/predicates';

describe('isPlainObject', () => {
  it.each([{}, { a: 1 }, Object.create(null)])('returns true for an object', (value) => {
    expect(isPlainObject(value)).toBe(true);
  });

  it.each([null, undefined, [], [1], 'text', 1, true])('returns false for %p', (value) => {
    expect(isPlainObject(value)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('returns true for a string with characters', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString(' ')).toBe(true);
  });

  it.each(['', null, undefined, 0, 1, {}, []])('returns false for %p', (value) => {
    expect(isNonEmptyString(value)).toBe(false);
  });
});

describe('isNonBlankString', () => {
  it('returns true for a string with visible characters', () => {
    expect(isNonBlankString('a')).toBe(true);
    expect(isNonBlankString(' a ')).toBe(true);
  });

  it.each(['', ' ', '\n\t', null, undefined, 0, {}, []])('returns false for %p', (value) => {
    expect(isNonBlankString(value)).toBe(false);
  });
});

describe('assertNever', () => {
  it('throws with the unhandled value', () => {
    const unexpected = 'surprise' as never;

    expect(() => assertNever(unexpected)).toThrow('Unhandled case: "surprise"');
  });

  it('uses a custom message', () => {
    const unexpected = 1 as never;

    expect(() => assertNever(unexpected, 'Unknown kind')).toThrow('Unknown kind: 1');
  });
});
