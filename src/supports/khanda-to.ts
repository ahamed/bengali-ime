import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class KhandaTo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'H') {
      return false;
    }

    if (!ime.buffer.endsWith(phoneticConsonants.DONTO_TO)) {
      return false;
    }

    // ৎ never takes a hasant, so ক্ত + H becomes কৎ rather than ক্ৎ.
    const count = ime.buffer.endsWith(ime.hasant + phoneticConsonants.DONTO_TO) ? 2 : 1;
    ime.replaceLast(phoneticConsonants.KHONDO_TO, false, count);
    return true;
  }
}
