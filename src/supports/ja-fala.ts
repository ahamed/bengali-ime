import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class JaFala implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'y') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    if (lastInBuffer && ime.isKarTakingConsonant(lastInBuffer)) {
      ime.append(ime.hasant + phoneticConsonants.ONTOSTHO_JO);
      return true;
    }

    return false;
  }
}
