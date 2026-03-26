import { describe, it, expect } from 'vitest';
import { phoneticConsonants, phoneticKar, phoneticVowels } from '../bengali-ime-data';
import { shouldAttachKarWhenBufferEmpty } from '../vowel-attach-context';

describe('shouldAttachKarWhenBufferEmpty', () => {
  it('returns true when last grapheme is a bare consonant (একট scenario)', () => {
    expect(shouldAttachKarWhenBufferEmpty(`এক${phoneticConsonants.MURDHONNO_TO}`)).toBe(true);
  });

  it('returns false when text is empty', () => {
    expect(shouldAttachKarWhenBufferEmpty('')).toBe(false);
  });

  it('returns false for trailing whitespace only', () => {
    expect(shouldAttachKarWhenBufferEmpty('   ')).toBe(false);
  });

  it('returns false when last grapheme is an independent vowel', () => {
    expect(shouldAttachKarWhenBufferEmpty(phoneticVowels.A)).toBe(false);
  });

  it('returns false when last grapheme already has a matra', () => {
    expect(
      shouldAttachKarWhenBufferEmpty(
        `${phoneticConsonants.KONTHYO_KO}${phoneticKar.A_KAR}`,
      ),
    ).toBe(false);
  });

  it('returns false when last grapheme ends with anusvara', () => {
    expect(
      shouldAttachKarWhenBufferEmpty(
        `${phoneticConsonants.KONTHYO_KO}${phoneticConsonants.ONUSHWAR}`,
      ),
    ).toBe(false);
  });

  it('returns true for juktakkhor ending in consonant', () => {
    expect(
      shouldAttachKarWhenBufferEmpty(
        `${phoneticConsonants.KONTHYO_KO}${'\u09CD'}${phoneticConsonants.MURDHONNO_TO}`,
      ),
    ).toBe(true);
  });

  it('returns false for Latin text', () => {
    expect(shouldAttachKarWhenBufferEmpty('hello')).toBe(false);
  });

  it('ignores trailing spaces before caret', () => {
    expect(shouldAttachKarWhenBufferEmpty(`${phoneticConsonants.DONTO_TO}   `)).toBe(true);
  });
});
