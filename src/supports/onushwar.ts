import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Onushwar implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'g' && lastInBuffer === phoneticConsonants.DONTO_NO) {
      ime.replaceLast(phoneticConsonants.ONUSHWAR, true);
      return true;
    }

    return false;
  }
}
