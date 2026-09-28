//! Lookup tables: a port of `src/bengali-ime-data.ts`.
//!
//! Every table keeps the TypeScript insertion order, and `tests/parity.rs`
//! compares each one entry by entry with `fixtures/engine/data.json`.
//! The nukta letters are written as escapes (U+09DC, U+09DD, U+09DF) because
//! Unicode normalization would otherwise decompose them.

pub const HASANT: &str = "\u{09CD}";
pub const FULL_STOP: &str = ".";
pub const SPACE: &str = " ";
pub const ENTER_KEY: &str = "Enter";
pub const DARI: &str = "\u{0964}";
pub const DASH: &str = "-";
pub const DOUBLE_DASH: &str = "\u{2014}";
pub const TYPOGRAPHIC_DOUBLE_QUOTE_OPEN: &str = "\u{201C}";
pub const TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE: &str = "\u{201D}";
pub const TYPOGRAPHIC_SINGLE_QUOTE_OPEN: &str = "\u{2018}";
pub const TYPOGRAPHIC_SINGLE_QUOTE_CLOSE: &str = "\u{2019}";

pub const SYMBOLS: &[(&str, &str)] = &[
    ("FULL_STOP", FULL_STOP),
    ("SPACE", SPACE),
    ("ENTER_KEY", ENTER_KEY),
    ("DARI", DARI),
    ("DASH", DASH),
    ("DOUBLE_DASH", DOUBLE_DASH),
    ("CAP", "^"),
    ("COLON", ":"),
    (
        "TYPOGRAPHIC_DOUBLE_QUOTE_OPEN",
        TYPOGRAPHIC_DOUBLE_QUOTE_OPEN,
    ),
    (
        "TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE",
        TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE,
    ),
    (
        "TYPOGRAPHIC_SINGLE_QUOTE_OPEN",
        TYPOGRAPHIC_SINGLE_QUOTE_OPEN,
    ),
    (
        "TYPOGRAPHIC_SINGLE_QUOTE_CLOSE",
        TYPOGRAPHIC_SINGLE_QUOTE_CLOSE,
    ),
];

// phoneticVowels
pub const SWAR_E_O: &str = "\u{0985}"; // অ
pub const SWAR_E_A: &str = "\u{0986}"; // আ
pub const RASSAW_E: &str = "\u{0987}"; // ই
pub const DIRGHA_E: &str = "\u{0988}"; // ঈ
pub const RASSAW_U: &str = "\u{0989}"; // উ
pub const DIRGHA_U: &str = "\u{098A}"; // ঊ
pub const RASSAW_RI: &str = "\u{098B}"; // ঋ
pub const VOWEL_A: &str = "\u{098F}"; // এ
pub const VOWEL_OI: &str = "\u{0990}"; // ঐ
pub const VOWEL_O: &str = "\u{0993}"; // ও
pub const VOWEL_OU: &str = "\u{0994}"; // ঔ

// phoneticKar
pub const A_KAR: &str = "\u{09BE}";
pub const RASSAW_E_KAR: &str = "\u{09BF}";
pub const DIRGHA_E_KAR: &str = "\u{09C0}";
pub const RASSAW_U_KAR: &str = "\u{09C1}";
pub const DIRGHA_U_KAR: &str = "\u{09C2}";
pub const RASSAW_RI_KAR: &str = "\u{09C3}";
pub const E_KAR: &str = "\u{09C7}";
pub const OI_KAR: &str = "\u{09C8}";
pub const O_KAR: &str = "\u{09CB}";
pub const OU_KAR: &str = "\u{09CC}";

// phoneticConsonants
pub const KONTHYO_KO: &str = "\u{0995}"; // ক
pub const KONTHYO_KHO: &str = "\u{0996}"; // খ
pub const KONTHYO_GO: &str = "\u{0997}"; // গ
pub const KONTHYO_GHO: &str = "\u{0998}"; // ঘ
pub const KONTHYO_UNGO: &str = "\u{0999}"; // ঙ
pub const TALOBBO_CHO: &str = "\u{099A}"; // চ
pub const TALOBBO_CHHO: &str = "\u{099B}"; // ছ
pub const BORGIYO_JO: &str = "\u{099C}"; // জ
pub const BORGIYO_JHO: &str = "\u{099D}"; // ঝ
pub const TALOBBO_NYO: &str = "\u{099E}"; // ঞ
pub const MURDHONNO_TO: &str = "\u{099F}"; // ট
pub const MURDHONNO_THO: &str = "\u{09A0}"; // ঠ
pub const MURDHONNO_DO: &str = "\u{09A1}"; // ড
pub const MURDHONNO_DHO: &str = "\u{09A2}"; // ঢ
pub const MURDHONNO_NO: &str = "\u{09A3}"; // ণ
pub const DONTO_TO: &str = "\u{09A4}"; // ত
pub const DONTO_THO: &str = "\u{09A5}"; // থ
pub const DONTO_DO: &str = "\u{09A6}"; // দ
pub const DONTO_DHO: &str = "\u{09A7}"; // ধ
pub const DONTO_NO: &str = "\u{09A8}"; // ন
pub const OSHTHO_PO: &str = "\u{09AA}"; // প
pub const OSHTHO_PHO: &str = "\u{09AB}"; // ফ
pub const OSHTHO_BO: &str = "\u{09AC}"; // ব
pub const OSHTHO_BHO: &str = "\u{09AD}"; // ভ
pub const OSHTHO_MO: &str = "\u{09AE}"; // ম
pub const ONTOSTHO_JO: &str = "\u{09AF}"; // য
pub const ONTOSTHO_RO: &str = "\u{09B0}"; // র
pub const ONTOSTHO_LO: &str = "\u{09B2}"; // ল
pub const TALOBBO_SHO: &str = "\u{09B6}"; // শ
pub const MURDHONNO_SHO: &str = "\u{09B7}"; // ষ
pub const DONTO_SHO: &str = "\u{09B8}"; // স
pub const USHMO_HO: &str = "\u{09B9}"; // হ
pub const D_E_SHUNNO_RO: &str = "\u{09DC}"; // ড়
pub const DH_E_SHUNNO_RO: &str = "\u{09DD}"; // ঢ়
pub const ONTOSTHO_YO: &str = "\u{09DF}"; // য়
pub const KHONDO_TO: &str = "\u{09CE}"; // ৎ
pub const CHONDROBINDU: &str = "\u{0981}"; // ঁ
pub const ONUSHWAR: &str = "\u{0982}"; // ং
pub const BISHORGO: &str = "\u{0983}"; // ঃ

