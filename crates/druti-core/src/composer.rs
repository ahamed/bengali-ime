//! Host adapter for marked-text input methods (macOS, and later iOS).
//!
//! The engine rewrites recent output (`k` then `h`: ক → খ). An input method
//! can freely change only its own marked (pending) text, so after every key
//! the composer splits the result into text to commit, which is final in the
//! document, and pending text, which later keys may still change. The pending
//! text is the engine's buffer, or a lone `-` / `।` that the next key may
//! rewrite (`--` → `—`, `।.` → `..`).

use crate::data::{DARI, DASH, ENTER_KEY};
use crate::engine::{Action, Config, Engine, is_consonant_key, is_vowel, utf16};
use crate::letters::ends_in_bengali;

/// What the host applies after a key, in this order:
/// 1. Delete `replace_before` UTF-16 units of committed text just before the
///    pending (marked) text. Non-zero only while nothing was pending, when the
///    engine rewrites text the composer did not type: a `-` already in the
///    document, a resumed cluster, or a letter removed by Backspace.
/// 2. Replace the current pending text with `commit`, as final text.
/// 3. Show `pending` as the new pending text (empty: none).
///
/// When `handled` is false the host lets the application process the key
/// itself, after applying steps 1–3.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Update {
    /// UTF-16 units of committed text to delete before the pending text (step 1).
    pub replace_before: u32,
    /// Text that replaces the pending text and becomes final (step 2).
    pub commit: String,
    /// The new pending text (step 3).
    pub pending: String,
    /// Whether the key was consumed; if not, the application also processes it.
    pub handled: bool,
}

/// Wraps an [`Engine`] and tracks what is pending in the host.
#[derive(Debug, Clone)]
pub struct Composer {
    engine: Engine,
    /// The pending (marked) text currently shown by the host, in UTF-16.
    pending: Vec<u16>,
    /// The composer lost track of the text before the caret (a reset without
    /// context, or a Backspace the host handled): the next key's context
    /// resumes the cluster that ends there (design D4).
    resume_on_next_key: bool,
}

impl Default for Composer {
    fn default() -> Self {
        Self::new(Config::default())
    }
}

impl Composer {
    /// A composer with nothing pending. The first key's context resumes the
    /// cluster before the caret, as after [`Composer::reset`] without context.
    pub fn new(config: Config) -> Self {
        Self {
            engine: Engine::with_config(config),
            pending: Vec::new(),
            resume_on_next_key: true,
        }
    }

    /// The current output options.
    pub fn config(&self) -> Config {
        self.engine.config()
    }

    /// Changes the output options; applies from the next key.
    pub fn set_config(&mut self, config: Config) {
        self.engine.set_config(config);
    }

    /// The pending text the host should currently be showing.
    pub fn pending(&self) -> String {
        String::from_utf16_lossy(&self.pending)
    }

    /// Handles one typed character. `text_before_caret` is the committed
    /// document text before the pending text, when the host can read it; with
    /// `None` the engine uses what it has produced since the last reset.
    ///
    /// After a reset or a Backspace the host handled, the consonant run that
    /// ends `text_before_caret` becomes the cluster, so `h` after `ত` gives
    /// `থ`: the update then replaces that run in the host (`replace_before`).
    ///
    /// Return/Enter is not a Bangla key: `"Enter"` flushes and is not handled.
    pub fn key(&mut self, key: &str, text_before_caret: Option<&str>) -> Update {
        if key == ENTER_KEY {
            return Update {
                handled: false,
                ..self.flush()
            };
        }

        if std::mem::take(&mut self.resume_on_next_key)
            && self.pending.is_empty()
            && let Some(text) = text_before_caret
        {
            self.engine.set_output(text);
            self.engine.resume_cluster();
        }

        let context = text_before_caret.map(|text| format!("{text}{}", self.pending()));
        let actions = self.engine.process(key, context.as_deref());
        if actions.is_empty() {
            // Not a key the engine knows (e.g. a multi-character key name).
            return Update {
                handled: false,
                pending: self.pending(),
                ..Update::default()
            };
        }
        self.apply_actions(Some(key), &actions)
    }

    /// Whether the result of `key` can depend on the document text before the
    /// caret: vowels (kar or independent vowel), consonants and `^` (resuming
    /// the cluster before the caret), `-` (em dash), `.` (decimal point,
    /// ellipsis) and quotes (balancing). Hosts read the document only for
    /// these keys, and only while nothing is pending.
    pub fn key_reads_document(key: &str) -> bool {
        matches!(key, "-" | "." | "\"" | "'" | "^") || is_vowel(key) || is_consonant_key(key)
    }

