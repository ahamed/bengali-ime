import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class KhandaTo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'H') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    if (lastInBuffer && lastInBuffer === phoneticConsonants.DONTO_TO) {
      ime.replaceLast(phoneticConsonants.KHONDO_TO);
      return true;
    }

    return false;
  }
}
