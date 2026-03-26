import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class JoPlusNyo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'g' && lastInBuffer === phoneticConsonants.KONTHYO_GO) {
      ime.replaceLast(phoneticConsonants.BORGIYO_JO + ime.hasant + phoneticConsonants.TALOBBO_NYO);
      return true;
    }

    return false;
  }
}
