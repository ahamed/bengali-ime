//! What the text right before the caret
//! allows a vowel to do. Only the last code point or two are inspected.

use crate::data::{is_kar_taking_consonant, CHONDROBINDU, NUKTA};

/// The last `count` code points of UTF-16 `units` (a trailing surrogate pair
/// counts as one), oldest first. Mirrors `lastCodePoints`.
fn last_code_points(units: &[u16], count: usize) -> Vec<&[u16]> {
    let mut out = Vec::new();
    let mut end = units.len();
    while out.len() < count && end > 0 {
        let low = units[end - 1];
        let start = if end >= 2 && (0xDC00..=0xDFFF).contains(&low) {
            end - 2
        } else {
            end - 1
        };
        out.insert(0, &units[start..end]);
        end = start;
    }
    out
}

fn is(units: &[u16], s: &str) -> bool {
    units.iter().copied().eq(s.encode_utf16())
}

pub(crate) fn ends_with_kar_taking_consonant_units(units: &[u16]) -> bool {
    let mut points = last_code_points(units, 2);
    let mut last = points.pop();
    if last.is_some_and(|p| is(p, NUKTA)) {
        last = points.pop();
    }
    last.is_some_and(|p| is_kar_taking_consonant(&String::from_utf16_lossy(p)))
}

pub(crate) fn ends_with_consonant_and_chandrabindu_units(units: &[u16]) -> bool {
    let chandrabindu: Vec<u16> = CHONDROBINDU.encode_utf16().collect();
    units.ends_with(&chandrabindu)
        && ends_with_kar_taking_consonant_units(&units[..units.len() - chandrabindu.len()])
}

/// `endsWithKarTakingConsonant`: true when `text` ends in a consonant that can
/// carry a kar or a hasant (a decomposed nukta letter counts).
pub fn ends_with_kar_taking_consonant(text: &str) -> bool {
    ends_with_kar_taking_consonant_units(&text.encode_utf16().collect::<Vec<_>>())
}

/// `endsWithConsonantAndChandrabindu`: true when `text` ends in consonant + ঁ.
pub fn ends_with_consonant_and_chandrabindu(text: &str) -> bool {
    ends_with_consonant_and_chandrabindu_units(&text.encode_utf16().collect::<Vec<_>>())
}
