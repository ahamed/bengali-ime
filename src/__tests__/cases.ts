/**
 * Shared engine inputs. The vitest suites import the tables below, and
 * scripts/gen-fixtures.ts replays every table and scenario through the engine
 * to produce fixtures/engine/unit.json for the native (Rust) port.
 */
import type { TranspileRomanDocumentOptions } from "../transpile-roman-document";

/** One step fed to a fresh BengaliIME. */
export type EngineStep =
  | { key: string; textBeforeCaret?: string }
  | { backspace: true }
  | { toggleEnglish: true }
  | { setOutput: string };

export type EngineScenario = { name: string; steps: EngineStep[] };

const keys = (roman: string, textBeforeCaret?: string): EngineStep[] =>
  [...roman].map((key) =>
    textBeforeCaret === undefined ? { key } : { key, textBeforeCaret },
  );

export const lowercaseConsonantCases: [string, string][] = [
  ["k", "ক"],
  ["q", "ক"],
  ["g", "গ"],
  ["c", "চ"],
  ["j", "জ"],
  ["t", "ত"],
  ["d", "দ"],
  ["n", "ন"],
  ["p", "প"],
  ["b", "ব"],
  ["m", "ম"],
  ["r", "র"],
  ["l", "ল"],
  ["s", "স"],
  ["z", "য"],
  ["y", "\u09DF"],
  ["v", "ভ"],
  ["w", "ব"],
  ["h", "হ"],
  ["f", "ফ"],
  ["x", "ক্স"],
];

export const capitalConsonantCases: [string, string][] = [
  ["T", "ট"],
  ["D", "ড"],
  ["N", "ণ"],
  ["R", "\u09DC"],
  ["S", "শ"],
];

export const aspirationSequenceCases: [string, string][] = [
  ["kh", "খ"],
  ["gh", "ঘ"],
  ["ch", "ছ"],
  ["jh", "ঝ"],
  ["th", "থ"],
  ["Th", "ঠ"],
  ["dh", "ধ"],
  ["Dh", "ঢ"],
  ["ph", "ফ"],
  ["bh", "ভ"],
  ["sh", "শ"],
  ["Sh", "ষ"],
];

export const nasalClusterCases: [string, string][] = [
  ["gg", "জ্ঞ"],
  ["nc", "ঞ্চ"],
  ["nj", "ঞ্জ"],
  ["nch", "ঞ্ছ"],
  ["njh", "ঞ্ঝ"],
  ["ng", "ং"],
  ["Ng", "ঙ"],
];

export const independentVowelCases: [string, string][] = [
  ["a", "আ"],
  ["i", "ই"],
  ["I", "ঈ"],
  ["u", "উ"],
  ["U", "ঊ"],
  ["e", "এ"],
  ["E", "এ"],
  ["o", "অ"],
  ["O", "ও"],
];

export const karOnKoCases: [string, string][] = [
  ["ka", "কা"],
  ["ki", "কি"],
  ["kI", "কী"],
  ["ku", "কু"],
  ["kU", "কূ"],
  ["ke", "কে"],
  ["kO", "কো"],
];

export const digitCases: [string, string][] = [
  ["0", "০"],
  ["1", "১"],
  ["2", "২"],
  ["3", "৩"],
  ["4", "৪"],
  ["5", "৫"],
  ["6", "৬"],
  ["7", "৭"],
  ["8", "৮"],
  ["9", "৯"],
];

/** [test name, texts before caret, expected endsWithKarTakingConsonant for each] */
export const vowelAttachCases: [string, string[], boolean][] = [
  ["returns true when last grapheme is a bare consonant (একট scenario)", ["একট"], true],
  ["returns false when text is empty", [""], false],
  ["returns false for trailing whitespace only", ["   "], false],
  ["returns false when last grapheme is an independent vowel", ["এ"], false],
  ["returns false when last grapheme already has a matra", ["কা"], false],
  ["returns false when last grapheme ends with anusvara", ["কং"], false],
  ["returns true for juktakkhor ending in consonant", ["ক্ট"], true],
  ["returns false for Latin text", ["hello"], false],
  ["does not look past trailing spaces before caret", ["ত ", "ত   "], false],
  ["returns false after khanda ta", ["ৎ"], false],
];

