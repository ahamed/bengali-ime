import { phoneticKar, phoneticVowels } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Oi implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'i') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    if (lastInBuffer === phoneticVowels.O) {
      ime.replaceLast(phoneticVowels.OI, true);
      return true;
    }

    if (lastInBuffer === phoneticKar.O_KAR) {
      ime.replaceLast(phoneticKar.OI_KAR, true);
      return true;
    }

    return false;
  }
}
