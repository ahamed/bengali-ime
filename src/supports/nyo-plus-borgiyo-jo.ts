import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class NyoPlusBorgiyoJo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'j' && lastInBuffer === phoneticConsonants.DONTO_NO) {
      ime.replaceLast(phoneticConsonants.TALOBBO_NYO + ime.hasant + phoneticConsonants.BORGIYO_JO);
      return true;
    }

    return false;
  }
}
