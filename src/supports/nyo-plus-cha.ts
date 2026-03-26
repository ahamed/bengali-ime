import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class NyoPlusCha implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'c' && lastInBuffer === phoneticConsonants.DONTO_NO) {
      ime.replaceLast(phoneticConsonants.TALOBBO_NYO + ime.hasant + phoneticConsonants.TALOBBO_CHO);
      return true;
    }

    return false;
  }
}
