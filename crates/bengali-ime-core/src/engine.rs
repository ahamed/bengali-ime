//! Port of `src/bengali-ime.ts`.
//!
//! `output` and `buffer` are stored as UTF-16 code units so that slicing,
//! `at(-1)` and the back counts in [`Action`] behave exactly like JavaScript
//! strings. The TypeScript engine splits its output into `committed + recent`
//! for speed; every rule only reads the end of `recent`, which is always a
//! suffix of the output at least 32 units long (or the whole output), so this
//! port reads the end of the full output instead.

use unicode_general_category::{get_general_category, GeneralCategory};

use crate::data::{
    self, is_ascii_or_bengali_digit, is_kar_taking_consonant, lookup, ASPIRATED_CONSONANT_BY_BASE,
    CAPITAL_ROMAN_TO_CONSONANT, CHONDROBINDU, DARI, DEFAULT_CONSONANT_BY_ROMAN_KEY, DOUBLE_DASH,
    ENTER_KEY, FULL_STOP, HASANT, NUMBER_MAP, ROMAN_TO_PHONETIC_VOWELS, SPACE,
    SPECIAL_CHARACTERS_MAP, SPECIAL_CHARACTER_INPUTS, TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE,
    TYPOGRAPHIC_DOUBLE_QUOTE_OPEN, TYPOGRAPHIC_SINGLE_QUOTE_CLOSE, TYPOGRAPHIC_SINGLE_QUOTE_OPEN,
};
use crate::rules;
use crate::vowel_attach::{
    ends_with_consonant_and_chandrabindu_units, ends_with_kar_taking_consonant_units,
};

/// One edit the host applies at the caret, in order. Back counts are UTF-16
/// code units, the same as the TypeScript `IMEAction.charsBack`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    Insert { text: String },
    Replace { chars_back: usize, text: String },
    Delete { chars_back: usize },
    SplitBlock,
}

pub(crate) fn utf16(s: &str) -> Vec<u16> {
    s.encode_utf16().collect()
}

/// JavaScript `s.slice(0, count * -1)`. Note `slice(0, -0)` is empty.
fn drop_last(units: &[u16], count: usize) -> Vec<u16> {
    if count == 0 {
        return Vec::new();
    }
    units[..units.len().saturating_sub(count)].to_vec()
}

/// The last few UTF-16 units of `text`, always cut at a code point boundary.
/// Every "ends with" rule looks at most three units back.
fn tail_units(text: &str) -> Vec<u16> {
    let start = text.char_indices().rev().nth(7).map_or(0, |(i, _)| i);
    utf16(&text[start..])
}

fn balanced_typographic_quote(
    prior: &str,
    open: &'static str,
    close: &'static str,
) -> &'static str {
    let opens = prior.matches(open).count();
    let closes = prior.matches(close).count();
    if opens > closes {
        close
    } else {
        open
    }
}

/// `/(\p{L}|\p{N})(?:\p{M})*$/u`
fn prior_ends_with_word_char_for_apostrophe(prior: &str) -> bool {
    use GeneralCategory::*;
    let mut chars = prior.chars().rev().skip_while(|c| {
        matches!(
            get_general_category(*c),
            NonspacingMark | SpacingMark | EnclosingMark
        )
    });
    chars.next().is_some_and(|c| {
        matches!(
            get_general_category(c),
            UppercaseLetter
                | LowercaseLetter
                | TitlecaseLetter
                | ModifierLetter
                | OtherLetter
                | DecimalNumber
                | LetterNumber
                | OtherNumber
        )
    })
}

fn single_quote_from_prior(prior: &str) -> &'static str {
    if prior_ends_with_word_char_for_apostrophe(prior) {
        return TYPOGRAPHIC_SINGLE_QUOTE_CLOSE;
    }
    balanced_typographic_quote(
        prior,
        TYPOGRAPHIC_SINGLE_QUOTE_OPEN,
        TYPOGRAPHIC_SINGLE_QUOTE_CLOSE,
    )
}