/// `Object.values(phoneticConsonants)`, in declaration order.
pub const PHONETIC_CONSONANT_GRAPHEMES: &[&str] = &[
    KONTHYO_KO,
    KONTHYO_KHO,
    KONTHYO_GO,
    KONTHYO_GHO,
    KONTHYO_UNGO,
    TALOBBO_CHO,
    TALOBBO_CHHO,
    BORGIYO_JO,
    BORGIYO_JHO,
    TALOBBO_NYO,
    MURDHONNO_TO,
    MURDHONNO_THO,
    MURDHONNO_DO,
    MURDHONNO_DHO,
    MURDHONNO_NO,
    DONTO_TO,
    DONTO_THO,
    DONTO_DO,
    DONTO_DHO,
    DONTO_NO,
    OSHTHO_PO,
    OSHTHO_PHO,
    OSHTHO_BO,
    OSHTHO_BHO,
    OSHTHO_MO,
    ONTOSTHO_JO,
    ONTOSTHO_RO,
    ONTOSTHO_LO,
    TALOBBO_SHO,
    MURDHONNO_SHO,
    DONTO_SHO,
    USHMO_HO,
    D_E_SHUNNO_RO,
    DH_E_SHUNNO_RO,
    ONTOSTHO_YO,
    KHONDO_TO,
    CHONDROBINDU,
    ONUSHWAR,
    BISHORGO,
];

pub const MODIFIER_GRAPHEME_CHARS: &[&str] = &[CHONDROBINDU, ONUSHWAR, BISHORGO];

/// `Object.values(phoneticVowels)`.
pub const INDEPENDENT_VOWEL_GRAPHEMES: &[&str] = &[
    SWAR_E_O, SWAR_E_A, RASSAW_E, DIRGHA_E, RASSAW_U, DIRGHA_U, RASSAW_RI, VOWEL_A, VOWEL_OI,
    VOWEL_O, VOWEL_OU,
];

/// `Object.values(phoneticKar)`.
pub const DEPENDENT_VOWEL_GRAPHEMES: &[&str] = &[
    A_KAR,
    RASSAW_E_KAR,
    DIRGHA_E_KAR,
    RASSAW_U_KAR,
    DIRGHA_U_KAR,
    RASSAW_RI_KAR,
    E_KAR,
    OI_KAR,
    O_KAR,
    OU_KAR,
];

pub const NUMBER_MAP: &[(&str, &str)] = &[
    ("1", "\u{09E7}"),
    ("2", "\u{09E8}"),
    ("3", "\u{09E9}"),
    ("4", "\u{09EA}"),
    ("5", "\u{09EB}"),
    ("6", "\u{09EC}"),
    ("7", "\u{09ED}"),
    ("8", "\u{09EE}"),
    ("9", "\u{09EF}"),
    ("0", "\u{09E6}"),
];

pub const SPECIAL_CHARACTERS_MAP: &[(&str, &str)] = &[
    (".", DARI),
    ("^", CHONDROBINDU),
    (":", BISHORGO),
    (",", ","),
];

pub const SPECIAL_CHARACTER_INPUTS: &[&str] = &[".", "^", ":", ",", "-", "\"", "'"];

/// Independent vowel and its dependent sign (kar) for a roman vowel key.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VowelData {
    pub ind: &'static str,
    pub kar: &'static str,
}

const fn vowel(ind: &'static str, kar: &'static str) -> VowelData {
    VowelData { ind, kar }
}

