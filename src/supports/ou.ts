import { phoneticKar, phoneticVowels } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';
import { replaceODiphthong } from './oi';

export class Ou implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'u') {
      return false;
    }

    return replaceODiphthong(ime, phoneticVowels.OU, phoneticKar.OU_KAR);
  }
}
