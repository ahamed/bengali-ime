import type { VowelData } from './types';

export const hasant = '্';
export const fullStop = '.';
export const space = ' ';

export const symbols = new Map<string, string>([
  ['FULL_STOP', '.'],
  ['SPACE', ' '],
  ['ENTER_KEY', 'Enter'],
  ['DARI', '।'],
  ['DASH', '-'],
  ['DOUBLE_DASH', '—'],
  ['CAP', '^'],
  ['COLON', ':'],
  ['TYPOGRAPHIC_DOUBLE_QUOTE_OPEN', '\u201C'],
  ['TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE', '\u201D'],
  ['TYPOGRAPHIC_SINGLE_QUOTE_OPEN', '\u2018'],
  ['TYPOGRAPHIC_SINGLE_QUOTE_CLOSE', '\u2019'],
]);

export const phoneticVowels = {
  SWAR_E_O: 'অ',
  SWAR_E_A: 'আ',
  RASSAW_E: 'ই',
  DIRGHA_E: 'ঈ',
  RASSAW_U: 'উ',
  DIRGHA_U: 'ঊ',
  RASSAW_RI: 'ঋ',
  A: 'এ',
  OI: 'ঐ',
  O: 'ও',
  OU: 'ঔ',
} as const;

export const phoneticKar = {
  A_KAR: 'া',
  RASSAW_E_KAR: 'ি',
  DIRGHA_E_KAR: 'ী',
  RASSAW_U_KAR: 'ু',
  DIRGHA_U_KAR: 'ূ',
  RASSAW_RI_KAR: 'ৃ',
  E_KAR: 'ে',
  OI_KAR: 'ৈ',
  O_KAR: 'ো',
  OU_KAR: 'ৌ',
} as const;

export const phoneticConsonants = {
  KONTHYO_KO: 'ক',
  KONTHYO_KHO: 'খ',
  KONTHYO_GO: 'গ',
  KONTHYO_GHO: 'ঘ',
  KONTHYO_UNGO: 'ঙ',
  TALOBBO_CHO: 'চ',
  TALOBBO_CHHO: 'ছ',
  BORGIYO_JO: 'জ',
  BORGIYO_JHO: 'ঝ',
  TALOBBO_NYO: 'ঞ',
  MURDHONNO_TO: 'ট',
  MURDHONNO_THO: 'ঠ',
  MURDHONNO_DO: 'ড',
  MURDHONNO_DHO: 'ঢ',
  MURDHONNO_NO: 'ণ',
  DONTO_TO: 'ত',
  DONTO_THO: 'থ',
  DONTO_DO: 'দ',
  DONTO_DHO: 'ধ',
  DONTO_NO: 'ন',
  OSHTHO_PO: 'প',
  OSHTHO_PHO: 'ফ',
  OSHTHO_BO: 'ব',
  OSHTHO_BHO: 'ভ',
  OSHTHO_MO: 'ম',
  ONTOSTHO_JO: 'য',
  ONTOSTHO_RO: 'র',
  ONTOSTHO_LO: 'ল',
  TALOBBO_SHO: 'শ',
  MURDHONNO_SHO: 'ষ',
  DONTO_SHO: 'স',
  USHMO_HO: 'হ',
  D_E_SHUNNO_RO: 'ড়',
  DH_E_SHUNNO_RO: 'ঢ়',
  ONTOSTHO_YO: 'য়',
  KHONDO_TO: 'ৎ',
  CHONDROBINDU: 'ঁ',
  ONUSHWAR: 'ং',
  BISHORGO: 'ঃ',
} as const;

export const phoneticConsonantGraphemes = new Set<string>(
  Object.values(phoneticConsonants) as string[],
);

export const modifierGraphemeChars = new Set<string>([
  phoneticConsonants.CHONDROBINDU,
  phoneticConsonants.ONUSHWAR,
  phoneticConsonants.BISHORGO,
]);

export const bengaliConsonantLetterGraphemes = new Set<string>(
  [...phoneticConsonantGraphemes].filter((ch) => !modifierGraphemeChars.has(ch)),
);