pub const ROMAN_TO_PHONETIC_VOWELS: &[(&str, VowelData)] = &[
    ("o", vowel(SWAR_E_O, "")),
    ("a", vowel(SWAR_E_A, A_KAR)),
    ("A", vowel(SWAR_E_A, A_KAR)),
    ("i", vowel(RASSAW_E, RASSAW_E_KAR)),
    ("I", vowel(DIRGHA_E, DIRGHA_E_KAR)),
    ("u", vowel(RASSAW_U, RASSAW_U_KAR)),
    ("U", vowel(DIRGHA_U, DIRGHA_U_KAR)),
    ("e", vowel(VOWEL_A, E_KAR)),
    ("E", vowel(VOWEL_A, E_KAR)),
    ("O", vowel(VOWEL_O, O_KAR)),
];

pub const DEFAULT_CONSONANT_BY_ROMAN_KEY: &[(&str, &str)] = &[
    ("q", KONTHYO_KO),
    ("k", KONTHYO_KO),
    ("g", KONTHYO_GO),
    ("c", TALOBBO_CHO),
    ("j", BORGIYO_JO),
    ("t", DONTO_TO),
    ("d", DONTO_DO),
    ("n", DONTO_NO),
    ("p", OSHTHO_PO),
    ("b", OSHTHO_BO),
    ("m", OSHTHO_MO),
    ("r", ONTOSTHO_RO),
    ("l", ONTOSTHO_LO),
    ("s", DONTO_SHO),
    ("z", ONTOSTHO_JO),
    ("y", ONTOSTHO_YO),
    ("v", OSHTHO_BHO),
    ("h", USHMO_HO),
    ("w", OSHTHO_BO),
    ("f", OSHTHO_PHO),
    ("x", "\u{0995}\u{09CD}\u{09B8}"), // ক্স
];

pub const CAPITAL_ROMAN_TO_CONSONANT: &[(&str, &str)] = &[
    ("T", MURDHONNO_TO),
    ("D", MURDHONNO_DO),
    ("N", MURDHONNO_NO),
    ("R", D_E_SHUNNO_RO),
    ("S", TALOBBO_SHO),
];

pub const NYO_CHO: &str = "\u{099E}\u{09CD}\u{099A}"; // ঞ্চ
pub const NYO_CHHO: &str = "\u{099E}\u{09CD}\u{099B}"; // ঞ্ছ

pub const ASPIRATED_CONSONANT_BY_BASE: &[(&str, &str)] = &[
    (KONTHYO_KO, KONTHYO_KHO),
    (KONTHYO_GO, KONTHYO_GHO),
    (TALOBBO_CHO, TALOBBO_CHHO),
    (BORGIYO_JO, BORGIYO_JHO),
    (DONTO_TO, DONTO_THO),
    (MURDHONNO_TO, MURDHONNO_THO),
    (DONTO_DO, DONTO_DHO),
    (MURDHONNO_DO, MURDHONNO_DHO),
    (OSHTHO_PO, OSHTHO_PHO),
    (OSHTHO_BO, OSHTHO_BHO),
    (D_E_SHUNNO_RO, DH_E_SHUNNO_RO),
    (DONTO_SHO, TALOBBO_SHO),
    (TALOBBO_SHO, MURDHONNO_SHO),
    (NYO_CHO, NYO_CHHO),
];

/// `Map.get` over one of the pair tables above.
pub fn lookup<V: Copy>(table: &[(&str, V)], key: &str) -> Option<V> {
    table.iter().find(|(k, _)| *k == key).map(|(_, v)| *v)
}

pub fn is_phonetic_consonant(s: &str) -> bool {
    PHONETIC_CONSONANT_GRAPHEMES.contains(&s)
}

pub fn is_modifier(s: &str) -> bool {
    MODIFIER_GRAPHEME_CHARS.contains(&s)
}

/// `bengaliConsonantLetterGraphemes`: phonetic consonants minus the modifiers.
pub fn is_bengali_consonant_letter(s: &str) -> bool {
    is_phonetic_consonant(s) && !is_modifier(s)
}

/// The `bengaliConsonantLetterGraphemes` set, in insertion order.
pub fn bengali_consonant_letter_graphemes() -> Vec<&'static str> {
    PHONETIC_CONSONANT_GRAPHEMES
        .iter()
        .copied()
        .filter(|s| !is_modifier(s))
        .collect()
}

/// Combining nukta, as in a decomposed ড + ়.
pub const NUKTA: &str = "\u{09BC}";

/// `karTakingConsonantGraphemes`: consonants that can carry a kar or a hasant
/// (every consonant letter except khanda ta ৎ).
pub fn is_kar_taking_consonant(s: &str) -> bool {
    is_bengali_consonant_letter(s) && s != KHONDO_TO
}

/// The `karTakingConsonantGraphemes` set, in insertion order.
pub fn kar_taking_consonant_graphemes() -> Vec<&'static str> {
    bengali_consonant_letter_graphemes()
        .into_iter()
        .filter(|s| *s != KHONDO_TO)
        .collect()
}

/// `numberMap.has(c) || bengaliDigits.has(c)`.
pub fn is_ascii_or_bengali_digit(s: &str) -> bool {
    NUMBER_MAP
        .iter()
        .any(|(ascii, bengali)| *ascii == s || *bengali == s)
}
