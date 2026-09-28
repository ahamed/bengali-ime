//! The Akkhar rules, one function per rule. Each returns `true` when it
//! consumed the key.

use crate::data::{
    ASPIRATED_CONSONANT_BY_BASE, BORGIYO_JO, CHONDROBINDU, DONTO_NO, DONTO_TO, HASANT, KHONDO_TO,
    KONTHYO_GO, KONTHYO_KO, KONTHYO_UNGO, MURDHONNO_NO, MURDHONNO_SHO, O_KAR, OI_KAR, ONTOSTHO_JO,
    ONTOSTHO_RO, ONUSHWAR, OU_KAR, RASSAW_RI, RASSAW_RI_KAR, TALOBBO_CHO, TALOBBO_NYO, USHMO_HO,
    VOWEL_O, VOWEL_OI, VOWEL_OU, is_kar_taking_consonant, lookup,
};
use crate::engine::{Engine, is_vowel, utf16};

/// `rassaw-ri`: র্র + i → ঋ, or ঋ-kar when a consonant is stacked before it.
pub(crate) fn rassaw_ri(ime: &mut Engine, key: &str) -> bool {
    if key != "i" {
        return false;
    }
    let rr_tail = utf16(&format!("{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}"));
    if !ime.buffer.ends_with(&rr_tail) {
        return false;
    }
    let triple_r_tail = utf16(&format!(
        "{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}"
    ));
    if ime.buffer.ends_with(&triple_r_tail) {
        return false;
    }
    // A consonant stacked before র্র takes ঋ-kar (ক্র্র → কৃ); anything else
    // (nothing, or a vowel such as ও) gets the independent ঋ.
    let before = &ime.buffer[..ime.buffer.len() - rr_tail.len()];
    if before.ends_with(&utf16(HASANT)) {
        ime.pop(rr_tail.len() + 1);
        ime.append_and_flush_buffer(RASSAW_RI_KAR);
        return true;
    }
    ime.pop(rr_tail.len());
    ime.append_and_flush_buffer(RASSAW_RI);
    true
}

/// `oi`: ও/ো (optionally + ঁ) + i → ঐ/ৈ.
pub(crate) fn oi(ime: &mut Engine, key: &str) -> bool {
    key == "i" && replace_o_diphthong(ime, VOWEL_OI, OI_KAR)
}

/// `replaceODiphthong`: turns a trailing ও / ো (optionally followed by ঁ) into
/// the given diphthong, keeping the chandrabindu after it: কোঁ + i → কৈঁ.
fn replace_o_diphthong(ime: &mut Engine, independent: &str, kar: &str) -> bool {
    let pairs = [
        (VOWEL_O.to_owned(), independent.to_owned()),
        (O_KAR.to_owned(), kar.to_owned()),
        (
            format!("{VOWEL_O}{CHONDROBINDU}"),
            format!("{independent}{CHONDROBINDU}"),
        ),
        (
            format!("{O_KAR}{CHONDROBINDU}"),
            format!("{kar}{CHONDROBINDU}"),
        ),
    ];
    for (from, to) in pairs {
        if ime.buffer_ends_with(&from) {
            ime.replace_last(&to, true, from.encode_utf16().count());
            return true;
        }
    }
    false
}

/// `ou`: ও/ো (optionally + ঁ) + u → ঔ/ৌ.
pub(crate) fn ou(ime: &mut Engine, key: &str) -> bool {
    key == "u" && replace_o_diphthong(ime, VOWEL_OU, OU_KAR)
}

/// `kkhiyo`: a cluster ending in ক্ক + h → ক্ষ.
pub(crate) fn kkhiyo(ime: &mut Engine, key: &str) -> bool {
    if key != "h" {
        return false;
    }
    let kk = utf16(&format!("{KONTHYO_KO}{HASANT}{KONTHYO_KO}"));
    if !ime.buffer.ends_with(&kk) {
        return false;
    }
    ime.pop(kk.len());
    ime.append(&format!("{KONTHYO_KO}{HASANT}{MURDHONNO_SHO}"), true);
    true
}

