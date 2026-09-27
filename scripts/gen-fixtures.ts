/**
 * Generates the parity fixtures in fixtures/engine/ by running the TypeScript
 * engine, which is the reference implementation. The Rust port replays them.
 *
 *   yarn fixtures
 *
 * Output is deterministic: running it twice must not change any file.
 * See fixtures/README.md for the file formats.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BengaliIME } from "../src/bengali-ime";
import * as data from "../src/bengali-ime-data";
import type { IMEAction } from "../src/types";
import { shouldAttachKarWhenBufferEmpty } from "../src/vowel-attach-context";
import { transpileRomanDocument } from "../src/transpile-roman-document";
import {
  aspirationSequenceCases,
  capitalConsonantCases,
  digitCases,
  engineScenarios,
  independentVowelCases,
  karOnKoCases,
  lowercaseConsonantCases,
  nasalClusterCases,
  transpileCases,
  vowelAttachCases,
  type EngineStep,
} from "../src/__tests__/cases";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "engine");

type EncodedAction = ["i", string] | ["r", number, string] | ["d", number] | ["s"];
type EncodedStep = {
  k?: string;
  c?: string;
  bs?: 1;
  en?: 1;
  set?: string;
  a: EncodedAction[];
  o: string;
  b: string;
};
type EngineCase = { name: string; category?: string; steps: EncodedStep[] };

const encodeAction = (action: IMEAction): EncodedAction => {
  switch (action.type) {
    case "insert":
      return ["i", action.text];
    case "replace":
      return ["r", action.charsBack, action.text];
    case "delete":
      return ["d", action.charsBack];
    case "splitBlock":
      return ["s"];
  }
};

const runStep = (ime: BengaliIME, step: EngineStep): EncodedStep => {
  let actions: IMEAction[] = [];
  const recorded: Partial<EncodedStep> = {};
  if ("key" in step) {
    recorded.k = step.key;
    if (step.textBeforeCaret !== undefined) {
      recorded.c = step.textBeforeCaret;
    }
    actions = ime.process(
      step.key,
      step.textBeforeCaret === undefined ? undefined : { textBeforeCaret: step.textBeforeCaret },
    );
  } else if ("backspace" in step) {
    recorded.bs = 1;
    actions = ime.processBackspace();
  } else if ("toggleEnglish" in step) {
    recorded.en = 1;
    ime.toggleEnglishMode();
  } else {
    recorded.set = step.setOutput;
    ime.output = step.setOutput;
  }
  return { ...recorded, a: actions.map(encodeAction), o: ime.output, b: ime.buffer };
};

const runCase = (name: string, steps: EngineStep[], category?: string): EngineCase => {
  const ime = new BengaliIME();
  return {
    name,
    ...(category === undefined ? {} : { category }),
    steps: steps.map((step) => runStep(ime, step)),
  };
};

const keySteps = (roman: string): EngineStep[] =>
  [...roman].map((ch) => ({ key: ch === "\n" ? "Enter" : ch }));

/** Replays like an editor whose document is exactly the engine output. */
const runWithOutputContext = (name: string, roman: string, category: string): EngineCase => {
  const ime = new BengaliIME();
  const steps = [...roman].map((ch) =>
    runStep(ime, { key: ch === "\n" ? "Enter" : ch, textBeforeCaret: ime.output }),
  );
  return { name, category, steps };
};

/** One case per line keeps diffs readable and the files compact. */
const writeCases = (file: string, description: string, cases: unknown[]) => {
  const body = cases.map((c) => `    ${JSON.stringify(c)}`).join(",\n");
  const json = `{\n  "format": 1,\n  "description": ${JSON.stringify(description)},\n  "cases": [\n${body}\n  ]\n}\n`;
  writeFileSync(join(outDir, file), json);
};

// Deterministic PRNG (mulberry32) so random.json is stable across runs.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------- unit.json
const tableCases: [string, [string, string][]][] = [
  ["lowercase consonant", lowercaseConsonantCases],
  ["capital consonant", capitalConsonantCases],
  ["aspiration", aspirationSequenceCases],
  ["nasal cluster", nasalClusterCases],
  ["independent vowel", independentVowelCases],
  ["kar on ko", karOnKoCases],
  ["digit", digitCases],
];

