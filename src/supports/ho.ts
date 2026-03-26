import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Ho implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'h') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    if (ime.buffer.length === 0 || (lastInBuffer && ime.isVowel(lastInBuffer))) {
      ime.append(phoneticConsonants.USHMO_HO);
      return true;
    }

    return false;
  }
}
