import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Onushwar implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'g' || !ime.buffer.endsWith(phoneticConsonants.DONTO_NO)) {
      return false;
    }

    // ং never takes a hasant, so ক্ন + g becomes কং rather than ক্ং.
    const count = ime.buffer.endsWith(ime.hasant + phoneticConsonants.DONTO_NO) ? 2 : 1;
    ime.replaceLast(phoneticConsonants.ONUSHWAR, true, count);
    return true;
  }
}
