import { describe, it, expect } from 'vitest';
import { endsWithKarTakingConsonant } from '../vowel-attach-context';
import { vowelAttachCases } from './cases';

describe('endsWithKarTakingConsonant', () => {
  it.each(vowelAttachCases)('%s', (_name, texts, expected) => {
    for (const text of texts) {
      expect(endsWithKarTakingConsonant(text)).toBe(expected);
    }
  });
});