/// Output options. `Config::default()` reproduces the TypeScript engine
/// exactly; the toggles are Rust-only (the macOS input menu).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Config {
    /// `1` → `১`. Off: digits stay ASCII.
    pub bengali_digits: bool,
    /// `.` → `।` (with the decimal point and ellipsis rules). Off: `.` stays `.`.
    pub dari_for_period: bool,
    /// `"` and `'` become typographic quotes. Off: they stay ASCII.
    pub smart_quotes: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bengali_digits: true,
            dari_for_period: true,
            smart_quotes: true,
        }
    }
}

/// Undo record for one keystroke: the state to restore when it is backspaced.
#[derive(Debug, Clone)]
struct UndoEntry {
    keep_length: usize,
    removed_tail: Vec<u16>,
    buffer: Vec<u16>,
    skip_document_kar_for_next_vowel: bool,
}

/// At least this many keystrokes can always be undone.
const MAX_UNDO_ENTRIES: usize = 1024;

/// A keystroke never rewrites more than a few units of existing output, so
/// only this much of it is saved for undo.
const UNDO_SNAPSHOT_UNITS: usize = 64;

/// Port of the TypeScript `BengaliIME`. See the crate docs for how parity with
/// the TypeScript engine is enforced.
#[derive(Debug, Default, Clone)]
pub struct Engine {
    pub(crate) buffer: Vec<u16>,
    pub(crate) output: Vec<u16>,
    english_mode: bool,
    config: Config,
    actions: Vec<Action>,
    skip_document_kar_for_next_vowel: bool,
    /// One entry per keystroke, so Backspace can restore the exact prior state.
    undo_stack: Vec<UndoEntry>,
    /// Set when the host assigns `output`.
    output_assigned: bool,
    /// Lowest output index modified by the current keystroke.
    touched_from: usize,
}

