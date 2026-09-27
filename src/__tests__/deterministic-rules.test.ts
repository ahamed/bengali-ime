import { describe, it, expect } from "vitest";
import { BengaliIME } from "../bengali-ime";
import { transpileRomanDocument } from "../transpile-roman-document";
import {
  bengaliConsonantLetterGraphemes,
  dependentVowelGraphemes,
  hasant,
  phoneticConsonants,
} from "../bengali-ime-data";
import type { IMEAction } from "../types";

const BACKSPACE = "⌫";
const TOGGLE = "⇄";

const applyActions = (doc: string, actions: IMEAction[]): string => {
  let next = doc;
  for (const action of actions) {
    if (action.type === "insert") next += action.text;
    if (action.type === "replace") next = next.slice(0, next.length - action.charsBack) + action.text;
    if (action.type === "delete") next = next.slice(0, next.length - action.charsBack);
  }
  return next;
};

/**
 * Drives the IME like an editor: every key gets the current document as
 * `textBeforeCaret`, and the returned actions are applied to a shadow document
 * that must always match `ime.output`.
 */
const type = (keys: string | string[], withContext = true): string => {
  const ime = new BengaliIME();
  let doc = "";
  for (const key of typeof keys === "string" ? [...keys] : keys) {
    if (key === TOGGLE) {
      ime.toggleEnglishMode();
      continue;
    }
    const actions =
      key === BACKSPACE
        ? ime.processBackspace()
        : ime.process(key, withContext ? { textBeforeCaret: doc } : undefined);
    doc = applyActions(doc, actions);
    expect(doc).toBe(ime.output);
  }
  return ime.output;
};

const cases = (rows: [string, string][]) => rows;

