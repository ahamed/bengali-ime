import { karTakingConsonantGraphemes, phoneticConsonants } from './bengali-ime-data';

const NUKTA = '়';

const lastCodePoints = (text: string, count: number): string[] => {
  const out: string[] = [];
  let end = text.length;
  while (out.length < count && end > 0) {
    const low = text.charCodeAt(end - 1);
    const start = end >= 2 && low >= 0xdc00 && low <= 0xdfff ? end - 2 : end - 1;
    out.unshift(text.slice(start, end));
    end = start;
  }
  return out;
};

/**
 * True when `text` ends in a consonant that can carry a kar or a hasant. Only
 * the character immediately before the caret counts: whitespace, punctuation,
 * vowels, kars, ং ঃ ঁ and ৎ all make this false. A decomposed nukta letter
 * (ড + ়) counts as a consonant.
 */
export const endsWithKarTakingConsonant = (text: string): boolean => {
  const points = lastCodePoints(text, 2);
  let last = points.pop();
  if (last === NUKTA) {
    last = points.pop();
  }
  return last !== undefined && karTakingConsonantGraphemes.has(last);
};

/** True when `text` ends in a consonant followed directly by chandrabindu (e.g. কঁ). */
export const endsWithConsonantAndChandrabindu = (text: string): boolean =>
  text.endsWith(phoneticConsonants.CHONDROBINDU) &&
  endsWithKarTakingConsonant(text.slice(0, -phoneticConsonants.CHONDROBINDU.length));
