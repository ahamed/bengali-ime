//! Port of `src/bengali-ime.ts`.
//!
//! `output` and `buffer` are stored as UTF-16 code units so that slicing,
//! `at(-1)` and the back counts in [`Action`] behave exactly like JavaScript
//! strings.

use unicode_general_category::{get_general_category, GeneralCategory};

use crate::data::{
    self, lookup, ASPIRATED_CONSONANT_BY_BASE, CAPITAL_ROMAN_TO_CONSONANT,
    DEFAULT_CONSONANT_BY_ROMAN_KEY, DOUBLE_DASH, ENTER_KEY, HASANT, KHONDO_TO, NUMBER_MAP,
    ROMAN_TO_PHONETIC_VOWELS, SPACE, SPECIAL_CHARACTERS_MAP, SPECIAL_CHARACTER_INPUTS,
    TYPOGRAPHIC_DOUBLE_QUOTE_CLOSE, TYPOGRAPHIC_DOUBLE_QUOTE_OPEN, TYPOGRAPHIC_SINGLE_QUOTE_CLOSE,
    TYPOGRAPHIC_SINGLE_QUOTE_OPEN,
};
use crate::rules;
use crate::vowel_attach::should_attach_kar_when_buffer_empty;

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

fn balanced_typographic_quote(prior: &str, open: &'static str, close: &'static str) -> &'static str {
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
    let mut chars = prior
        .chars()
        .rev()
        .skip_while(|c| matches!(get_general_category(*c), NonspacingMark | SpacingMark | EnclosingMark));
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
    balanced_typographic_quote(prior, TYPOGRAPHIC_SINGLE_QUOTE_OPEN, TYPOGRAPHIC_SINGLE_QUOTE_CLOSE)
}

/// Port of the TypeScript `BengaliIME`. See the crate docs for how parity with
/// the TypeScript engine is enforced.
#[derive(Debug, Default, Clone)]
pub struct Engine {
    pub(crate) buffer: Vec<u16>,
    pub(crate) output: Vec<u16>,
    english_mode: bool,
    actions: Vec<Action>,
    skip_document_kar_for_next_vowel: bool,
}

impl Engine {
    pub fn new() -> Self {
        Self::default()
    }

    /// `processBackspace`: removes one UTF-16 code unit and empties the buffer.
    pub fn process_backspace(&mut self) -> Vec<Action> {
        if self.output.is_empty() {
            return Vec::new();
        }
        self.actions.clear();
        self.pop(1);
        std::mem::take(&mut self.actions)
    }

    /// `process(char, { textBeforeCaret })`.
    pub fn process(&mut self, key: &str, text_before_caret: Option<&str>) -> Vec<Action> {
        self.actions.clear();
        self.process_keystroke(key, text_before_caret);
        std::mem::take(&mut self.actions)
    }

    pub fn toggle_english_mode(&mut self) {
        self.english_mode = !self.english_mode;
    }

    pub fn is_english_mode(&self) -> bool {
        self.english_mode
    }

    /// Assigns `output` directly, like the TypeScript tests and the web
    /// playground do when resyncing with the document. The buffer is kept.
    pub fn set_output(&mut self, output: &str) {
        self.output = utf16(output);
    }

    pub fn output(&self) -> String {
        String::from_utf16_lossy(&self.output)
    }

    pub fn buffer(&self) -> String {
        String::from_utf16_lossy(&self.buffer)
    }

    /// Length of `output` in UTF-16 code units.
    pub fn output_len_utf16(&self) -> usize {
        self.output.len()
    }

