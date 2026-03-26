export type IMEAction =
  | { type: 'insert'; text: string }
  | { type: 'replace'; charsBack: number; text: string }
  | { type: 'delete'; charsBack: number }
  | { type: 'splitBlock' };

export type VowelData = {
  ind: string;
  kar: string;
};

export interface BengaliIMEInterface {
  buffer: string;
  output: string;
  isEnglishMode: boolean;
  readonly hasant: string;

  pop(count?: number): void;
  append(text: string, updateBuffer?: boolean): void;
  replaceLast(next: string, flushBuffer?: boolean, count?: number): void;
  isVowel(char: string): boolean;
  appendAndFlushBuffer(text: string): void;
  isPhoneticConsonant(char: string): boolean;
  isNumber(char: string): boolean;
  isSpecialCharacter(char: string): boolean;
}

export interface Akkhar {
  proceed(ime: BengaliIMEInterface, char: string): boolean;
}
