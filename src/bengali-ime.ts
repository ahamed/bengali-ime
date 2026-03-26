import { Factory } from './factory';
import { AspiratedConsonant } from './supports/aspiration';
import { Ho } from './supports/ho';
import { JaFala } from './supports/ja-fala';
import { JoPlusNyo } from './supports/jo-plus-nyo';
import { KhandaTo } from './supports/khanda-to';
import { Kkhiyo } from './supports/kkhiyo';
import { Nyo } from './supports/nyo';
import { NyoPlusBorgiyoJo } from './supports/nyo-plus-borgiyo-jo';
import { NyoPlusCha } from './supports/nyo-plus-cha';
import { Oi } from './supports/oi';
import { Onushwar } from './supports/onushwar';
import { Ou } from './supports/ou';
import { RassawRI } from './supports/rassaw-ri';
import { Ungo } from './supports/ungo';
import {
  aspiratedConsonantByBase,
  capitalRomanToConsonant,
  defaultConsonantByRomanKey,
  hasant,
  numberMap,
  phoneticConsonantGraphemes,
  phoneticConsonants,
  romanToPhoneticVowels,
  specialCharacterInputs,
  specialCharactersMap,
  symbols,
} from './bengali-ime-data';
import type { Akkhar, IMEAction } from './types';
import { shouldAttachKarWhenBufferEmpty } from './vowel-attach-context';

export type { IMEAction } from './types';

const TYPOGRAPHIC_DOUBLE_QUOTE_OPEN = symbols.get('TYPOGRAPHIC_DOUBLE_QUOTE_OPEN')!;
const TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE = symbols.get('TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE')!;
const TYPOGRAPHIC_SINGLE_QUOTE_OPEN = symbols.get('TYPOGRAPHIC_SINGLE_QUOTE_OPEN')!;
const TYPOGRAPHIC_SINGLE_QUOTE_CLOSE = symbols.get('TYPOGRAPHIC_SINGLE_QUOTE_CLOSE')!;

const balancedTypographicQuote = (prior: string, open: string, close: string) => {
  const opens = prior.split(open).length - 1;
  const closes = prior.split(close).length - 1;
  return opens > closes ? close : open;
};

const priorEndsWithWordCharForApostrophe = (prior: string) =>
  /(\p{L}|\p{N})(?:\p{M})*$/u.test(prior);

const singleQuoteFromPrior = (prior: string) => {
  if (priorEndsWithWordCharForApostrophe(prior)) {
    return TYPOGRAPHIC_SINGLE_QUOTE_CLOSE;
  }
  return balancedTypographicQuote(
    prior,
    TYPOGRAPHIC_SINGLE_QUOTE_OPEN,
    TYPOGRAPHIC_SINGLE_QUOTE_CLOSE,
  );
};

export type BengaliIMEProcessOptions = {
  textBeforeCaret?: string;
};

export class BengaliIME {
  public buffer = '';
  public output = '';
  public isEnglishMode = false;
  public readonly hasant = hasant;

  protected actions: IMEAction[] = [];
  protected skipDocumentKarForNextVowel = false;

  processBackspace(): IMEAction[] {
    if (this.output.length === 0) {
      return [];
    }
    this.actions = [];
    this.pop();
    return this.actions;
  }

  process(char: string, options?: BengaliIMEProcessOptions): IMEAction[] {
    this.actions = [];
    this.processKeystroke(char, options?.textBeforeCaret);

    return this.actions;
  }

  toggleEnglishMode(): void {
    this.isEnglishMode = !this.isEnglishMode;
  }

  protected processKeystroke(char: string, textBeforeCaret?: string) {
    if (this.isEnglishMode) {
      this.processEnglishKeystroke(char);
      return;
    }

    if (char === symbols.get('SPACE') || char === symbols.get('ENTER_KEY')) {
      this.skipDocumentKarForNextVowel = false;
      this.processWordBoundary(char);
      return;
    }

    if (this.isNumber(char)) {
      this.skipDocumentKarForNextVowel = false;
      this.processNumber(char);
      return;
    }

    if (this.isSpecialCharacter(char)) {
      this.skipDocumentKarForNextVowel = false;
      this.processSpecialCharacters(char, textBeforeCaret);
      return;
    }

    if (this.isVowel(char)) {
      this.processVowel(char, textBeforeCaret);
      return;
    }

    this.skipDocumentKarForNextVowel = false;
    this.processConsonant(char);
  }

  protected processNumber(char: string) {
    this.appendAndFlushBuffer(numberMap.get(char)!);
  }

  protected processEnglishKeystroke(char: string) {
    if (char === symbols.get('SPACE')) {
      this.appendAndFlushBuffer(symbols.get('SPACE')!);
      return;
    }

    if (char === symbols.get('ENTER_KEY')) {
      this.actions.push({ type: 'splitBlock' });
      this.flushBuffer();
      return;
    }

    this.appendAndFlushBuffer(char);
  }

  protected passedAny<T extends Akkhar>(cls: (new () => T)[], char: string) {
    return cls.some((cls) => Factory.make(cls).proceed(this, char));
  }

