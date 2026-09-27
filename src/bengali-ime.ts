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
  karTakingConsonantGraphemes,
  numberMap,
  phoneticConsonantGraphemes,
  phoneticConsonants,
  romanToPhoneticVowels,
  specialCharacterInputs,
  specialCharactersMap,
  symbols,
} from './bengali-ime-data';
import type { Akkhar, IMEAction } from './types';
import {
  endsWithConsonantAndChandrabindu,
  endsWithKarTakingConsonant,
} from './vowel-attach-context';

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

const DARI = symbols.get('DARI')!;
const FULL_STOP = symbols.get('FULL_STOP')!;
const CHONDROBINDU = phoneticConsonants.CHONDROBINDU;
const bengaliDigits = new Set(numberMap.values());

const endsWithDigit = (text: string) => {
  const last = text.at(-1);
  return last !== undefined && (numberMap.has(last) || bengaliDigits.has(last));
};

/** Undo record for one keystroke: the state to restore when it is backspaced. */
type UndoEntry = {
  keepLength: number;
  removedTail: string;
  buffer: string;
  skipDocumentKarForNextVowel: boolean;
};

/** At least this many keystrokes can always be undone. */
const MAX_UNDO_ENTRIES = 1024;

/**
 * Output is stored as `committed + recent`. Every rule only looks a few
 * characters back, so edits happen in the short `recent` string and older text
 * is moved into `committed`, which is never read while typing. Reading the end
 * of one ever-growing string would flatten it on every keystroke (O(n²) for
 * bulk conversion).
 */
const RECENT_KEEP = 32;
const RECENT_MAX = 256;

export type BengaliIMEProcessOptions = {
  textBeforeCaret?: string;
};

export class BengaliIME {
  public buffer = '';
  public isEnglishMode = false;
  public readonly hasant = hasant;

  protected actions: IMEAction[] = [];
  protected skipDocumentKarForNextVowel = false;

  protected committed = '';
  protected recent = '';

  /** One entry per keystroke, so Backspace can restore the exact prior state. */
  protected undoStack: UndoEntry[] = [];
  /** Set when the host assigns `output`, and a buffer snapshot to detect the same for `buffer`. */
  protected outputAssigned = false;
  protected trackedBuffer = '';
  /** Lowest output index modified by the current keystroke. */
  protected touchedFrom = 0;

  get output(): string {
    return this.committed + this.recent;
  }

  /** Hosts may assign this to resync with the document (this clears the undo history). */
  set output(value: string) {
    this.committed = '';
    this.recent = value;
    this.outputAssigned = true;
    this.compactRecent();
  }

  protected get outputLength(): number {
    return this.committed.length + this.recent.length;
  }

  protected compactRecent() {
    if (this.recent.length > RECENT_MAX) {
      const cut = this.recent.length - RECENT_KEEP;
      this.committed += this.recent.slice(0, cut);
      this.recent = this.recent.slice(cut);
    }
  }

  /** Makes sure the last `count` code units of the output are in `recent`. */
  protected ensureRecent(count: number) {
    if (count <= this.recent.length || this.committed.length === 0) {
      return;
    }
    const cut = Math.max(0, this.committed.length - (count - this.recent.length + RECENT_KEEP));
    this.recent = this.committed.slice(cut) + this.recent;
    this.committed = this.committed.slice(0, cut);
  }

  /** Replaces the last `count` code units of the output with `text`. */
  protected spliceTail(count: number, text: string) {
    this.ensureRecent(count);
    this.touch(this.outputLength - count);
    this.recent = this.recent.slice(0, this.recent.length - count) + text;
    this.compactRecent();
  }

  /**
   * Undoes the last keystroke: the output, buffer and flags return to exactly
   * what they were before it, so the result always equals typing the remaining
   * keys from scratch. If the host changed `output`/`buffer` (resync), there is
   * nothing to undo and one code point is deleted instead.
   */
  processBackspace(): IMEAction[] {
    this.actions = [];
    this.dropUndoHistoryIfResynced();

    const entry = this.undoStack.pop();
    if (entry) {
      this.restore(entry);
    } else {
      this.deleteLastCodePoint();
    }

    this.trackState();
    return this.actions;
  }

