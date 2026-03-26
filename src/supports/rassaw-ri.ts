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
    const length = buffer.length;

    if (length < 3) {
      return false;
    }

    const rrTail = RO + ime.hasant + RO;
    if (!buffer.endsWith(rrTail)) {
      return false;
    }

    const tripleRTail = RO + ime.hasant + RO + ime.hasant + RO;
    if (buffer.endsWith(tripleRTail)) {
      return false;
    }

    if (length === 3) {
      ime.pop(3);
      ime.append(phoneticVowels.RASSAW_RI);
      return true;
    }

    ime.pop(4);
    ime.appendAndFlushBuffer(phoneticKar.RASSAW_RI_KAR);
    return true;
  }
}