/** [test name, roman document, options, expected Bengali] */
export const transpileCases: [
  string,
  string,
  TranspileRomanDocumentOptions | undefined,
  string,
][] = [
  [
    "defaults preserveLineBreaks to true and inserts newlines at paragraph breaks",
    "a\nb",
    undefined,
    "আ\nব",
  ],
  ["honors double newline at same output length", "a\n\nb", undefined, "আ\n\nব"],
  [
    "with preserveLineBreaks false passes raw newlines through as plain characters",
    "a\nb",
    { preserveLineBreaks: false },
    "আ\nব",
  ],
];

/** Inputs of the single-scenario tests in bengali-ime.test.ts. */
export const engineScenarios: EngineScenario[] = [
  { name: "capital K G T P M", steps: keys("KGTPM") },
  { name: "k S h stack", steps: keys("kSh") },
  { name: "kkhiyo", steps: keys("kkh") },
  { name: "n G stacks", steps: keys("nG") },
  { name: "k g g", steps: keys("kgg") },
  { name: "k t h", steps: keys("kth") },
  { name: "ja-phala", steps: keys("ky") },
  { name: "rri", steps: keys("rri") },
  { name: "krri", steps: keys("krri") },
  { name: "rrri", steps: keys("rrri") },
  { name: "krrri", steps: keys("krrri") },
  { name: "kri", steps: keys("kri") },
  { name: "kRh", steps: keys("kRh") },
  { name: "khanda ta then k", steps: keys("tHk") },
  { name: "k o", steps: keys("ko") },
  { name: "kOi", steps: keys("kOi") },
  { name: "kOu", steps: keys("kOu") },
  { name: "Oi", steps: keys("Oi") },
  { name: "Ou", steps: keys("Ou") },
  { name: "kE", steps: keys("kE") },
  { name: "oi", steps: keys("oi") },
  { name: "ok", steps: keys("ok") },
  { name: "koi", steps: keys("koi") },
  { name: "punctuation", steps: keys(".^:,") },
  { name: "ah", steps: keys("ah") },
  { name: "hk", steps: keys("hk") },
  { name: "rh", steps: keys("rh") },
  {
    name: "english mode passthrough",
    steps: [{ toggleEnglish: true }, ...keys("kx "), { key: "Enter" }, { toggleEnglish: true }, ...keys("k")],
  },
  { name: "t space", steps: keys("t ") },
  { name: "Enter", steps: [{ key: "Enter" }] },
  {
    name: "backspace then document kar",
    steps: [...keys("ekoTi"), { backspace: true }, { key: "a", textBeforeCaret: "একট" }],
  },
  { name: "vowel after independent vowel context", steps: keys("a", "এ") },
  {
    name: "m-o-i silent o with context",
    steps: [...keys("mo"), { key: "i", textBeforeCaret: "ম" }],
  },
  {
    name: "m-o-a silent o with context",
    steps: [...keys("mo"), { key: "a", textBeforeCaret: "ম" }],
  },
  {
    name: "independent o does not arm the silent-o break",
    steps: [{ key: "o" }, { key: "a", textBeforeCaret: "\u0995" }],
  },
  { name: "backspace after kar", steps: [...keys("ka"), { backspace: true }] },
  { name: "backspace on empty", steps: [{ backspace: true }] },
  { name: "hyphen", steps: keys("-") },
  { name: "double hyphen", steps: keys("--") },
  { name: "second hyphen with empty context", steps: [...keys("-"), { key: "-", textBeforeCaret: "" }] },
  { name: "double quotes", steps: keys('"""') },
  {
    name: "double quote balance from context",
    steps: [{ setOutput: "ক" }, { key: '"', textBeforeCaret: "ক“ব”" }],
  },
  { name: "single quotes", steps: keys("'''") },
  {
    name: "single quote balance from context",
    steps: [{ setOutput: "ক" }, { key: "'", textBeforeCaret: "ক‘ব’" }],
  },
  { name: "apostrophe after kar", steps: keys("ka'") },
  { name: "apostrophe after digit", steps: keys("1'") },
  { name: "unmapped keys pass through", steps: keys("k?a!(") },
];
