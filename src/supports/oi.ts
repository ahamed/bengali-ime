import { phoneticConsonants, phoneticKar, phoneticVowels } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

const CHONDROBINDU = phoneticConsonants.CHONDROBINDU;

export class Oi implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'i') {
      return false;
    }

    return replaceODiphthong(ime, phoneticVowels.OI, phoneticKar.OI_KAR);
  }
}

/**
 * Turns a trailing ও / ো (optionally followed by ঁ) into the given diphthong,
 * keeping the chandrabindu after it: কোঁ + i → কৈঁ.
 */
export const replaceODiphthong = (
  ime: BengaliIMEInterface,
  independent: string,
  kar: string,
): boolean => {
  const pairs: [string, string][] = [
    [phoneticVowels.O, independent],
    [phoneticKar.O_KAR, kar],
    [phoneticVowels.O + CHONDROBINDU, independent + CHONDROBINDU],
    [phoneticKar.O_KAR + CHONDROBINDU, kar + CHONDROBINDU],
  ];

  for (const [from, to] of pairs) {
    if (ime.buffer.endsWith(from)) {
      ime.replaceLast(to, true, from.length);
      return true;
    }
  }

  return false;
};
