import { describe, it, expect, beforeEach } from "vitest";
import { BengaliIME } from "../bengali-ime";
import {
  hasant,
  phoneticConsonants,
  phoneticKar,
  phoneticVowels,
} from "../bengali-ime-data";
import {
  aspirationSequenceCases,
  capitalConsonantCases,
  digitCases,
  independentVowelCases,
  karOnKoCases,
  lowercaseConsonantCases,
  nasalClusterCases,
} from "./cases";

const applyRomanSequence = (ime: BengaliIME, roman: string) => {
  for (const ch of roman) {
    ime.process(ch);
  }
};

describe("BengaliIME", () => {
  let ime: BengaliIME;

  beforeEach(() => {
    ime = new BengaliIME();
  });

  describe("consonant keys and aspiration", () => {
    it.each(lowercaseConsonantCases)("lowercase %s maps to %s", (key, expected) => {
      expect(ime.process(key)).toEqual([{ type: "insert", text: expected }]);
    });

    it.each(capitalConsonantCases)("capital %s maps to retroflex or alternate consonant", (key, expected) => {
      expect(ime.process(key)).toEqual([{ type: "insert", text: expected }]);
    });

    it("K → aspirated খ", () => {
      expect(ime.process("K")).toEqual([{ type: "insert", text: "খ" }]);
    });

    it("G → aspirated ঘ", () => {
      expect(ime.process("G")).toEqual([{ type: "insert", text: "ঘ" }]);
    });

    it("T stays retroflex ট, not aspirated", () => {
      expect(ime.process("T")).toEqual([{ type: "insert", text: "ট" }]);
    });

    it("P → aspirated ফ", () => {
      expect(ime.process("P")).toEqual([{ type: "insert", text: "ফ" }]);
    });

    it("M → ম when lowercase has no aspiration step", () => {
      expect(ime.process("M")).toEqual([{ type: "insert", text: "ম" }]);
    });

    it.each(aspirationSequenceCases)("%s replaces base with aspirated or sibilant form", (seq, expected) => {
      applyRomanSequence(ime, seq);
      expect(ime.output).toBe(expected);
    });

    it("k then S then h replaces last grapheme with ষ for ক্ষ-style stack", () => {
      ime.process("k");
      ime.process("S");
      expect(ime.process("h")).toEqual([
        { type: "replace", charsBack: 1, text: "ষ" },
      ]);
      expect(ime.output).toBe("ক্ষ");
    });

    it("k then k then h collapses to ক্ষ (kkhiyo)", () => {
      ime.process("k");
      ime.process("k");
      expect(ime.process("h")).toEqual([
        { type: "delete", charsBack: 3 },
        { type: "insert", text: "ক্ষ" },
      ]);
    });
  });

  describe("juktakkhar, nasals, and exceptional clusters", () => {
    it.each(nasalClusterCases)("%s forms nasal or palatal cluster", (seq, expected) => {
      applyRomanSequence(ime, seq);
      expect(ime.output).toBe(expected);
    });

    it("n then capital G stacks as ন্ঘ (not ঙ)", () => {
      applyRomanSequence(ime, "nG");
      expect(ime.output).toBe("ন্ঘ");
    });

    it("k then g then g applies জ্ঞ over the second গ", () => {
      applyRomanSequence(ime, "kgg");
      expect(ime.output).toBe("ক্জ্ঞ");
    });

    it("k then t inserts hasant-t conjunct", () => {
      ime.process("k");
      expect(ime.process("t")).toEqual([{ type: "insert", text: "্ত" }]);
    });

    it("k then t then h aspirates the last consonant to থ", () => {
      ime.process("k");
      ime.process("t");
      expect(ime.process("h")).toEqual([
        { type: "replace", charsBack: 1, text: "থ" },
      ]);
    });

    it("k then y appends ja-phala য", () => {
      ime.process("k");
      expect(ime.process("y")).toEqual([
        { type: "insert", text: "্য" },
      ]);
    });

    it("r r i collapses to independent ঋ", () => {
      applyRomanSequence(ime, "rri");
      expect(ime.output).toBe(phoneticVowels.RASSAW_RI);
    });

    it("k r r i inserts ঋ-kar on the consonant cluster", () => {
      applyRomanSequence(ime, "krri");
      expect(ime.output).toBe(
        `${phoneticConsonants.KONTHYO_KO}${phoneticKar.RASSAW_RI_KAR}`,
      );
    });

    it("r r r i does not use ঋ shortcut; i attaches as kar to the stack", () => {
      applyRomanSequence(ime, "rrri");
      expect(ime.output).toBe(
        `${phoneticConsonants.ONTOSTHO_RO}${hasant}${phoneticConsonants.ONTOSTHO_RO}${hasant}${phoneticConsonants.ONTOSTHO_RO}${phoneticKar.RASSAW_E_KAR}`,
      );
    });

    it("k r r r i keeps normal i-kar on the triple-r cluster", () => {
      applyRomanSequence(ime, "krrri");
      expect(ime.output).toBe(
        `${phoneticConsonants.KONTHYO_KO}${hasant}${phoneticConsonants.ONTOSTHO_RO}${hasant}${phoneticConsonants.ONTOSTHO_RO}${hasant}${phoneticConsonants.ONTOSTHO_RO}${phoneticKar.RASSAW_E_KAR}`,
      );
    });

    it("k r i keeps distinct ক্রি (not ri shortcut)", () => {
      applyRomanSequence(ime, "kri");
      expect(ime.output).toBe("ক্রি");
    });

    it("k then R then h stacks retroflex aspirate ঢ়", () => {
      applyRomanSequence(ime, "kRh");
      expect(ime.output).toBe(`ক${hasant}${phoneticConsonants.DH_E_SHUNNO_RO}`);
    });

    it("t then capital H replaces with khanda ta ৎ", () => {
      ime.process("t");
      expect(ime.process("H")).toEqual([
        { type: "replace", charsBack: 1, text: "ৎ" },
      ]);
    });

    it("khanda ta ৎ does not take a following hasant when stacking consonant", () => {
      ime.process("t");
      ime.process("H");
      ime.process("k");
      expect(ime.output).toBe(`ৎ${phoneticConsonants.KONTHYO_KO}`);
    });
  });

  describe("vowels, kars, oi, ou, and silent o", () => {
    it.each(independentVowelCases)("independent vowel %s", (key, expected) => {
      expect(ime.process(key)).toEqual([{ type: "insert", text: expected }]);
    });

    it("k then a inserts a-kar", () => {
      ime.process("k");
      expect(ime.process("a")).toEqual([{ type: "insert", text: "া" }]);
    });

    it("k then o inserts empty kar and keeps buffer for following vowel", () => {
      ime.process("k");
      expect(ime.process("o")).toEqual([{ type: "insert", text: "" }]);
    });

    it("k then capital O then i becomes oi-kar on the syllable", () => {
      ime.process("k");
      ime.process("O");
      expect(ime.process("i")).toEqual([
        { type: "replace", charsBack: 1, text: phoneticKar.OI_KAR },
      ]);
      expect(ime.output).toBe(`ক${phoneticKar.OI_KAR}`);
    });

    it("k then capital O then u becomes ou-kar on the syllable", () => {
      ime.process("k");
      ime.process("O");
      expect(ime.process("u")).toEqual([
        { type: "replace", charsBack: 1, text: phoneticKar.OU_KAR },
      ]);
      expect(ime.output).toBe(`ক${phoneticKar.OU_KAR}`);
    });

    it("capital O then i yields independent ঐ", () => {
      ime.process("O");
      expect(ime.process("i")).toEqual([
        { type: "replace", charsBack: 1, text: phoneticVowels.OI },
      ]);
    });

    it("capital O then u yields independent ঔ", () => {
      ime.process("O");
      expect(ime.process("u")).toEqual([
        { type: "replace", charsBack: 1, text: phoneticVowels.OU },
      ]);
    });

    it("k then E inserts same e-kar as lowercase e", () => {
      ime.process("k");
      expect(ime.process("E")).toEqual([{ type: "insert", text: "ে" }]);
    });

    it("o then i yields অ then independent ই (not ঐ)", () => {
      ime.process("o");
      expect(ime.process("i")).toEqual([{ type: "insert", text: "ই" }]);
    });

    it("o then k yields অ then ক", () => {
      expect(ime.process("o")).toEqual([{ type: "insert", text: "অ" }]);
      expect(ime.process("k")).toEqual([{ type: "insert", text: "ক" }]);
    });

    it("k then o then i flushes buffer so i is independent ই", () => {
      ime.process("k");
      ime.process("o");
      expect(ime.process("i")).toEqual([{ type: "insert", text: "ই" }]);
    });

    it.each(karOnKoCases)("%s applies expected kar to ক", (seq, expected) => {
      applyRomanSequence(ime, seq);
      expect(ime.output).toBe(expected);
    });
  });

  describe("numbers and Bengali punctuation", () => {
    it.each(digitCases)("digit %s maps to Bengali numeral", (digit, expected) => {
      expect(ime.process(digit)).toEqual([{ type: "insert", text: expected }]);
    });

    it("full stop maps to dari", () => {
      expect(ime.process(".")).toEqual([{ type: "insert", text: "।" }]);
    });

    it("caret maps to chandrabindu", () => {
      expect(ime.process("^")).toEqual([{ type: "insert", text: "ঁ" }]);
    });

    it("colon maps to bisorgo", () => {
      expect(ime.process(":")).toEqual([{ type: "insert", text: "ঃ" }]);
    });
  });

  describe("ho, clusters with হ, and consonant after vowel", () => {
    it("leading h inserts হ when buffer is empty", () => {
      expect(ime.process("h")).toEqual([
        { type: "insert", text: phoneticConsonants.USHMO_HO },
      ]);
    });

    it("a then h yields আহ", () => {
      applyRomanSequence(ime, "ah");
      expect(ime.output).toBe(
        `${phoneticVowels.SWAR_E_A}${phoneticConsonants.USHMO_HO}`,
      );
    });

    it("h then k stacks হ্‌ক", () => {
      applyRomanSequence(ime, "hk");
      expect(ime.output).toBe(
        `${phoneticConsonants.USHMO_HO}${hasant}${phoneticConsonants.KONTHYO_KO}`,
      );
    });

    it("r then h stacks র্‌হ", () => {
      applyRomanSequence(ime, "rh");
      expect(ime.output).toBe(
        `${phoneticConsonants.ONTOSTHO_RO}${hasant}${phoneticConsonants.USHMO_HO}`,
      );
    });
  });

  describe("English mode and word boundaries", () => {
    it("toggleEnglishMode, k → English passthrough", () => {
      ime.toggleEnglishMode();
      expect(ime.process("k")).toEqual([{ type: "insert", text: "k" }]);
    });

    it("toggleEnglishMode flips isEnglishMode", () => {
      expect(ime.isEnglishMode).toBe(false);
      ime.toggleEnglishMode();
      expect(ime.isEnglishMode).toBe(true);
      ime.toggleEnglishMode();
      expect(ime.isEnglishMode).toBe(false);
    });

    it("t then space flushes syllable and inserts space", () => {
      ime.process("t");
      expect(ime.process(" ")).toEqual([{ type: "insert", text: " " }]);
    });

    it("English mode plus space stays in English mode", () => {
      ime.toggleEnglishMode();
      ime.process("x");
      ime.process(" ");
      expect(ime.isEnglishMode).toBe(true);
    });

    it("Enter in Bengali emits splitBlock", () => {
      expect(ime.process("Enter")).toEqual([{ type: "splitBlock" }]);
    });

    it("English mode Enter emits splitBlock and stays in English mode", () => {
      ime.toggleEnglishMode();
      ime.process("x");
      expect(ime.process("Enter")).toEqual([{ type: "splitBlock" }]);
      expect(ime.isEnglishMode).toBe(true);
    });
  });

  describe("document kar, silent o, and backspace", () => {
    it("after wrong matra and backspace, vowel uses kar when textBeforeCaret ends in consonant", () => {
      ime.process("e");
      ime.process("k");
      ime.process("o");
      ime.process("T");
      ime.process("i");
      ime.processBackspace();
      expect(ime.output.endsWith("ট")).toBe(true);
      expect(
        ime.process("a", { textBeforeCaret: ime.output }),
      ).toEqual([{ type: "insert", text: "া" }]);
    });

    it("vowel stays independent when textBeforeCaret ends in independent vowel", () => {
      expect(
        ime.process("a", { textBeforeCaret: "এ" }),
      ).toEqual([{ type: "insert", text: "আ" }]);
    });

    it("m-o-i uses silent o so i is independent with document context", () => {
      ime.process("m");
      ime.process("o");
      expect(
        ime.process("i", { textBeforeCaret: ime.output }),
      ).toEqual([{ type: "insert", text: "ই" }]);
    });

    it("m-o-a uses silent o so next vowel is independent", () => {
      ime.process("m");
      ime.process("o");
      expect(
        ime.process("a", { textBeforeCaret: ime.output }),
      ).toEqual([{ type: "insert", text: "আ" }]);
    });

    it("processBackspace removes one code unit and clears buffer", () => {
      ime.process("k");
      ime.process("a");
      expect(ime.processBackspace()).toEqual([{ type: "delete", charsBack: 1 }]);
      expect(ime.output).toBe("ক");
    });
  });

  describe("hyphen, quotes, and balanced punctuation", () => {
    it("single hyphen inserts ASCII hyphen", () => {
      expect(ime.process("-")).toEqual([{ type: "insert", text: "-" }]);
    });

    it("double hyphen at caret replaces with em dash", () => {
      ime.process("-");
      expect(ime.process("-")).toEqual([
        { type: "replace", charsBack: 1, text: "—" },
      ]);
    });

    it("second hyphen inserts ASCII when textBeforeCaret has no prior hyphen", () => {
      ime.process("-");
      expect(ime.process("-", { textBeforeCaret: "" })).toEqual([
        { type: "insert", text: "-" },
      ]);
    });

    it("comma inserts ASCII comma", () => {
      expect(ime.process(",")).toEqual([{ type: "insert", text: "," }]);
    });

    it("double quote opens with U+201C", () => {
      expect(ime.process('"')).toEqual([{ type: "insert", text: "\u201C" }]);
    });

    it("double quote after opening closes with U+201D", () => {
      ime.process('"');
      expect(ime.process('"')).toEqual([{ type: "insert", text: "\u201D" }]);
    });

    it("double quote after balanced pair opens again", () => {
      ime.process('"');
      ime.process('"');
      expect(ime.process('"')).toEqual([{ type: "insert", text: "\u201C" }]);
    });

    it("double quote uses textBeforeCaret for balance", () => {
      ime.output = "ক";
      expect(
        ime.process('"', { textBeforeCaret: "ক\u201Cব\u201D" }),
      ).toEqual([{ type: "insert", text: "\u201C" }]);
    });

    it("single quote opens with U+2018", () => {
      expect(ime.process("'")).toEqual([{ type: "insert", text: "\u2018" }]);
    });

    it("single quote after opening closes with U+2019", () => {
      ime.process("'");
      expect(ime.process("'")).toEqual([{ type: "insert", text: "\u2019" }]);
    });

    it("single quote after balanced pair opens again", () => {
      ime.process("'");
      ime.process("'");
      expect(ime.process("'")).toEqual([{ type: "insert", text: "\u2018" }]);
    });

    it("single quote uses textBeforeCaret for balance", () => {
      ime.output = "ক";
      expect(
        ime.process("'", { textBeforeCaret: "ক\u2018ব\u2019" }),
      ).toEqual([{ type: "insert", text: "\u2018" }]);
    });

    it("single quote after consonant plus vowel uses apostrophe U+2019", () => {
      ime.process("k");
      ime.process("a");
      expect(ime.process("'")).toEqual([{ type: "insert", text: "\u2019" }]);
    });

    it("single quote after digit uses apostrophe U+2019", () => {
      ime.process("1");
      expect(ime.process("'")).toEqual([{ type: "insert", text: "\u2019" }]);
    });
  });
});
