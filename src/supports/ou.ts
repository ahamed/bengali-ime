import { phoneticKar, phoneticVowels } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Ou implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'u') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    if (lastInBuffer === phoneticVowels.O) {
      ime.replaceLast(phoneticVowels.OU, true);
      return true;
    }

    if (lastInBuffer === phoneticKar.O_KAR) {
      ime.replaceLast(phoneticKar.OU_KAR, true);
      return true;
    }

    return false;
  }
}
