import { describe, it, expect } from 'vitest';
import { shouldAttachKarWhenBufferEmpty } from '../vowel-attach-context';
import { vowelAttachCases } from './cases';

describe('shouldAttachKarWhenBufferEmpty', () => {
  it.each(vowelAttachCases)('%s', (_name, textBeforeCaret, expected) => {
    expect(shouldAttachKarWhenBufferEmpty(textBeforeCaret)).toBe(expected);
  });
});
