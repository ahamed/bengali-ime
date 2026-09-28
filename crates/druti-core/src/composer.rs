//! Host adapter for marked-text input methods (macOS, and later iOS).
//!
//! The engine rewrites recent output (`k` then `h`: ক → খ). An input method
//! can freely change only its own marked (pending) text, so after every key
//! the composer splits the result into text to commit, which is final in the
//! document, and pending text, which later keys may still change. The pending
//! text is the engine's buffer, or a lone `-` / `।` that the next key may
//! rewrite (`--` → `—`, `।.` → `..`).

use unicode_segmentation::UnicodeSegmentation;

use crate::data::{DARI, DASH, ENTER_KEY};
use crate::engine::{Action, Config, Engine, is_vowel, utf16};

/// What the host applies after a key, in this order:
/// 1. Delete `replace_before` UTF-16 units of committed text just before the
///    pending (marked) text. Non-zero only when the engine rewrote text the
///    composer did not type, such as a `-` already in the document.
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
}

impl Default for Composer {
    fn default() -> Self {
        Self::new(Config::default())
    }
}

impl Composer {
    /// A composer with nothing pending.
    pub fn new(config: Config) -> Self {
        Self {
            engine: Engine::with_config(config),
            pending: Vec::new(),
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
    /// Return/Enter is not a Bangla key: `"Enter"` flushes and is not handled.
    pub fn key(&mut self, key: &str, text_before_caret: Option<&str>) -> Update {
        if key == ENTER_KEY {
            return Update {
                handled: false,
                ..self.flush()
            };
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

        // Replay the actions on the pending text; anything they remove beyond
        // it is committed text that must be replaced in the host.
        let mut text = self.pending.clone();
        let mut replace_before = 0usize;
        for action in &actions {
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

        let held = self.held_len(key, &actions).min(text.len());
        let commit = text[..text.len() - held].to_vec();
        self.pending = text[text.len() - held..].to_vec();
        Update {
            replace_before: u32::try_from(replace_before).unwrap_or(u32::MAX),
            commit: String::from_utf16_lossy(&commit),
            pending: self.pending(),
            handled: true,
        }
    }

    /// Whether the result of `key` can depend on the document text before the
    /// caret: vowels (kar or independent vowel), `-` (em dash), `.` (decimal
    /// point, ellipsis) and quotes (balancing). Hosts read the document only
    /// for these keys, and only while nothing is pending.
    pub fn key_reads_document(key: &str) -> bool {
        matches!(key, "-" | "." | "\"" | "'") || is_vowel(key)
    }

    /// How much of the end of the new text stays pending.
    fn held_len(&self, key: &str, actions: &[Action]) -> usize {
        let buffer = self.engine.buffer_len_utf16();
        if buffer > 0 {
            return buffer;
        }
        let inserted =
            |s: &str| matches!(actions.last(), Some(Action::Insert { text }) if text == s);
        if (key == DASH && inserted(DASH)) || (key == "." && inserted(DARI)) {
            return utf16(if key == DASH { DASH } else { DARI }).len();
        }
        0
    }

    /// Backspace. With pending text, removes its last grapheme cluster and ends
    /// the cluster, committing whatever pending text remains. With nothing
    /// pending, the key is not handled (the application deletes) and the
    /// composer resets, since it can no longer know the text before the caret.
    pub fn backspace(&mut self) -> Update {
        let pending = self.pending();
        let Some(last) = pending.graphemes(true).next_back() else {
            self.reset(None);
            return Update {
                handled: false,
                ..Update::default()
            };
        };
        let count = last.encode_utf16().count();
        self.engine.delete_tail(count);
        let remaining = pending[..pending.len() - last.len()].to_owned();
        self.pending.clear();
        Update {
            replace_before: 0,
            commit: remaining,
            pending: String::new(),
            handled: true,
        }
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
    /// document changed underneath). `text_before_caret`, when known, seeds the
    /// engine's own view of the document. The host drops its pending text.
    pub fn reset(&mut self, text_before_caret: Option<&str>) -> Update {
        let config = self.engine.config();
        self.engine = Engine::with_config(config);
        if let Some(text) = text_before_caret {
            self.engine.set_output(text);
        }
        self.pending.clear();
        Update {
            handled: true,
            ..Update::default()
        }
    }
}