  process(char: string, options?: BengaliIMEProcessOptions): IMEAction[] {
    this.actions = [];
    this.dropUndoHistoryIfResynced();

    const committedBefore = this.committed;
    const recentBefore = this.recent;
    const bufferBefore = this.buffer;
    const skipBefore = this.skipDocumentKarForNextVowel;
    this.touchedFrom = this.outputLength;

    this.processKeystroke(char, options?.textBeforeCaret);

    if (this.actions.length > 0) {
      const removedTail =
        this.touchedFrom >= committedBefore.length
          ? recentBefore.slice(this.touchedFrom - committedBefore.length)
          : (committedBefore + recentBefore).slice(this.touchedFrom);
      this.undoStack.push({
        keepLength: this.touchedFrom,
        removedTail,
        buffer: bufferBefore,
        skipDocumentKarForNextVowel: skipBefore,
      });
      if (this.undoStack.length > MAX_UNDO_ENTRIES * 2) {
        this.undoStack.splice(0, MAX_UNDO_ENTRIES);
      }
    }

    this.trackState();
    return this.actions;
  }

  toggleEnglishMode(): void {
    this.isEnglishMode = !this.isEnglishMode;
    this.flushBuffer();
    this.skipDocumentKarForNextVowel = false;
    this.trackState();
  }

  protected touch(index: number) {
    this.touchedFrom = Math.max(0, Math.min(this.touchedFrom, index));
  }

  protected trackState() {
    this.outputAssigned = false;
    this.trackedBuffer = this.buffer;
  }

  protected dropUndoHistoryIfResynced() {
    if (this.outputAssigned || this.buffer !== this.trackedBuffer) {
      this.undoStack = [];
    }
  }

  protected restore(entry: UndoEntry) {
    const charsBack = this.outputLength - entry.keepLength;
    if (charsBack > 0 && entry.removedTail.length > 0) {
      this.actions.push({ type: 'replace', charsBack, text: entry.removedTail });
    } else if (charsBack > 0) {
      this.actions.push({ type: 'delete', charsBack });
    } else if (entry.removedTail.length > 0) {
      this.actions.push({ type: 'insert', text: entry.removedTail });
    }

    this.spliceTail(charsBack, entry.removedTail);
    this.buffer = entry.buffer;
    this.skipDocumentKarForNextVowel = entry.skipDocumentKarForNextVowel;
  }

  /** Deletes one code point, plus a hasant it would leave dangling (ক্ত → ক). */
  protected deleteLastCodePoint() {
    this.ensureRecent(3);
    const { recent } = this;
    if (recent.length === 0) {
      return;
    }
    const low = recent.charCodeAt(recent.length - 1);
    let count = recent.length >= 2 && low >= 0xdc00 && low <= 0xdfff ? 2 : 1;
    if (recent.slice(0, -count).endsWith(this.hasant)) {
      count += this.hasant.length;
    }
    this.pop(count);
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
      // Chandrabindu sits on the syllable, so a silent `o` before it still counts.
      if (char !== symbols.get('CAP')) {
        this.skipDocumentKarForNextVowel = false;
      }
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

    // A kar only ever attaches to a consonant directly before the caret; after
    // anything else (vowel, ং, ঃ, ৎ, space, punctuation) the vowel is independent.
    // `o` after a consonant is the silent inherent vowel, so the next vowel
    // starts a new syllable.
    const prior = textBeforeCaret ?? this.recent;
    const afterSilentO = this.skipDocumentKarForNextVowel;
    this.skipDocumentKarForNextVowel = false;

    // `O` keeps the buffer so a following `i`/`u` can form ঐ/ঔ.
    const keepBuffer = vowelKey === 'O';

    if (!afterSilentO && endsWithKarTakingConsonant(prior)) {
      if (keepBuffer) {
        this.append(vowel.kar);
      } else {
        this.appendAndFlushBuffer(vowel.kar);
      }
      this.skipDocumentKarForNextVowel = vowelKey === 'o';
      return;
    }

    // Chandrabindu typed before the vowel (`k^a`): the kar goes before ঁ.
    if (!afterSilentO && endsWithConsonantAndChandrabindu(prior)) {
      this.replaceLast(vowel.kar + CHONDROBINDU, !keepBuffer);
      this.skipDocumentKarForNextVowel = vowelKey === 'o';
      return;
    }

    if (keepBuffer) {
      this.append(vowel.ind);
    } else {
      this.appendAndFlushBuffer(vowel.ind);
    }
  }

