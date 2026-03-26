import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Ungo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    const lastInBuffer = ime.buffer.at(-1);

    if (char === 'g' && lastInBuffer === phoneticConsonants.MURDHONNO_NO) {
      ime.replaceLast(phoneticConsonants.KONTHYO_UNGO);
      return true;
    }

    return false;
  }
}