const unitCases: EngineCase[] = [
  ...tableCases.flatMap(([category, rows]) =>
    rows.map(([roman]) => runCase(`${category}: ${roman}`, keySteps(roman), category)),
  ),
  ...engineScenarios.map((scenario) => runCase(scenario.name, scenario.steps, "scenario")),
];

// --------------------------------------------------------------- words.json
const words: Record<string, string[]> = {
  aspiration: ["khub", "ghor", "chata", "jhor", "thala", "Thik", "dhan", "Dhol", "phul", "bhai", "shap", "ShoRoz", "Kola", "Ghor", "Pakhi"],
  conjuncts: ["bakSo", "kkhoma", "shikkha", "bastob", "onto", "kotha", "golpo", "swapno", "bondhu", "shontan", "ashcorjo", "stri", "spoSTo", "kSoy", "xam"],
  rri: ["rrin", "krriShi", "brriShTi", "rrrit", "grriho", "trrina"],
  "oi-ou": ["Oikko", "kOi", "Oi", "OuShodh", "bOu", "gOurob", "Ou"],
  nasals: ["bangla", "rong", "kaNgal", "Ng", "shonga", "ponca", "binjon", "ganj", "shongkha", "anko", "chnad", "kanch", "gg", "bigggan", "nG"],
  "ya-phala": ["bakyo", "sotyo", "byakoron", "jyoti", "kyamera", "Ghy"],
  "khanda-ta": ["hotHat", "sotHkar", "utHsob", "tH"],
  digits: ["2024", "1971 sal", "0123456789"],
  punctuation: ["ami bhalo achi.", "ki?", "ha, na:", "cad^", "boi. khata. kolom.", "a . b"],
  dash: ["ek--dui", "a-b", "---", "- -", "k-", "ka--"],
  quotes: ["\"ami\" bollam", "'ek' 'dui'", "rahim's boi", "\"'a'\"", "1'", "''\"\""],
  "silent-o": ["koi", "moa", "koO", "ko o", "boi", "noy", "kooa"],
  "word-boundaries": ["ek dui", "ek\ndui", "ek\n\ndui", "  a  ", "k ", "k\n"],
  sentences: [
    "ami banglay gan gai",
    "amar sOnar bangla, ami tomay bhalobasi.",
    "tumi kemon acho?",
    "ekTi chOTo nodi",
    "bangladesher rajdhani Dhaka.",
    "Ekushe februyari 1952",
  ],
};

const wordCases: EngineCase[] = Object.entries(words).flatMap(([category, list]) =>
  list.flatMap((roman) => [
    runCase(`${category}: ${JSON.stringify(roman)}`, keySteps(roman), category),
    runWithOutputContext(`${category} (output context): ${JSON.stringify(roman)}`, roman, category),
  ]),
);

// -------------------------------------------------------------- random.json
const randomKeys = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ...".^:,-\"'",
  " ",
  "Enter",
  // Keys the engine does not map; it must drop them in both implementations.
  ..."?!(/",
];
// Weight the most rule-heavy keys so clusters form often.
const hotKeys = [..."kghrnoOiuaSTtdpbsjcyH"];
const contextPool = [
  "",
  " ",
  "ত  ",
  "hello",
  "এক",
  "এ",
  "কা",
  "কং",
  "ক্",
  "ক্ষ",
  "ন্ত",
  "ক্ট",
  "স্ত্র",
  "জ্ঞ",
  "ঞ্চ",
  "ৎ",
  "য়",
  "ড়",
  "কঁ",
  "১",
  "-",
  "ক“",
  "ক‘",
  "ক“ব”",
  "কি'",
];

type ContextMode = "none" | "output" | "pool";
const contextModes: ContextMode[] = ["none", "output", "pool"];

const rand = mulberry32(20260927);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

const randomCases: EngineCase[] = [];
const RANDOM_CASES = 2400;
for (let n = 0; n < RANDOM_CASES; n++) {
  const mode = contextModes[n % contextModes.length]!;
  const length = 1 + Math.floor(rand() * 12);
  const ime = new BengaliIME();
  const steps: EncodedStep[] = [];
  for (let i = 0; i < length; i++) {
    const roll = rand();
    let step: EngineStep;
    if (roll < 0.06) {
      step = { backspace: true };
    } else {
      const key = roll < 0.5 ? pick(hotKeys) : pick(randomKeys);
      if (mode === "output") {
        step = { key, textBeforeCaret: ime.output };
      } else if (mode === "pool" && rand() < 0.5) {
        step = { key, textBeforeCaret: pick(contextPool) };
      } else {
        step = { key };
      }
    }
    steps.push(runStep(ime, step));
  }
  randomCases.push({ name: `random ${n} (${mode})`, steps });
}

