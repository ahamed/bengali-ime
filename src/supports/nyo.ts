import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Nyo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'G' && lastInBuffer === phoneticConsonants.MURDHONNO_NO) {
      ime.replaceLast(phoneticConsonants.TALOBBO_NYO);
      return true;
    }

    return false;
  }
}
