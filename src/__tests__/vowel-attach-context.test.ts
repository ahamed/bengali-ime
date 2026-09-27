import { describe, it, expect } from 'vitest';
import { phoneticConsonants, phoneticKar, phoneticVowels } from '../bengali-ime-data';
import { endsWithKarTakingConsonant } from '../vowel-attach-context';

describe('endsWithKarTakingConsonant', () => {
  it('returns true when last grapheme is a bare consonant (একট scenario)', () => {
    expect(endsWithKarTakingConsonant(`এক${phoneticConsonants.MURDHONNO_TO}`)).toBe(true);
  });

  it('returns false when text is empty', () => {
    expect(endsWithKarTakingConsonant('')).toBe(false);
  });

  it('returns false for trailing whitespace only', () => {
    expect(endsWithKarTakingConsonant('   ')).toBe(false);
  });

  it('returns false when last grapheme is an independent vowel', () => {
    expect(endsWithKarTakingConsonant(phoneticVowels.A)).toBe(false);
  });

  it('returns false when last grapheme already has a matra', () => {
    expect(
      endsWithKarTakingConsonant(
        `${phoneticConsonants.KONTHYO_KO}${phoneticKar.A_KAR}`,
      ),
    ).toBe(false);
  });

  it('returns false when last grapheme ends with anusvara', () => {
    expect(
      endsWithKarTakingConsonant(
        `${phoneticConsonants.KONTHYO_KO}${phoneticConsonants.ONUSHWAR}`,
      ),
    ).toBe(false);
  });

  it('returns true for juktakkhor ending in consonant', () => {
    expect(
      endsWithKarTakingConsonant(
        `${phoneticConsonants.KONTHYO_KO}${'\u09CD'}${phoneticConsonants.MURDHONNO_TO}`,
      ),
    ).toBe(true);
  });

  it('returns false for Latin text', () => {
    expect(endsWithKarTakingConsonant('hello')).toBe(false);
  });

  it('does not look past trailing spaces before caret', () => {
    expect(endsWithKarTakingConsonant(`${phoneticConsonants.DONTO_TO} `)).toBe(false);
    expect(endsWithKarTakingConsonant(`${phoneticConsonants.DONTO_TO}   `)).toBe(false);
  });

  it('returns false after khanda ta', () => {
    expect(endsWithKarTakingConsonant(phoneticConsonants.KHONDO_TO)).toBe(false);
  });
});