  protected processVowel(char: string, textBeforeCaret?: string) {
    const vowelDirect = romanToPhoneticVowels.get(char);
    const vowel =
      vowelDirect ?? romanToPhoneticVowels.get(char.toLowerCase());
    if (!vowel) {
      return;
    }

    const vowelKey = vowelDirect !== undefined ? char : char.toLowerCase();

    if (this.passedAny([RassawRI, Oi, Ou], char)) {
      return;
    }

    const hadBufferBeforeVowel = this.buffer.length > 0;
    const honorSilentOBreak =
      this.skipDocumentKarForNextVowel && this.buffer.length === 0;
    if (honorSilentOBreak) {
      this.skipDocumentKarForNextVowel = false;
    }

    const shouldFlushBuffer = vowelKey !== 'O';
    const useKarFromDocument =
      !honorSilentOBreak &&
      this.buffer.length === 0 &&
      textBeforeCaret !== undefined &&
      shouldAttachKarWhenBufferEmpty(textBeforeCaret);
    const text =
      this.buffer.length > 0 || useKarFromDocument ? vowel.kar : vowel.ind;

    if (shouldFlushBuffer) {
      this.appendAndFlushBuffer(text);
      if (vowelKey === 'o' && hadBufferBeforeVowel) {
        this.skipDocumentKarForNextVowel = true;
      }
      return;
    }

    this.append(text);
  }

  protected processConsonant(char: string) {
    const lastInBuffer = this.buffer.at(-1);

    if (this.passedAny([Kkhiyo, Ho, KhandaTo, JaFala, AspiratedConsonant], char)) {
      return;
    }

    if (this.processNasalConnectors(char)) {
      return;
    }

    if (this.processSpecialCharacters(char)) {
      return;
    }

    const lower = char.toLowerCase();
    const direct =
      defaultConsonantByRomanKey.get(char) ??
      capitalRomanToConsonant.get(char);

    let consonant: string | undefined;
    if (direct !== undefined) {
      consonant = direct;
    } else if (char !== lower) {
      const baseLower =
        defaultConsonantByRomanKey.get(lower) ??
        capitalRomanToConsonant.get(lower);
      if (baseLower !== undefined) {
        consonant =
          aspiratedConsonantByBase.get(baseLower) ?? baseLower;
      }
    }

    if (!consonant) {
      return;
    }

    let hasHasant = false;

    if (lastInBuffer && this.isPhoneticConsonant(lastInBuffer)) {
      hasHasant = true;
    }

    if (lastInBuffer === phoneticConsonants.KHONDO_TO) {
      hasHasant = false;
    }

    this.append(hasHasant ? this.hasant + consonant : consonant);
  }

  protected processNasalConnectors(char: string): boolean {
    if (this.passedAny([NyoPlusCha, Onushwar, Ungo, JoPlusNyo, Nyo, NyoPlusBorgiyoJo], char)) {
      return true;
    }

    return false;
  }

  protected processSpecialCharacters(char: string, textBeforeCaret?: string): boolean {
    if (char === symbols.get('DASH')) {
      const priorHyphenAtCaret =
        textBeforeCaret !== undefined
          ? textBeforeCaret.endsWith('-')
          : this.output.endsWith('-');
      if (priorHyphenAtCaret) {
        this.actions.push({
          type: 'replace',
          charsBack: 1,
          text: symbols.get('DOUBLE_DASH')!,
        });
        if (this.output.endsWith('-')) {
          this.output =
            this.output.slice(0, -1) + symbols.get('DOUBLE_DASH')!;
        }
        this.flushBuffer();
        return true;
      }
      this.appendAndFlushBuffer(symbols.get('DASH')!);
      return true;
    }

    if (char === '"') {
      const prior = textBeforeCaret !== undefined ? textBeforeCaret : this.output;
      this.appendAndFlushBuffer(
        balancedTypographicQuote(
          prior,
          TYPOGRAPHIC_DOUBLE_QUOTE_OPEN,
          TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE,
        ),
      );
      return true;
    }

    if (char === "'") {
      const prior = textBeforeCaret !== undefined ? textBeforeCaret : this.output;
      this.appendAndFlushBuffer(singleQuoteFromPrior(prior));
      return true;
    }

    const character = specialCharactersMap.get(char);
    if (!character) {
      return false;
    }

    this.appendAndFlushBuffer(character);
    return true;
  }

  protected processWordBoundary(char: string) {
    if (char === symbols.get('ENTER_KEY')) {
      this.actions.push({ type: 'splitBlock' });
      this.flushBuffer();
      return;
    }
    this.appendAndFlushBuffer(char);
  }

  protected flushBuffer() {
    this.buffer = '';
  }

  public replaceLast(next: string, flushBuffer = false, count = 1) {
    const end = count * -1;

    this.output = this.output.slice(0, end) + next;
    this.actions.push({ type: 'replace', charsBack: count, text: next });

    if (flushBuffer) {
      this.flushBuffer();
    } else {
      this.buffer = this.buffer.slice(0, end) + next;
    }
  }

  public pop(count = 1) {
    this.skipDocumentKarForNextVowel = false;
    this.output = this.output.slice(0, count * -1);
    this.actions.push({ type: 'delete', charsBack: count });
    this.flushBuffer();
  }

  public append(text: string, updateBuffer = true) {
    this.output += text;
    this.actions.push({ type: 'insert', text });

    if (updateBuffer) {
      this.buffer += text;
    }
  }

  public appendAndFlushBuffer(text: string) {
    this.append(text, false);
    this.flushBuffer();
  }

  public isVowel(char: string) {
    return (
      romanToPhoneticVowels.has(char) ||
      romanToPhoneticVowels.has(char.toLowerCase())
    );
  }

  public isPhoneticConsonant(char: string) {
    return phoneticConsonantGraphemes.has(char);
  }

  public isNumber(char: string) {
    return numberMap.has(char);
  }

  public isSpecialCharacter(char: string) {
    return specialCharacterInputs.has(char);
  }
}