    /// Length of `buffer` in UTF-16 code units.
    pub fn buffer_len_utf16(&self) -> usize {
        self.buffer.len()
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
            self.skip_document_kar_for_next_vowel = false;
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

    fn process_vowel(&mut self, key: &str, text_before_caret: Option<&str>) {
        let lower = key.to_lowercase();
        let vowel_direct = lookup(ROMAN_TO_PHONETIC_VOWELS, key);
        let Some(vowel) = vowel_direct.or_else(|| lookup(ROMAN_TO_PHONETIC_VOWELS, &lower)) else {
            return;
        };
        let vowel_key = if vowel_direct.is_some() { key } else { lower.as_str() };

        if rules::rassaw_ri(self, key) || rules::oi(self, key) || rules::ou(self, key) {
            return;
        }

        let had_buffer_before_vowel = !self.buffer.is_empty();
        let honor_silent_o_break = self.skip_document_kar_for_next_vowel && self.buffer.is_empty();
        if honor_silent_o_break {
            self.skip_document_kar_for_next_vowel = false;
        }

        let should_flush_buffer = vowel_key != "O";
        let use_kar_from_document = !honor_silent_o_break
            && self.buffer.is_empty()
            && text_before_caret.is_some_and(should_attach_kar_when_buffer_empty);
        let text = if !self.buffer.is_empty() || use_kar_from_document {
            vowel.kar
        } else {
            vowel.ind
        };

        if should_flush_buffer {
            self.append_and_flush_buffer(text);
            if vowel_key == "o" && had_buffer_before_vowel {
                self.skip_document_kar_for_next_vowel = true;
            }
            return;
        }

        self.append(text, true);
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

        if self.process_special_characters(key, None) {
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
            return;
        };

        let mut has_hasant = last_in_buffer
            .as_deref()
            .is_some_and(|last| self.is_phonetic_consonant(last));
        if last_in_buffer.as_deref() == Some(KHONDO_TO) {
            has_hasant = false;
        }

        if has_hasant {
            self.append(&format!("{HASANT}{consonant}"), true);
        } else {
            self.append(consonant, true);
        }
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
            let prior_hyphen_at_caret = match text_before_caret {
                Some(text) => text.ends_with('-'),
                None => self.output_ends_with_hyphen(),
            };
            if prior_hyphen_at_caret {
                self.actions.push(Action::Replace { chars_back: 1, text: DOUBLE_DASH.to_owned() });
                if self.output_ends_with_hyphen() {
                    self.output.pop();
                    self.output.extend(DOUBLE_DASH.encode_utf16());
                }
                self.flush_buffer();
                return true;
            }
            self.append_and_flush_buffer(data::DASH);
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

    fn process_word_boundary(&mut self, key: &str) {
        if key == ENTER_KEY {
            self.actions.push(Action::SplitBlock);
            self.flush_buffer();
            return;
        }
        self.append_and_flush_buffer(key);
    }

    fn output_ends_with_hyphen(&self) -> bool {
        self.output.last() == Some(&(b'-' as u16))
    }

    pub(crate) fn flush_buffer(&mut self) {
        self.buffer.clear();
    }

    /// `buffer.at(-1)`: the last UTF-16 code unit as a string.
    pub(crate) fn last_in_buffer(&self) -> Option<String> {
        self.buffer.last().map(|unit| String::from_utf16_lossy(&[*unit]))
    }

    /// `replaceLast(next, flushBuffer, count)`.
    pub(crate) fn replace_last(&mut self, next: &str, flush_buffer: bool, count: usize) {
        let next_units = utf16(next);
        self.output = drop_last(&self.output, count);
        self.output.extend_from_slice(&next_units);
        self.actions.push(Action::Replace { chars_back: count, text: next.to_owned() });

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
        self.output = drop_last(&self.output, count);
        self.actions.push(Action::Delete { chars_back: count });
        self.flush_buffer();
    }

    /// `append(text, updateBuffer)`.
    pub(crate) fn append(&mut self, text: &str, update_buffer: bool) {
        let units = utf16(text);
        self.output.extend_from_slice(&units);
        self.actions.push(Action::Insert { text: text.to_owned() });
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

    pub(crate) fn is_phonetic_consonant(&self, s: &str) -> bool {
        data::is_phonetic_consonant(s)
    }

    fn is_number(&self, key: &str) -> bool {
        lookup(NUMBER_MAP, key).is_some()
    }

    fn is_special_character(&self, key: &str) -> bool {
        SPECIAL_CHARACTER_INPUTS.contains(&key)
    }
}