export const independentVowelGraphemes = new Set<string>(Object.values(phoneticVowels) as string[]);

export const dependentVowelGraphemes = new Set<string>(Object.values(phoneticKar));

export const numbers = {
  EK: '১',
  DUI: '২',
  TIN: '৩',
  CHAR: '৪',
  PHANCH: '৫',
  CHAY: '৬',
  SAT: '৭',
  AAT: '৮',
  NAY: '৯',
  SHUNNO: '০',
} as const;

export const numberMap = new Map<string, string>([
  ['1', numbers.EK],
  ['2', numbers.DUI],
  ['3', numbers.TIN],
  ['4', numbers.CHAR],
  ['5', numbers.PHANCH],
  ['6', numbers.CHAY],
  ['7', numbers.SAT],
  ['8', numbers.AAT],
  ['9', numbers.NAY],
  ['0', numbers.SHUNNO],
]);

export const specialCharactersMap = new Map<string, string>([
  ['.', symbols.get('DARI')!],
  ['^', phoneticConsonants.CHONDROBINDU],
  [':', phoneticConsonants.BISHORGO],
  [',', ','],
]);

export const specialCharacterInputs = new Set<string>([
  ...specialCharactersMap.keys(),
  '-',
  '"',
  "'",
]);

export const romanToPhoneticVowels = new Map<string, VowelData>([
  ['o', { ind: phoneticVowels.SWAR_E_O, kar: '' }],
  ['a', { ind: phoneticVowels.SWAR_E_A, kar: phoneticKar.A_KAR }],
  ['A', { ind: phoneticVowels.SWAR_E_A, kar: phoneticKar.A_KAR }],
  ['i', { ind: phoneticVowels.RASSAW_E, kar: phoneticKar.RASSAW_E_KAR }],
  ['I', { ind: phoneticVowels.DIRGHA_E, kar: phoneticKar.DIRGHA_E_KAR }],
  ['u', { ind: phoneticVowels.RASSAW_U, kar: phoneticKar.RASSAW_U_KAR }],
  ['U', { ind: phoneticVowels.DIRGHA_U, kar: phoneticKar.DIRGHA_U_KAR }],
  ['e', { ind: phoneticVowels.A, kar: phoneticKar.E_KAR }],
  ['E', { ind: phoneticVowels.A, kar: phoneticKar.E_KAR }],
  ['O', { ind: phoneticVowels.O, kar: phoneticKar.O_KAR }],
]);

export const nasalGraphemeByKind = new Map<'TALOBBO_NYO' | 'ONUSHWAR' | 'KONTHYO_UNGO', string>([
  ['TALOBBO_NYO', phoneticConsonants.TALOBBO_NYO],
  ['ONUSHWAR', phoneticConsonants.ONUSHWAR],
  ['KONTHYO_UNGO', phoneticConsonants.KONTHYO_UNGO],
]);

export const supplementaryMarkByKind = new Map<'CHONDROBINDU' | 'BISHORGO', string>([
  ['CHONDROBINDU', phoneticConsonants.CHONDROBINDU],
  ['BISHORGO', phoneticConsonants.BISHORGO],
]);

export const defaultConsonantByRomanKey = new Map<string, string>([
  ['q', phoneticConsonants.KONTHYO_KO],
  ['k', phoneticConsonants.KONTHYO_KO],
  ['g', phoneticConsonants.KONTHYO_GO],
  ['c', phoneticConsonants.TALOBBO_CHO],
  ['j', phoneticConsonants.BORGIYO_JO],
  ['t', phoneticConsonants.DONTO_TO],
  ['d', phoneticConsonants.DONTO_DO],
  ['n', phoneticConsonants.DONTO_NO],
  ['p', phoneticConsonants.OSHTHO_PO],
  ['b', phoneticConsonants.OSHTHO_BO],
  ['m', phoneticConsonants.OSHTHO_MO],
  ['r', phoneticConsonants.ONTOSTHO_RO],
  ['l', phoneticConsonants.ONTOSTHO_LO],
  ['s', phoneticConsonants.DONTO_SHO],
  ['z', phoneticConsonants.ONTOSTHO_JO],
  ['y', phoneticConsonants.ONTOSTHO_YO],
  ['v', phoneticConsonants.OSHTHO_BHO],
  ['h', phoneticConsonants.USHMO_HO],
  ['w', phoneticConsonants.OSHTHO_BO],
  ['f', phoneticConsonants.OSHTHO_PHO],
  [
    'x',
    phoneticConsonants.KONTHYO_KO + hasant + phoneticConsonants.DONTO_SHO,
  ],
]);