// -------------------------------------------------------- vowel-attach.json
const attachTexts = new Set<string>([
  ...vowelAttachCases.map(([, text]) => text),
  ...contextPool,
  // Conjunct-ending contexts: grapheme segmentation must agree between engines.
  "ক্ষ",
  "ন্ত",
  "ক্ষ্ম",
  "ন্ত্র",
  "র্",
  "ক্‌",
  "ক্‍",
  "á",
  "ক ",
  "ক  ",
  "ক\t\t",
  "ক  ",
  "ক　 ",
  "ক﻿﻿",
  "ক\u0085\u0085",
  ...randomCases.map((c) => c.steps.at(-1)!.o).filter((o) => o.length > 0).slice(0, 600),
]);
const vowelAttach = [...attachTexts].map((text) => ({
  text,
  attach: shouldAttachKarWhenBufferEmpty(text),
}));

// ----------------------------------------------------------- transpile.json
const transpileDocs: { input: string; preserveLineBreaks?: boolean }[] = [
  ...transpileCases.map(([, input, options]) => ({
    input,
    ...(options?.preserveLineBreaks === undefined ? {} : { preserveLineBreaks: options.preserveLineBreaks }),
  })),
  { input: "ami banglay gan gai\nami banglar gan gai" },
  { input: "ami banglay gan gai\nami banglar gan gai", preserveLineBreaks: false },
  ...Object.values(words).flat().map((input) => ({ input })),
];
const transpile = transpileDocs.map((doc) => ({
  ...doc,
  output: transpileRomanDocument(
    doc.input,
    doc.preserveLineBreaks === undefined ? undefined : { preserveLineBreaks: doc.preserveLineBreaks },
  ),
}));

// ---------------------------------------------------------------- data.json
const pairs = (map: Map<string, unknown>) => [...map.entries()];
const tables = {
  hasant: data.hasant,
  symbols: pairs(data.symbols),
  numberMap: pairs(data.numberMap),
  specialCharactersMap: pairs(data.specialCharactersMap),
  specialCharacterInputs: [...data.specialCharacterInputs],
  romanToPhoneticVowels: pairs(data.romanToPhoneticVowels),
  defaultConsonantByRomanKey: pairs(data.defaultConsonantByRomanKey),
  capitalRomanToConsonant: pairs(data.capitalRomanToConsonant),
  aspiratedConsonantByBase: pairs(data.aspiratedConsonantByBase),
  phoneticConsonantGraphemes: [...data.phoneticConsonantGraphemes],
  modifierGraphemeChars: [...data.modifierGraphemeChars],
  bengaliConsonantLetterGraphemes: [...data.bengaliConsonantLetterGraphemes],
  independentVowelGraphemes: [...data.independentVowelGraphemes],
  dependentVowelGraphemes: [...data.dependentVowelGraphemes],
};

mkdirSync(outDir, { recursive: true });
writeCases("unit.json", "Inputs of the vitest suites (src/__tests__/cases.ts), replayed per step.", unitCases);
writeCases("words.json", "Curated roman words and sentences by category, without and with output as context.", wordCases);
writeCases("random.json", "Seeded random key sequences (mulberry32, seed 20260927) with no, output or pooled context.", randomCases);
writeCases("vowel-attach.json", "shouldAttachKarWhenBufferEmpty(text) results, including conjunct-ending text.", vowelAttach);
writeCases("transpile.json", "transpileRomanDocument(input, { preserveLineBreaks }) results.", transpile);
writeFileSync(join(outDir, "data.json"), `${JSON.stringify(tables, null, 2)}\n`);

console.log(
  `fixtures/engine: unit ${unitCases.length}, words ${wordCases.length}, random ${randomCases.length}, ` +
    `vowel-attach ${vowelAttach.length}, transpile ${transpile.length} cases`,
);
