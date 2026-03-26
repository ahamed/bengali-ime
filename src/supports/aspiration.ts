import { aspiratedConsonantByBase } from '../bengali-ime-data';
import type { Akkhar, BengaliIMEInterface } from '../types';

export class AspiratedConsonant implements Akkhar {
  proceed(ime: BengaliIMEInterface, char: string) {
    if (char !== 'h') {
      return false;
    }

    const lastInBuffer = ime.buffer.at(-1);

    const aspirated = lastInBuffer
      ? aspiratedConsonantByBase.get(lastInBuffer)
      : undefined;

    if (aspirated) {
      ime.replaceLast(aspirated);
      return true;
    }

    return false;
  }
}