impl Engine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_config(config: Config) -> Self {
        Self {
            config,
            ..Self::default()
        }
    }

    pub fn config(&self) -> Config {
        self.config
    }

    /// Changes the output options; applies from the next key.
    pub fn set_config(&mut self, config: Config) {
        self.config = config;
    }

    /// `processBackspace`: undoes the last keystroke, so output, buffer and
    /// flags are exactly what they were before it. With no undo history (for
    /// example after [`Engine::set_output`]) it deletes one code point, plus a
    /// hasant it would leave dangling.
    pub fn process_backspace(&mut self) -> Vec<Action> {
        self.actions.clear();
        self.drop_undo_history_if_resynced();

        if let Some(entry) = self.undo_stack.pop() {
            self.restore(entry);
        } else {
            self.delete_last_code_point();
        }

        self.track_state();
        std::mem::take(&mut self.actions)
    }

    /// `process(char, { textBeforeCaret })`.
    pub fn process(&mut self, key: &str, text_before_caret: Option<&str>) -> Vec<Action> {
        self.actions.clear();
        self.drop_undo_history_if_resynced();

        let length_before = self.output.len();
        let snapshot_start = length_before.saturating_sub(UNDO_SNAPSHOT_UNITS);
        let snapshot = self.output[snapshot_start..].to_vec();
        let buffer_before = self.buffer.clone();
        let skip_before = self.skip_document_kar_for_next_vowel;
        self.touched_from = length_before;

        self.process_keystroke(key, text_before_caret);

        if !self.actions.is_empty() {
            if self.touched_from >= snapshot_start {
                self.undo_stack.push(UndoEntry {
                    keep_length: self.touched_from,
                    removed_tail: snapshot[self.touched_from - snapshot_start..].to_vec(),
                    buffer: buffer_before,
                    skip_document_kar_for_next_vowel: skip_before,
                });
                if self.undo_stack.len() > MAX_UNDO_ENTRIES * 2 {
                    self.undo_stack.drain(..MAX_UNDO_ENTRIES);
                }
            } else {
                // Unreachable with the current rules; losing undo beats restoring wrong text.
                debug_assert!(false, "keystroke rewrote more than the undo snapshot");
                self.undo_stack.clear();
            }
        }

        self.track_state();
        std::mem::take(&mut self.actions)
    }

    /// Flips English mode and ends the current Bangla cluster.
    pub fn toggle_english_mode(&mut self) {
        self.english_mode = !self.english_mode;
        self.flush_buffer();
        self.skip_document_kar_for_next_vowel = false;
        self.track_state();
    }

    pub fn is_english_mode(&self) -> bool {
        self.english_mode
    }

    /// Assigns `output` directly, like a host resync in the TypeScript engine.
    /// The buffer is kept and the undo history is cleared.
    pub fn set_output(&mut self, output: &str) {
        self.output = utf16(output);
        self.output_assigned = true;
    }

    pub fn output(&self) -> String {
        String::from_utf16_lossy(&self.output)
    }

    pub fn buffer(&self) -> String {
        String::from_utf16_lossy(&self.buffer)
    }

    /// Ends the current cluster, as toggling English mode does: the next key
    /// cannot rewrite what came before.
    pub fn end_cluster(&mut self) {
        self.flush_buffer();
        self.skip_document_kar_for_next_vowel = false;
        self.track_state();
    }

    /// Removes the last `count` UTF-16 units of the output and ends the
    /// cluster. The undo history is dropped, since it no longer matches.
    pub(crate) fn delete_tail(&mut self, count: usize) {
        self.pop(count);
        self.actions.clear();
        self.undo_stack.clear();
        self.track_state();
    }

    /// Length of `output` in UTF-16 code units.
    pub fn output_len_utf16(&self) -> usize {
        self.output.len()
    }

    /// Length of `buffer` in UTF-16 code units.
    pub fn buffer_len_utf16(&self) -> usize {
        self.buffer.len()
    }

    fn touch(&mut self, index: isize) {
        self.touched_from = self.touched_from.min(index.max(0) as usize);
    }

    fn track_state(&mut self) {
        self.output_assigned = false;
    }

    fn drop_undo_history_if_resynced(&mut self) {
        if self.output_assigned {
            self.undo_stack.clear();
        }
    }

    /// `spliceTail`: replaces the last `count` units of the output with `text`.
    /// Keeps JavaScript's `slice(0, negative)` behaviour when `count` exceeds
    /// the output length (only possible after a resync shortened the output).
    fn splice_tail(&mut self, count: usize, text: &[u16]) {
        let len = self.output.len();
        self.touch(len as isize - count as isize);
        let keep = if count <= len {
            len - count
        } else {
            (2 * len).saturating_sub(count)
        };
        self.output.truncate(keep);
        self.output.extend_from_slice(text);
    }

    fn restore(&mut self, entry: UndoEntry) {
        let chars_back = self.output.len() - entry.keep_length;
        let tail = String::from_utf16_lossy(&entry.removed_tail);
        if chars_back > 0 && !entry.removed_tail.is_empty() {
            self.actions.push(Action::Replace {
                chars_back,
                text: tail,
            });
        } else if chars_back > 0 {
            self.actions.push(Action::Delete { chars_back });
        } else if !entry.removed_tail.is_empty() {
            self.actions.push(Action::Insert { text: tail });
        }

        self.splice_tail(chars_back, &entry.removed_tail);
        self.buffer = entry.buffer;
        self.skip_document_kar_for_next_vowel = entry.skip_document_kar_for_next_vowel;
    }

    /// Deletes one code point, plus a hasant it would leave dangling (ক্ত → ক).
    fn delete_last_code_point(&mut self) {
        let len = self.output.len();
        if len == 0 {
            return;
        }
        let low = self.output[len - 1];
        let mut count = if len >= 2 && (0xDC00..=0xDFFF).contains(&low) {
            2
        } else {
            1
        };
        let hasant = utf16(HASANT);
        if self.output[..len - count].ends_with(&hasant) {
            count += hasant.len();
        }
        self.pop(count);
    }

    fn process_keystroke(&mut self, key: &str, text_before_caret: Option<&str>) {
        if self.english_mode {
            self.process_english_keystroke(key);
            return;
        }

        if key == SPACE || key == ENTER_KEY {
            self.skip_document_kar_for_next_vowel = false;
            self.process_word_boundary(key);
            return;
        }

        if self.is_number(key) {
            self.skip_document_kar_for_next_vowel = false;
            self.process_number(key);
            return;
        }

        if self.is_special_character(key) {
            // Chandrabindu sits on the syllable, so a silent `o` before it still counts.
            if key != "^" {
                self.skip_document_kar_for_next_vowel = false;
            }
            self.process_special_characters(key, text_before_caret);
            return;
        }

        if self.is_vowel(key) {
            self.process_vowel(key, text_before_caret);
            return;
        }

        self.skip_document_kar_for_next_vowel = false;
        self.process_consonant(key);
    }

    fn process_number(&mut self, key: &str) {
        if !self.config.bengali_digits {
            self.append_and_flush_buffer(key);
            return;
        }
        if let Some(digit) = lookup(NUMBER_MAP, key) {
            self.append_and_flush_buffer(digit);
        }
    }

    fn process_english_keystroke(&mut self, key: &str) {
        if key == SPACE {
            self.append_and_flush_buffer(SPACE);
            return;
        }
        if key == ENTER_KEY {
            self.actions.push(Action::SplitBlock);
            self.flush_buffer();
            return;
        }
        self.append_and_flush_buffer(key);
    }

    /// `textBeforeCaret ?? this.recent`, reduced to the units the rules read.
    fn prior_tail(&self, text_before_caret: Option<&str>) -> Vec<u16> {
        match text_before_caret {
            Some(text) => tail_units(text),
            None => self.output[self.output.len().saturating_sub(16)..].to_vec(),
        }
    }

    fn process_vowel(&mut self, key: &str, text_before_caret: Option<&str>) {
        let lower = key.to_lowercase();
        let vowel_direct = lookup(ROMAN_TO_PHONETIC_VOWELS, key);
        let Some(vowel) = vowel_direct.or_else(|| lookup(ROMAN_TO_PHONETIC_VOWELS, &lower)) else {
            return;
        };
        let vowel_key = if vowel_direct.is_some() {
            key
        } else {
            lower.as_str()
        };

        if rules::rassaw_ri(self, key) || rules::oi(self, key) || rules::ou(self, key) {
            return;
        }

        // A kar only ever attaches to a consonant directly before the caret; after
        // anything else the vowel is independent. `o` after a consonant is the
        // silent inherent vowel, so the next vowel starts a new syllable.
        let prior = self.prior_tail(text_before_caret);
        let after_silent_o = self.skip_document_kar_for_next_vowel;
        self.skip_document_kar_for_next_vowel = false;

        // `O` keeps the buffer so a following `i`/`u` can form ঐ/ঔ.
        let keep_buffer = vowel_key == "O";

        if !after_silent_o && ends_with_kar_taking_consonant_units(&prior) {
            if keep_buffer {
                self.append(vowel.kar, true);
            } else {
                self.append_and_flush_buffer(vowel.kar);
            }
            self.skip_document_kar_for_next_vowel = vowel_key == "o";
            return;
        }

        // Chandrabindu typed before the vowel (`k^a`): the kar goes before ঁ.
        if !after_silent_o && ends_with_consonant_and_chandrabindu_units(&prior) {
            self.replace_last(&format!("{}{CHONDROBINDU}", vowel.kar), !keep_buffer, 1);
            self.skip_document_kar_for_next_vowel = vowel_key == "o";
            return;
        }

        if keep_buffer {
            self.append(vowel.ind, true);
        } else {
            self.append_and_flush_buffer(vowel.ind);
        }
    }

    fn process_consonant(&mut self, key: &str) {
        let last_in_buffer = self.last_in_buffer();

        if rules::kkhiyo(self, key)
            || rules::ho(self, key)
            || rules::khanda_to(self, key)
            || rules::ja_fala(self, key)
            || rules::aspirated_consonant(self, key)
        {
            return;
        }

        if self.process_nasal_connectors(key) {
            return;
        }

        let lower = key.to_lowercase();
        let direct = lookup(DEFAULT_CONSONANT_BY_ROMAN_KEY, key)
            .or_else(|| lookup(CAPITAL_ROMAN_TO_CONSONANT, key));

        let consonant = if direct.is_some() {
            direct
        } else if key != lower {
            lookup(DEFAULT_CONSONANT_BY_ROMAN_KEY, &lower)
                .or_else(|| lookup(CAPITAL_ROMAN_TO_CONSONANT, &lower))
                .map(|base| lookup(ASPIRATED_CONSONANT_BY_BASE, base).unwrap_or(base))
        } else {
            None
        };

        let Some(consonant) = consonant else {
            self.process_unmapped_key(key);
            return;
        };

        let has_hasant = last_in_buffer
            .as_deref()
            .is_some_and(is_kar_taking_consonant);
        if has_hasant {
            self.append(&format!("{HASANT}{consonant}"), true);
        } else {
            self.append(consonant, true);
        }
    }

    /// Any other single code point is written as-is and ends the cluster.
    fn process_unmapped_key(&mut self, key: &str) {
        if key.chars().count() != 1 {
            return;
        }
        self.append_and_flush_buffer(key);
    }

    fn process_nasal_connectors(&mut self, key: &str) -> bool {
        rules::nyo_plus_cha(self, key)
            || rules::onushwar(self, key)
            || rules::ungo(self, key)
            || rules::jo_plus_nyo(self, key)
            || rules::nyo(self, key)
            || rules::nyo_plus_borgiyo_jo(self, key)
    }

    fn process_special_characters(&mut self, key: &str, text_before_caret: Option<&str>) -> bool {
        if key == data::DASH {
            let prior = self.prior_tail(text_before_caret);
            if prior.ends_with(&utf16(data::DASH)) {
                self.actions.push(Action::Replace {
                    chars_back: 1,
                    text: DOUBLE_DASH.to_owned(),
                });
                if self.output.ends_with(&utf16(data::DASH)) {
                    self.splice_tail(1, &utf16(DOUBLE_DASH));
                }
                self.flush_buffer();
                return true;
            }
            self.append_and_flush_buffer(data::DASH);
            return true;
        }

        if key == FULL_STOP {
            let prior = self.prior_tail(text_before_caret);
            self.process_full_stop(&prior);
            return true;
        }

        if key == "^" {
            // Kept in the buffer so a following vowel can slot its kar before ঁ,
            // and O + ^ + i can still become ৈঁ.
            self.append(CHONDROBINDU, true);
            return true;
        }

        if !self.config.smart_quotes && (key == "\"" || key == "'") {
            self.append_and_flush_buffer(key);
            return true;
        }

        if key == "\"" {
            let prior = text_before_caret.map_or_else(|| self.output(), str::to_owned);
            let quote = balanced_typographic_quote(
                &prior,
                TYPOGRAPHIC_DOUBLE_QUOTE_OPEN,
                TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE,
            );
            self.append_and_flush_buffer(quote);
            return true;
        }

        if key == "'" {
            let prior = text_before_caret.map_or_else(|| self.output(), str::to_owned);
            self.append_and_flush_buffer(single_quote_from_prior(&prior));
            return true;
        }

        let Some(character) = lookup(SPECIAL_CHARACTERS_MAP, key) else {
            return false;
        };
        self.append_and_flush_buffer(character);
        true
    }

    /// `.` after a digit stays a decimal point, `.` after `।` turns it into `..`
    /// (so `...` is an ellipsis), and `.` after `.` stays `.`; otherwise `।`.
    fn process_full_stop(&mut self, prior: &[u16]) {
        if !self.config.dari_for_period {
            self.append_and_flush_buffer(FULL_STOP);
            return;
        }
        let ends_with_digit = prior
            .last()
            .is_some_and(|unit| is_ascii_or_bengali_digit(&String::from_utf16_lossy(&[*unit])));
        if ends_with_digit || prior.ends_with(&utf16(FULL_STOP)) {
            self.append_and_flush_buffer(FULL_STOP);
            return;
        }

        let dari = utf16(DARI);
        if prior.ends_with(&dari) {
            let dots = format!("{FULL_STOP}{FULL_STOP}");
            self.actions.push(Action::Replace {
                chars_back: dari.len(),
                text: dots.clone(),
            });
            if self.output.ends_with(&dari) {
                self.splice_tail(dari.len(), &utf16(&dots));
            }
            self.flush_buffer();
            return;
        }

        self.append_and_flush_buffer(DARI);
    }

    fn process_word_boundary(&mut self, key: &str) {
        if key == ENTER_KEY {
            self.actions.push(Action::SplitBlock);
            self.flush_buffer();
            return;
        }
        self.append_and_flush_buffer(key);
    }

    pub(crate) fn flush_buffer(&mut self) {
        self.buffer.clear();
    }

    /// `buffer.at(-1)`: the last UTF-16 code unit as a string.
    pub(crate) fn last_in_buffer(&self) -> Option<String> {
        self.buffer
            .last()
            .map(|unit| String::from_utf16_lossy(&[*unit]))
    }

    pub(crate) fn buffer_ends_with(&self, s: &str) -> bool {
        self.buffer.ends_with(&utf16(s))
    }

    /// `replaceLast(next, flushBuffer, count)`.
    pub(crate) fn replace_last(&mut self, next: &str, flush_buffer: bool, count: usize) {
        let next_units = utf16(next);
        self.splice_tail(count, &next_units);
        self.actions.push(Action::Replace {
            chars_back: count,
            text: next.to_owned(),
        });

        if flush_buffer {
            self.flush_buffer();
        } else {
            self.buffer = drop_last(&self.buffer, count);
            self.buffer.extend_from_slice(&next_units);
        }
    }

    /// `pop(count)`.
    pub(crate) fn pop(&mut self, count: usize) {
        self.skip_document_kar_for_next_vowel = false;
        self.splice_tail(count, &[]);
        self.actions.push(Action::Delete { chars_back: count });
        self.flush_buffer();
    }

    /// `append(text, updateBuffer)`.
    pub(crate) fn append(&mut self, text: &str, update_buffer: bool) {
        let units = utf16(text);
        self.output.extend_from_slice(&units);
        self.actions.push(Action::Insert {
            text: text.to_owned(),
        });
        if update_buffer {
            self.buffer.extend_from_slice(&units);
        }
    }

    /// `appendAndFlushBuffer(text)`.
    pub(crate) fn append_and_flush_buffer(&mut self, text: &str) {
        self.append(text, false);
        self.flush_buffer();
    }

    /// `isVowel`: true for roman vowel keys (and their lowercase forms).
    pub(crate) fn is_vowel(&self, key: &str) -> bool {
        lookup(ROMAN_TO_PHONETIC_VOWELS, key).is_some()
            || lookup(ROMAN_TO_PHONETIC_VOWELS, &key.to_lowercase()).is_some()
    }

    fn is_number(&self, key: &str) -> bool {
        lookup(NUMBER_MAP, key).is_some()
    }

    fn is_special_character(&self, key: &str) -> bool {
        SPECIAL_CHARACTER_INPUTS.contains(&key)
    }
}
