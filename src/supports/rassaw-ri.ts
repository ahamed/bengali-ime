import {
  phoneticConsonants,
  phoneticKar,
  phoneticVowels,
} from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

const RO = phoneticConsonants.ONTOSTHO_RO;

export class RassawRI implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'i') {
      return false;
    }

    const { buffer } = ime;
    const rrTail = RO + ime.hasant + RO;
    if (!buffer.endsWith(rrTail)) {
      return false;
    }

    const tripleRTail = RO + ime.hasant + RO + ime.hasant + RO;
    if (buffer.endsWith(tripleRTail)) {
      return false;
    }

    // A consonant stacked before র্র takes ঋ-kar (ক্র্র → কৃ); anything else
    // (nothing, or a vowel such as ও) gets the independent ঋ.
    const before = buffer.slice(0, -rrTail.length);
    if (before.endsWith(ime.hasant)) {
      ime.pop(rrTail.length + 1);
      ime.appendAndFlushBuffer(phoneticKar.RASSAW_RI_KAR);
      return true;
    }

    ime.pop(rrTail.length);
    ime.appendAndFlushBuffer(phoneticVowels.RASSAW_RI);
    return true;
  }
}
