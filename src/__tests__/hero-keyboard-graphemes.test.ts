import { describe, it, expect } from 'vitest';
import {
  hasant,
  heroKeyboardGraphemeByQwertyLowercase,
  phoneticConsonants,
} from '../bengali-ime-data';

describe('heroKeyboardGraphemeByQwertyLowercase', () => {
  it('maps vowel keys to independent vowels (no kars)', () => {
    expect(heroKeyboardGraphemeByQwertyLowercase.a).toBe('আ');
    expect(heroKeyboardGraphemeByQwertyLowercase.e).toBe('এ');
    expect(heroKeyboardGraphemeByQwertyLowercase.i).toBe('ই');
    expect(heroKeyboardGraphemeByQwertyLowercase.o).toBe('অ');
    expect(heroKeyboardGraphemeByQwertyLowercase.u).toBe('উ');
  });

  it('maps q and x to ক and ক্স', () => {
    expect(heroKeyboardGraphemeByQwertyLowercase.q).toBe(phoneticConsonants.KONTHYO_KO);
    expect(heroKeyboardGraphemeByQwertyLowercase.x).toBe(
      phoneticConsonants.KONTHYO_KO + hasant + phoneticConsonants.DONTO_SHO,
    );
  });

  it('has 26 entries aligned with qwerty letter order', () => {
    const keys = Object.keys(heroKeyboardGraphemeByQwertyLowercase).sort().join('');
    expect(keys).toBe('abcdefghijklmnopqrstuvwxyz');
  });
});