export type HeroQwertyLowercaseLetter =
  | 'q'
  | 'w'
  | 'e'
  | 'r'
  | 't'
  | 'y'
  | 'u'
  | 'i'
  | 'o'
  | 'p'
  | 'a'
  | 's'
  | 'd'
  | 'f'
  | 'g'
  | 'h'
  | 'j'
  | 'k'
  | 'l'
  | 'z'
  | 'x'
  | 'c'
  | 'v'
  | 'b'
  | 'n'
  | 'm';

const heroQwertyLetterOrder: readonly HeroQwertyLowercaseLetter[] = [
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p',
  'a',
  's',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
];

const buildHeroKeyboardGraphemeByQwertyLowercase = (): Record<
  HeroQwertyLowercaseLetter,
  string
> => {
  const out = {} as Record<HeroQwertyLowercaseLetter, string>;
  for (const ch of heroQwertyLetterOrder) {
    const vowel = romanToPhoneticVowels.get(ch);
    if (vowel) {
      out[ch] = vowel.ind;
      continue;
    }
    if (ch === 'q') {
      out[ch] = phoneticConsonants.KONTHYO_KO;
      continue;
    }
    const cons = defaultConsonantByRomanKey.get(ch);
    if (!cons) {
      throw new Error(`heroKeyboardGraphemeByQwertyLowercase: missing mapping for "${ch}"`);
    }
    out[ch] = cons;
  }
  return out;
};

export const heroKeyboardGraphemeByQwertyLowercase = buildHeroKeyboardGraphemeByQwertyLowercase();

export const capitalRomanToConsonant = new Map<string, string>([
  ['T', phoneticConsonants.MURDHONNO_TO],
  ['D', phoneticConsonants.MURDHONNO_DO],
  ['N', phoneticConsonants.MURDHONNO_NO],
  ['R', phoneticConsonants.D_E_SHUNNO_RO],
  ['S', phoneticConsonants.TALOBBO_SHO],
]);

const NYO_CHO = 'ঞ্চ';
const NYO_CHHO = 'ঞ্ছ';

export const aspiratedConsonantByBase = new Map<string, string>([
  [phoneticConsonants.KONTHYO_KO, phoneticConsonants.KONTHYO_KHO],
  [phoneticConsonants.KONTHYO_GO, phoneticConsonants.KONTHYO_GHO],
  [phoneticConsonants.TALOBBO_CHO, phoneticConsonants.TALOBBO_CHHO],
  [phoneticConsonants.BORGIYO_JO, phoneticConsonants.BORGIYO_JHO],
  [phoneticConsonants.DONTO_TO, phoneticConsonants.DONTO_THO],
  [phoneticConsonants.MURDHONNO_TO, phoneticConsonants.MURDHONNO_THO],
  [phoneticConsonants.DONTO_DO, phoneticConsonants.DONTO_DHO],
  [phoneticConsonants.MURDHONNO_DO, phoneticConsonants.MURDHONNO_DHO],
  [phoneticConsonants.OSHTHO_PO, phoneticConsonants.OSHTHO_PHO],
  [phoneticConsonants.OSHTHO_BO, phoneticConsonants.OSHTHO_BHO],
  [phoneticConsonants.D_E_SHUNNO_RO, phoneticConsonants.DH_E_SHUNNO_RO],
  [phoneticConsonants.DONTO_SHO, phoneticConsonants.TALOBBO_SHO],
  [phoneticConsonants.TALOBBO_SHO, phoneticConsonants.MURDHONNO_SHO],
  [NYO_CHO, NYO_CHHO],
]);
