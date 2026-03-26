import {
  bengaliConsonantLetterGraphemes,
  dependentVowelGraphemes,
  independentVowelGraphemes,
  modifierGraphemeChars,
} from './bengali-ime-data';

const HASANT = '্';

const getLastGrapheme = (text: string): string => {
  if (text.length === 0) {
    return '';
  }
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('bn', { granularity: 'grapheme' });
    let last = '';
    for (const { segment } of segmenter.segment(text)) {
      if (segment.length > 0) {
        last = segment;
      }
    }
    return last;
  }
  return text.at(-1) ?? '';
};

const lastSignificantChar = (grapheme: string): string => {
  const units = [...grapheme];
  let i = units.length - 1;
  while (i >= 0) {
    const u = units[i] ?? '';
    if (u === HASANT && i > 0) {
      i -= 1;
      continue;
    }
    return u;
  }
  return '';
};

export const shouldAttachKarWhenBufferEmpty = (textBeforeCaret: string): boolean => {
  const trimmedEnd = textBeforeCaret.replace(/\s{2,}$/, '');

  if (trimmedEnd.length === 0) {
    return false;
  }

  const lastGrapheme = getLastGrapheme(trimmedEnd);

  if (lastGrapheme.length === 0) {
    return false;
  }

  for (const char of lastGrapheme) {
    if (dependentVowelGraphemes.has(char)) {
      return false;
    }
  }

  const significantChar = lastSignificantChar(lastGrapheme);

  if (significantChar.length === 0) {
    return false;
  }

  if (modifierGraphemeChars.has(significantChar)) {
    return false;
  }

  if (independentVowelGraphemes.has(lastGrapheme)) {
    return false;
  }

  return bengaliConsonantLetterGraphemes.has(significantChar);
};
