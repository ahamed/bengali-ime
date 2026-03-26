import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Kkhiyo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char === 'h') {
      if (ime.buffer.length < 3) {
        return false;
      }

      if (
        ime.buffer ===
        phoneticConsonants.KONTHYO_KO + ime.hasant + phoneticConsonants.KONTHYO_KO
      ) {
        ime.pop(3);
        ime.append(phoneticConsonants.KONTHYO_KO + ime.hasant + phoneticConsonants.MURDHONNO_SHO);
        return true;
      }
    }

    return false;
  }
}