/// `ho`: h starts হ on an empty buffer (or after a roman vowel key).
pub(crate) fn ho(ime: &mut Engine, key: &str) -> bool {
    if key != "h" {
        return false;
    }
    let last = ime.last_in_buffer();
    if ime.buffer.is_empty() || last.as_deref().is_some_and(is_vowel) {
        ime.append(USHMO_HO, true);
        return true;
    }
    false
}

/// `khanda-to`: ত + H → ৎ (ৎ never takes a hasant, so ক্ত + H → কৎ).
pub(crate) fn khanda_to(ime: &mut Engine, key: &str) -> bool {
    if key != "H" || !ime.buffer_ends_with(DONTO_TO) {
        return false;
    }
    let count = if ime.buffer_ends_with(&format!("{HASANT}{DONTO_TO}")) {
        2
    } else {
        1
    };
    ime.replace_last(KHONDO_TO, false, count);
    true
}

/// `ja-fala`: kar-taking consonant + y → ্য.
pub(crate) fn ja_fala(ime: &mut Engine, key: &str) -> bool {
    if key != "y" {
        return false;
    }
    if ime
        .last_in_buffer()
        .as_deref()
        .is_some_and(is_kar_taking_consonant)
    {
        ime.append(&format!("{HASANT}{ONTOSTHO_JO}"), true);
        return true;
    }
    false
}

/// `aspiration`: consonant + h → aspirated form.
pub(crate) fn aspirated_consonant(ime: &mut Engine, key: &str) -> bool {
    if key != "h" {
        return false;
    }
    let aspirated = ime
        .last_in_buffer()
        .and_then(|last| lookup(ASPIRATED_CONSONANT_BY_BASE, &last));
    if let Some(aspirated) = aspirated {
        ime.replace_last(aspirated, false, 1);
        return true;
    }
    false
}

/// `nyo-plus-cha`: ন + c → ঞ্চ.
pub(crate) fn nyo_plus_cha(ime: &mut Engine, key: &str) -> bool {
    if key == "c" && ime.last_in_buffer().as_deref() == Some(DONTO_NO) {
        ime.replace_last(&format!("{TALOBBO_NYO}{HASANT}{TALOBBO_CHO}"), false, 1);
        return true;
    }
    false
}

/// `onushwar`: ন + g → ং (ং never takes a hasant, so ক্ন + g → কং).
pub(crate) fn onushwar(ime: &mut Engine, key: &str) -> bool {
    if key != "g" || !ime.buffer_ends_with(DONTO_NO) {
        return false;
    }
    let count = if ime.buffer_ends_with(&format!("{HASANT}{DONTO_NO}")) {
        2
    } else {
        1
    };
    ime.replace_last(ONUSHWAR, true, count);
    true
}

/// `ungo`: ণ + g → ঙ.
pub(crate) fn ungo(ime: &mut Engine, key: &str) -> bool {
    if key == "g" && ime.last_in_buffer().as_deref() == Some(MURDHONNO_NO) {
        ime.replace_last(KONTHYO_UNGO, false, 1);
        return true;
    }
    false
}

/// `jo-plus-nyo`: গ + g → জ্ঞ.
pub(crate) fn jo_plus_nyo(ime: &mut Engine, key: &str) -> bool {
    if key == "g" && ime.last_in_buffer().as_deref() == Some(KONTHYO_GO) {
        ime.replace_last(&format!("{BORGIYO_JO}{HASANT}{TALOBBO_NYO}"), false, 1);
        return true;
    }
    false
}

/// `nyo`: ণ + G → ঞ.
pub(crate) fn nyo(ime: &mut Engine, key: &str) -> bool {
    if key == "G" && ime.last_in_buffer().as_deref() == Some(MURDHONNO_NO) {
        ime.replace_last(TALOBBO_NYO, false, 1);
        return true;
    }
    false
}

/// `nyo-plus-borgiyo-jo`: ন + j → ঞ্জ.
pub(crate) fn nyo_plus_borgiyo_jo(ime: &mut Engine, key: &str) -> bool {
    if key == "j" && ime.last_in_buffer().as_deref() == Some(DONTO_NO) {
        ime.replace_last(&format!("{TALOBBO_NYO}{HASANT}{BORGIYO_JO}"), false, 1);
        return true;
    }
    false
}
