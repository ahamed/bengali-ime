//! Port of `src/vowel-attach-context.ts`: decides whether a vowel typed with an
//! empty buffer attaches as a kar to the text already before the caret.

use unicode_segmentation::UnicodeSegmentation;

use crate::data::{
    is_bengali_consonant_letter, is_modifier, DEPENDENT_VOWEL_GRAPHEMES, HASANT,
    INDEPENDENT_VOWEL_GRAPHEMES,
};

/// JavaScript `\s`: WhiteSpace (TAB, VT, FF, ZWNBSP, Zs) plus LineTerminator
/// (LF, CR, LS, PS). Differs from `char::is_whitespace` on U+0085 and U+FEFF.
fn is_js_whitespace(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n'
            | '\u{000B}'
            | '\u{000C}'
            | '\r'
            | ' '
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

/// `text.replace(/\s{2,}$/, '')`: drops a trailing whitespace run only when it
/// is at least two characters long.
fn trim_trailing_whitespace_run(text: &str) -> &str {
    let run_start = text
        .char_indices()
        .rev()
        .take_while(|(_, c)| is_js_whitespace(*c))
        .last()
        .map(|(i, _)| i);
    match run_start {
        Some(start) if text[start..].chars().count() >= 2 => &text[..start],
        _ => text,
    }
}

/// Last code point of the grapheme, skipping trailing hasants (but never the first).
fn last_significant_char(grapheme: &str) -> Option<char> {
    let chars: Vec<char> = grapheme.chars().collect();
    let hasant = HASANT.chars().next()?;
    let mut i = chars.len();
    while i > 0 {
        i -= 1;
        if chars[i] == hasant && i > 0 {
            continue;
        }
        return Some(chars[i]);
    }
    None
}

/// Port of `shouldAttachKarWhenBufferEmpty`.
pub fn should_attach_kar_when_buffer_empty(text_before_caret: &str) -> bool {
    let trimmed = trim_trailing_whitespace_run(text_before_caret);
    let Some(last_grapheme) = trimmed.graphemes(true).last() else {
        return false;
    };
    if last_grapheme.chars().any(|c| {
        let mut utf8 = [0; 4];
        let c: &str = c.encode_utf8(&mut utf8);
        DEPENDENT_VOWEL_GRAPHEMES.contains(&c)
    }) {
        return false;
    }
    let Some(significant) = last_significant_char(last_grapheme) else {
        return false;
    };
    let significant = significant.to_string();
    if is_modifier(&significant) {
        return false;
    }
    if INDEPENDENT_VOWEL_GRAPHEMES.contains(&last_grapheme) {
        return false;
    }
    is_bengali_consonant_letter(&significant)
}