describe("kar only attaches to a real consonant", () => {
  it.each(
    cases([
      ["Oa", "ওআ"],
      ["OO", "ওও"],
      ["Oe", "ওএ"],
      ["kOa", "কোআ"],
      ["kOO", "কোও"],
      ["tHa", "ৎআ"],
      ["tHi", "ৎই"],
      ["rria", "ঋআ"],
      ["rrii", "ঋই"],
      ["nga", "ংআ"],
      ["k:a", "কঃআ"],
      ["kaa", "কাআ"],
      ["kya", "ক্যা"],
      ["ya", "য়া"],
      ["Ra", "ড়া"],
      ["xa", "ক্সা"],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("document context only counts when directly adjacent", () => {
  it.each(
    cases([
      ["k a", "ক আ"],
      ["k  a", "ক  আ"],
      ["k   i", "ক   ই"],
      ["k-a", "ক-আ"],
    ]),
  )("%j → %j", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });

  it("attaches a kar to a consonant right before the caret", () => {
    const ime = new BengaliIME();
    expect(ime.process("a", { textBeforeCaret: "ক" })).toEqual([
      { type: "insert", text: "া" },
    ]);
  });

  it("does not attach across whitespace", () => {
    const ime = new BengaliIME();
    expect(ime.process("a", { textBeforeCaret: "ক  " })).toEqual([
      { type: "insert", text: "আ" },
    ]);
  });

  it("does not attach to khanda ta", () => {
    const ime = new BengaliIME();
    expect(ime.process("a", { textBeforeCaret: "ৎ" })).toEqual([
      { type: "insert", text: "আ" },
    ]);
  });

  it("treats a decomposed nukta letter (ড + ়) as a consonant", () => {
    const ime = new BengaliIME();
    expect(ime.process("a", { textBeforeCaret: "ড়" })).toEqual([
      { type: "insert", text: "া" },
    ]);
  });
});

describe("no hasant next to ং or ৎ", () => {
  it.each(
    cases([
      ["kng", "কং"],
      ["ktH", "কৎ"],
      ["tHy", "ৎয়"],
      ["tHk", "ৎক"],
      ["tHh", "ৎহ"],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("ঋ rules", () => {
  it.each(
    cases([
      ["rri", "ঋ"],
      ["arri", "আঋ"],
      ["Orri", "ওঋ"],
      ["kOrri", "কোঋ"],
      ["krri", "কৃ"],
      ["krria", "কৃআ"],
      ["rrri", "র্র্রি"],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("kkh → ক্ষ whenever the cluster ends in ক্ক", () => {
  it.each(
    cases([
      ["kkh", "ক্ষ"],
      ["akkh", "আক্ষ"],
      ["kkkh", "ক্ক্ষ"],
      ["lokkhmI", "লক্ষ্মী"],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("English toggle ends the Bangla cluster", () => {
  it("k [EN] x [BN] t → কxত", () => {
    expect(type(["k", TOGGLE, "x", TOGGLE, "t"])).toBe("কxত");
  });

  it("toggling back and forth breaks the cluster", () => {
    expect(type(["k", TOGGLE, TOGGLE, "t"])).toBe("কত");
  });

  it("vowel after an English letter is independent", () => {
    expect(type(["k", TOGGLE, "x", TOGGLE, "a"])).toBe("কxআ");
  });
});

describe("keys without a mapping pass through and end the cluster", () => {
  it.each(
    cases([
      ["k?k", "ক?ক"],
      ["(ki)", "(কি)"],
      ["ki!", "কি!"],
      ["k;t", "ক;ত"],
      ["a@b", "আ@ব"],
      ["k\ta", "ক\tআ"],
      ["k/a", "ক/আ"],
      ["k😀a", "ক😀আ"],
    ]),
  )("%j → %j", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });

  it("ignores multi-character key names it does not know", () => {
    const ime = new BengaliIME();
    expect(ime.process("Shift")).toEqual([]);
    expect(ime.output).toBe("");
  });
});

describe("dot: decimal, ellipsis and dari", () => {
  it.each(
    cases([
      ["k.", "ক।"],
      ["1.5", "১.৫"],
      ["1.", "১."],
      ["..", ".."],
      ["...", "..."],
      ["k...", "ক..."],
      ["k. k", "ক। ক"],
      ["1.5.", "১.৫."],
    ]),
  )("%j → %j", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("chandrabindu in either order", () => {
  it.each(
    cases([
      ["ka^", "কাঁ"],
      ["k^a", "কাঁ"],
      ["k^i", "কিঁ"],
      ["k^O", "কোঁ"],
      ["k^Oi", "কৈঁ"],
      ["kO^i", "কৈঁ"],
      ["k^o", "কঁ"],
      ["ca^d", "চাঁদ"],
      ["c^ad", "চাঁদ"],
      ["a^", "আঁ"],
      ["^a", "ঁআ"],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });
});

describe("backspace undoes the last keystroke", () => {
  it.each(
    cases([
      ["kt⌫a", "কা"],
      ["kh⌫", "ক"],
      ["kh⌫h", "খ"],
      ["kO⌫i", "কি"],
      ["x⌫a", "আ"],
      ["ka⌫t", "ক্ত"],
      ["ng⌫g", "ং"],
      ["ka⌫⌫", ""],
      ["ka ⌫i", "কাই"],
      ["kkh⌫", "ক্ক"],
      ["rri⌫", "র্র"],
      ["k^a⌫", "কঁ"],
      ["ko⌫i", "কি"],
      ["1.⌫.", "১."],
      ["k?⌫k", "ক্ক"],
      ["⌫", ""],
    ]),
  )("%s → %s", (keys, expected) => {
    expect(type(keys)).toBe(expected);
  });

  it("returns no actions on an empty document", () => {
    expect(new BengaliIME().processBackspace()).toEqual([]);
  });

  it("falls back to deleting one code point after an external resync", () => {
    const ime = new BengaliIME();
    ime.process("k");
    ime.output = "ক্ত";
    ime.buffer = "";
    expect(ime.processBackspace()).toEqual([{ type: "delete", charsBack: 2 }]);
    expect(ime.output).toBe("ক");
  });

  it("does not split a surrogate pair in fallback mode", () => {
    const ime = new BengaliIME();
    ime.output = "a😀";
    expect(ime.processBackspace()).toEqual([{ type: "delete", charsBack: 2 }]);
    expect(ime.output).toBe("a");
  });

  it("undoing Enter changes nothing in the IME output", () => {
    const ime = new BengaliIME();
    ime.process("k");
    ime.process("Enter");
    expect(ime.processBackspace()).toEqual([]);
    ime.process("t");
    expect(ime.output).toBe("ক্ত");
  });
});

describe("long documents", () => {
  const longKeys = [..."ami banglay gan gai. kkh rri krri nga k^a O-- 1.5 ".repeat(40)];

  it("streaming matches bulk conversion", () => {
    expect(type(longKeys)).toBe(transpileRomanDocument(longKeys.join("")));
  });

  it("backspacing through the whole document replays every earlier state", () => {
    const ime = new BengaliIME();
    let doc = "";
    const states: string[] = [];
    for (const key of longKeys) {
      states.push(ime.output);
      doc = applyActions(doc, ime.process(key, { textBeforeCaret: doc }));
    }
    for (let i = longKeys.length - 1; i >= 0; i--) {
      doc = applyActions(doc, ime.processBackspace());
      expect(ime.output).toBe(states[i]);
      expect(doc).toBe(ime.output);
    }
  });

  it("keeps working after the host assigns a long output", () => {
    const ime = new BengaliIME();
    ime.output = "ক".repeat(1000) + "ক্ত";
    expect(ime.processBackspace()).toEqual([{ type: "delete", charsBack: 2 }]);
    ime.process("k");
    ime.process("h");
    expect(ime.output).toBe("ক".repeat(1001) + "খ");
    ime.processBackspace();
    expect(ime.output).toBe("ক".repeat(1001) + "ক");
  });
});

// ---------------------------------------------------------------------------
// Randomized properties (fixed seed, so failures are reproducible)
// ---------------------------------------------------------------------------

const ALPHABET = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABDEGHIKNOPRSTU",
  ..."1.^:- ",
];

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomSequences = (count: number, maxLength: number, seed: number) => {
  const rand = mulberry32(seed);
  const out: string[][] = [];
  for (let i = 0; i < count; i++) {
    const length = 1 + Math.floor(rand() * maxLength);
    const seq: string[] = [];
    for (let j = 0; j < length; j++) {
      seq.push(ALPHABET[Math.floor(rand() * ALPHABET.length)]!);
    }
    out.push(seq);
  }
  return out;
};

const NUKTA = "\u09BC";
const KHONDO_TO = phoneticConsonants.KHONDO_TO;
const isConsonant = (ch: string | undefined) =>
  ch !== undefined && ch !== KHONDO_TO && bengaliConsonantLetterGraphemes.has(ch);
const isConsonantOrNukta = (ch: string | undefined) => isConsonant(ch) || ch === NUKTA;

/** Returns a description of the first malformed spot, or null. */
const findMalformed = (text: string): string | null => {
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const prev = chars[i - 1];
    const next = chars[i + 1];
    if (dependentVowelGraphemes.has(ch) && !isConsonantOrNukta(prev)) {
      return `kar ${ch} after ${JSON.stringify(prev)} at ${i}`;
    }
    if (ch === hasant) {
      if (!isConsonantOrNukta(prev)) return `hasant after ${JSON.stringify(prev)} at ${i}`;
      if (!isConsonant(next)) return `hasant before ${JSON.stringify(next)} at ${i}`;
    }
  }
  return null;
};

describe("randomized properties", () => {
  const sequences = randomSequences(4000, 8, 20260927);

  it("never produces a stray kar or dangling hasant", () => {
    const failures: string[] = [];
    for (const seq of sequences) {
      const output = type(seq);
      const problem = findMalformed(output);
      if (problem) failures.push(`${JSON.stringify(seq.join(""))} → ${JSON.stringify(output)}: ${problem}`);
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it("gives the same output with or without textBeforeCaret, and in bulk", () => {
    const failures: string[] = [];
    for (const seq of sequences) {
      const withContext = type(seq, true);
      const withoutContext = type(seq, false);
      const bulk = transpileRomanDocument(seq.join(""));
      if (withContext !== withoutContext || withContext !== bulk) {
        failures.push(`${JSON.stringify(seq.join(""))}: ${withContext} / ${withoutContext} / ${bulk}`);
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it("typing a key then Backspace is the same as never typing it", () => {
    const failures: string[] = [];
    const extras = randomSequences(sequences.length, 1, 7);
    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i]!;
      const extra = extras[i]![0]!;
      const expected = type(seq);
      const actual = type([...seq, extra, BACKSPACE]);
      if (actual !== expected) {
        failures.push(`${JSON.stringify(seq.join("") + extra)}⌫: ${actual} (expected ${expected})`);
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
  });

  it("deleting every key with Backspace empties the document", () => {
    for (const seq of sequences.slice(0, 500)) {
      expect(type([...seq, ...seq.map(() => BACKSPACE)])).toBe("");
    }
  });
});