  protected processConsonant(char: string) {
    const lastInBuffer = this.buffer.at(-1);

    if (this.passedAny([Kkhiyo, Ho, KhandaTo, JaFala, AspiratedConsonant], char)) {
      return;
    }

    if (this.processNasalConnectors(char)) {
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
      this.processUnmappedKey(char);
      return;
    }

    const hasHasant =
      lastInBuffer !== undefined && this.isKarTakingConsonant(lastInBuffer);

    this.append(hasHasant ? this.hasant + consonant : consonant);
  }

  /** Any other single character is written as-is and ends the cluster. */
  protected processUnmappedKey(char: string) {
    if ([...char].length !== 1) {
      return;
    }
    this.appendAndFlushBuffer(char);
  }

  protected processNasalConnectors(char: string): boolean {
    if (this.passedAny([NyoPlusCha, Onushwar, Ungo, JoPlusNyo, Nyo, NyoPlusBorgiyoJo], char)) {
      return true;
    }

    return false;
  }

  protected processSpecialCharacters(char: string, textBeforeCaret?: string): boolean {
    if (char === symbols.get('DASH')) {
      const priorHyphenAtCaret = (textBeforeCaret ?? this.recent).endsWith('-');
      if (priorHyphenAtCaret) {
        this.actions.push({
          type: 'replace',
          charsBack: 1,
          text: symbols.get('DOUBLE_DASH')!,
        });
        if (this.recent.endsWith('-')) {
          this.spliceTail(1, symbols.get('DOUBLE_DASH')!);
        }
        this.flushBuffer();
        return true;
      }
      this.appendAndFlushBuffer(symbols.get('DASH')!);
      return true;
    }

    if (char === FULL_STOP) {
      this.processFullStop(textBeforeCaret ?? this.recent);
      return true;
    }

    if (char === symbols.get('CAP')) {
      // Kept in the buffer so a following vowel can slot its kar before ঁ,
      // and O + ^ + i can still become ৈঁ.
      this.append(CHONDROBINDU);
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

  /**
   * `.` after a digit stays a decimal point, `.` after `।` turns it into `..`
   * (so `...` is an ellipsis), and `.` after `.` stays `.`; otherwise `।`.
   */
  protected processFullStop(prior: string) {
    if (endsWithDigit(prior) || prior.endsWith(FULL_STOP)) {
      this.appendAndFlushBuffer(FULL_STOP);
      return;
    }

    if (prior.endsWith(DARI)) {
      this.actions.push({ type: 'replace', charsBack: DARI.length, text: FULL_STOP + FULL_STOP });
      if (this.recent.endsWith(DARI)) {
        this.spliceTail(DARI.length, FULL_STOP + FULL_STOP);
      }
      this.flushBuffer();
      return;
    }

    this.appendAndFlushBuffer(DARI);
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

    this.spliceTail(count, next);
    this.actions.push({ type: 'replace', charsBack: count, text: next });

    if (flushBuffer) {
      this.flushBuffer();
    } else {
      this.buffer = this.buffer.slice(0, end) + next;
    }
  }

  public pop(count = 1) {
    this.skipDocumentKarForNextVowel = false;
    this.spliceTail(count, '');
    this.actions.push({ type: 'delete', charsBack: count });
    this.flushBuffer();
  }

  public append(text: string, updateBuffer = true) {
    this.recent += text;
    this.compactRecent();
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

  public isKarTakingConsonant(char: string) {
    return karTakingConsonantGraphemes.has(char);
  }

  public isNumber(char: string) {
    return numberMap.has(char);
  }

  public isSpecialCharacter(char: string) {
    return specialCharacterInputs.has(char);
  }
}
