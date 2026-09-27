//! The Akkhar rules from `src/supports/*.ts`, one function per class. Each
//! returns `true` when it consumed the key (the TypeScript `proceed`).

use crate::data::{
    lookup, ASPIRATED_CONSONANT_BY_BASE, BORGIYO_JO, DONTO_NO, DONTO_TO, HASANT, KHONDO_TO,
    KONTHYO_GO, KONTHYO_KO, KONTHYO_UNGO, MURDHONNO_NO, MURDHONNO_SHO, OI_KAR, ONTOSTHO_JO,
    ONTOSTHO_RO, ONUSHWAR, OU_KAR, O_KAR, RASSAW_RI, RASSAW_RI_KAR, TALOBBO_CHO, TALOBBO_NYO,
    USHMO_HO, VOWEL_O, VOWEL_OI, VOWEL_OU,
};
use crate::engine::{utf16, Engine};

/// `rassaw-ri.ts`: `rri` → ঋ, or ঋ-kar after a consonant.
pub(crate) fn rassaw_ri(ime: &mut Engine, key: &str) -> bool {
    if key != "i" {
        return false;
    }
    let length = ime.buffer.len();
    if length < 3 {
        return false;
    }
    let rr_tail = utf16(&format!("{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}"));
    if !ime.buffer.ends_with(&rr_tail) {
        return false;
    }
    let triple_r_tail = utf16(&format!("{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}{HASANT}{ONTOSTHO_RO}"));
    if ime.buffer.ends_with(&triple_r_tail) {
        return false;
    }
    if length == 3 {
        ime.pop(3);
        ime.append(RASSAW_RI, true);
        return true;
    }
    ime.pop(4);
    ime.append_and_flush_buffer(RASSAW_RI_KAR);
    true
}

/// `oi.ts`: ও + i → ঐ, ো + i → ৈ.
pub(crate) fn oi(ime: &mut Engine, key: &str) -> bool {
    if key != "i" {
        return false;
    }
    match ime.last_in_buffer().as_deref() {
        Some(VOWEL_O) => {
            ime.replace_last(VOWEL_OI, true, 1);
            true
        }
        Some(O_KAR) => {
            ime.replace_last(OI_KAR, true, 1);
            true
        }
        _ => false,
    }
}

/// `ou.ts`: ও + u → ঔ, ো + u → ৌ.
pub(crate) fn ou(ime: &mut Engine, key: &str) -> bool {
    if key != "u" {
        return false;
    }
    match ime.last_in_buffer().as_deref() {
        Some(VOWEL_O) => {
            ime.replace_last(VOWEL_OU, true, 1);
            true
        }
        Some(O_KAR) => {
            ime.replace_last(OU_KAR, true, 1);
            true
        }
        _ => false,
    }
}

/// `kkhiyo.ts`: ক্ক + h → ক্ষ.
pub(crate) fn kkhiyo(ime: &mut Engine, key: &str) -> bool {
    if key != "h" || ime.buffer.len() < 3 {
        return false;
    }
    if ime.buffer == utf16(&format!("{KONTHYO_KO}{HASANT}{KONTHYO_KO}")) {
        ime.pop(3);
        ime.append(&format!("{KONTHYO_KO}{HASANT}{MURDHONNO_SHO}"), true);
        return true;
    }
    false
}

/// `ho.ts`: h starts হ on an empty buffer (or after a roman vowel key).
pub(crate) fn ho(ime: &mut Engine, key: &str) -> bool {
    if key != "h" {
        return false;
    }
    let last = ime.last_in_buffer();
    if ime.buffer.is_empty() || last.as_deref().is_some_and(|l| ime.is_vowel(l)) {
        ime.append(USHMO_HO, true);
        return true;
    }
    false
}

/// `khanda-to.ts`: ত + H → ৎ.
pub(crate) fn khanda_to(ime: &mut Engine, key: &str) -> bool {
    if key != "H" {
        return false;
    }
    if ime.last_in_buffer().as_deref() == Some(DONTO_TO) {
        ime.replace_last(KHONDO_TO, false, 1);
        return true;
    }
    false
}

/// `ja-fala.ts`: consonant + y → ্য.
pub(crate) fn ja_fala(ime: &mut Engine, key: &str) -> bool {
    if key != "y" {
        return false;
    }
    if ime.last_in_buffer().as_deref().is_some_and(|l| ime.is_phonetic_consonant(l)) {
        ime.append(&format!("{HASANT}{ONTOSTHO_JO}"), true);
        return true;
    }
    false
}

/// `aspiration.ts`: consonant + h → aspirated form.
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

/// `nyo-plus-cha.ts`: ন + c → ঞ্চ.
pub(crate) fn nyo_plus_cha(ime: &mut Engine, key: &str) -> bool {
    if key == "c" && ime.last_in_buffer().as_deref() == Some(DONTO_NO) {
        ime.replace_last(&format!("{TALOBBO_NYO}{HASANT}{TALOBBO_CHO}"), false, 1);
        return true;
    }
    false
}

/// `onushwar.ts`: ন + g → ং.
pub(crate) fn onushwar(ime: &mut Engine, key: &str) -> bool {
    if key == "g" && ime.last_in_buffer().as_deref() == Some(DONTO_NO) {
        ime.replace_last(ONUSHWAR, true, 1);
        return true;
    }
    false
}

/// `ungo.ts`: ণ + g → ঙ.
pub(crate) fn ungo(ime: &mut Engine, key: &str) -> bool {
    if key == "g" && ime.last_in_buffer().as_deref() == Some(MURDHONNO_NO) {
        ime.replace_last(KONTHYO_UNGO, false, 1);
        return true;
    }
    false
}

/// `jo-plus-nyo.ts`: গ + g → জ্ঞ.
pub(crate) fn jo_plus_nyo(ime: &mut Engine, key: &str) -> bool {
    if key == "g" && ime.last_in_buffer().as_deref() == Some(KONTHYO_GO) {
        ime.replace_last(&format!("{BORGIYO_JO}{HASANT}{TALOBBO_NYO}"), false, 1);
        return true;
    }
    false
}

/// `nyo.ts`: ণ + G → ঞ.
pub(crate) fn nyo(ime: &mut Engine, key: &str) -> bool {
    if key == "G" && ime.last_in_buffer().as_deref() == Some(MURDHONNO_NO) {
        ime.replace_last(TALOBBO_NYO, false, 1);
        return true;
    }
    false
}

/// `nyo-plus-borgiyo-jo.ts`: ন + j → ঞ্জ.
pub(crate) fn nyo_plus_borgiyo_jo(ime: &mut Engine, key: &str) -> bool {
    if key == "j" && ime.last_in_buffer().as_deref() == Some(DONTO_NO) {
        ime.replace_last(&format!("{TALOBBO_NYO}{HASANT}{BORGIYO_JO}"), false, 1);
        return true;
    }
    false
}
