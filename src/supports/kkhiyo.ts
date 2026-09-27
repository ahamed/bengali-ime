import { phoneticConsonants } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class Kkhiyo implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'h') {
      return false;
    }

    const kk = phoneticConsonants.KONTHYO_KO + ime.hasant + phoneticConsonants.KONTHYO_KO;
    if (!ime.buffer.endsWith(kk)) {
      return false;
    }

    ime.pop(kk.length);
    ime.append(phoneticConsonants.KONTHYO_KO + ime.hasant + phoneticConsonants.MURDHONNO_SHO);
    return true;
  }
}