    /// Replays the engine's actions on the pending text and splits the result
    /// into text to commit and the new pending text. Anything the actions
    /// remove beyond the pending text is committed text the host must replace.
    ///
    /// `key` is `None` for Backspace, which leaves a resumed cluster as plain
    /// text; after a key, a resumed cluster still committed in the host joins
    /// the pending text, so the pending text is the whole buffer (design D5).
    fn apply_actions(&mut self, key: Option<&str>, actions: &[Action]) -> Update {
        let mut text = self.pending.clone();
        let mut replace_before = 0usize;
        for action in actions {
            let (chars_back, insert) = match action {
                Action::Insert { text } => (0, text.as_str()),
                Action::Replace { chars_back, text } => (*chars_back, text.as_str()),
                Action::Delete { chars_back } => (*chars_back, ""),
                Action::SplitBlock => (0, ""),
            };
            if chars_back > text.len() {
                replace_before += chars_back - text.len();
                text.clear();
            } else {
                text.truncate(text.len() - chars_back);
            }
            text.extend(insert.encode_utf16());
        }

        let mut held = self.held_len(key, actions);
        let output = &self.engine.output;
        // Only while nothing was pending: hosts replace committed text only
        // then (the macOS input source cannot combine it with marked text).
        if key.is_some() && self.pending.is_empty() && held > text.len() && held <= output.len() {
            let missing = &output[output.len() - held..output.len() - text.len()];
            replace_before += missing.len();
            text.splice(0..0, missing.iter().copied());
        }
        held = held.min(text.len());

        let commit = text[..text.len() - held].to_vec();
        self.pending = text[text.len() - held..].to_vec();
        Update {
            replace_before: u32::try_from(replace_before).unwrap_or(u32::MAX),
            commit: String::from_utf16_lossy(&commit),
            pending: self.pending(),
            handled: true,
        }
    }

    /// How much of the end of the new text stays pending.
    fn held_len(&self, key: Option<&str>, actions: &[Action]) -> usize {
        let buffer = self.engine.buffer_len_utf16();
        if buffer > 0 {
            return buffer;
        }
        let inserted =
            |s: &str| matches!(actions.last(), Some(Action::Insert { text }) if text == s);
        match key {
            Some(DASH) if inserted(DASH) => utf16(DASH).len(),
            Some(".") if inserted(DARI) => utf16(DARI).len(),
            _ => 0,
        }
    }

    /// Backspace: removes one letter, as [`Engine::process_backspace`] does
    /// (ime-composer spec, "Letter backspace"). `text_before_caret` is the
    /// committed document text before the pending text, when the host can
    /// read it.
    ///
    /// - With pending text, its last letter goes. The consonant run left before
    ///   the caret stays pending (`দ্ম` → `দ`) and the rest is committed.
    /// - With nothing pending and text before the caret that ends in a Bengali
    ///   letter, the update deletes that letter from the host through
    ///   `replace_before` and the run left before the caret becomes the
    ///   cluster, still as plain text.
    /// - Otherwise the key is not handled (the application deletes) and the
    ///   composer resets; the next key's context resumes the cluster.
    pub fn backspace(&mut self, text_before_caret: Option<&str>) -> Update {
        if self.pending.is_empty() {
            let Some(text) = text_before_caret.filter(|text| ends_in_bengali(text)) else {
                self.reset(None);
                return Update {
                    handled: false,
                    ..Update::default()
                };
            };
            self.engine.set_output(text);
        } else if let Some(text) = text_before_caret {
            self.engine.set_output(&format!(
                "{text}{}",
                String::from_utf16_lossy(&self.pending)
            ));
        }
        self.resume_on_next_key = false;
        let actions = self.engine.process_backspace();
        self.apply_actions(None, &actions)
    }

    /// Commits all pending text and ends the cluster (focus change, arrow keys,
    /// shortcuts, switching input source).
    pub fn flush(&mut self) -> Update {
        self.engine.end_cluster();
        let commit = self.pending();
        self.pending.clear();
        Update {
            replace_before: 0,
            commit,
            pending: String::new(),
            handled: true,
        }
    }

    /// Forgets all state without committing anything (the caret moved, or the
    /// document changed underneath). The host drops its pending text.
    ///
    /// `text_before_caret`, when known, becomes the engine's view of the
    /// document and the consonant run at its end becomes the cluster. Without
    /// it, the context supplied with the next key does the same.
    pub fn reset(&mut self, text_before_caret: Option<&str>) -> Update {
        let config = self.engine.config();
        self.engine = Engine::with_config(config);
        if let Some(text) = text_before_caret {
            self.engine.set_output(text);
            self.engine.resume_cluster();
        }
        self.resume_on_next_key = text_before_caret.is_none();
        self.pending.clear();
        Update {
            handled: true,
            ..Update::default()
        }
    }
}
