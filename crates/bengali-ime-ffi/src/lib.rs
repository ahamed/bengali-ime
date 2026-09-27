//! UniFFI surface of `bengali-ime-core` for Swift (the macOS input method, and
//! later an iOS keyboard extension). Nothing platform-specific lives here.
//!
//! Every call is guarded: if the engine ever panics, the composer is reset
//! and the key is reported as not handled, so the host app still receives it
//! and typing never stops.

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::{Arc, Mutex, MutexGuard};

uniffi::setup_scaffolding!();

/// Output options; see `bengali_ime_core::Config`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Record)]
pub struct Config {
    pub bengali_digits: bool,
    pub dari_for_period: bool,
    pub smart_quotes: bool,
}

impl From<Config> for bengali_ime_core::Config {
    fn from(c: Config) -> Self {
        Self {
            bengali_digits: c.bengali_digits,
            dari_for_period: c.dari_for_period,
            smart_quotes: c.smart_quotes,
        }
    }
}

impl From<bengali_ime_core::Config> for Config {
    fn from(c: bengali_ime_core::Config) -> Self {
        Self {
            bengali_digits: c.bengali_digits,
            dari_for_period: c.dari_for_period,
            smart_quotes: c.smart_quotes,
        }
    }
}

/// The defaults, identical to the TypeScript engine.
#[uniffi::export]
pub fn default_config() -> Config {
    bengali_ime_core::Config::default().into()
}

/// What the host applies after a key; see `bengali_ime_core::Update`.
/// `replace_before` is in UTF-16 code units (NSString / NSRange units).
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct Update {
    pub replace_before: u32,
    pub commit: String,
    pub pending: String,
    pub handled: bool,
}

impl From<bengali_ime_core::Update> for Update {
    fn from(u: bengali_ime_core::Update) -> Self {
        Self {
            replace_before: u.replace_before,
            commit: u.commit,
            pending: u.pending,
            handled: u.handled,
        }
    }
}

/// One composer per text-input session (IMK creates one controller per client).
#[derive(uniffi::Object)]
pub struct Composer {
    inner: Mutex<bengali_ime_core::Composer>,
}

impl Composer {
    fn lock(&self) -> MutexGuard<'_, bengali_ime_core::Composer> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn guarded(
        &self,
        f: impl FnOnce(&mut bengali_ime_core::Composer) -> bengali_ime_core::Update,
    ) -> Update {
        let mut composer = self.lock();
        match catch_unwind(AssertUnwindSafe(|| f(&mut composer))) {
            Ok(update) => update.into(),
            Err(_) => {
                let config = composer.config();
                *composer = bengali_ime_core::Composer::new(config);
                Update {
                    replace_before: 0,
                    commit: String::new(),
                    pending: String::new(),
                    handled: false,
                }
            }
        }
    }
}

#[uniffi::export]
impl Composer {
    #[uniffi::constructor]
    pub fn new(config: Config) -> Arc<Self> {
        Arc::new(Self {
            inner: Mutex::new(bengali_ime_core::Composer::new(config.into())),
        })
    }

    /// One typed character (or `"Enter"`); `text_before_caret` is the committed
    /// text before the pending text when the app exposes it.
    pub fn key(&self, key: String, text_before_caret: Option<String>) -> Update {
        self.guarded(|c| c.key(&key, text_before_caret.as_deref()))
    }

    pub fn backspace(&self) -> Update {
        self.guarded(|c| c.backspace())
    }

    pub fn flush(&self) -> Update {
        self.guarded(|c| c.flush())
    }

    pub fn reset(&self, text_before_caret: Option<String>) -> Update {
        self.guarded(|c| c.reset(text_before_caret.as_deref()))
    }

    /// The pending text the host should currently be showing.
    pub fn pending(&self) -> String {
        self.lock().pending()
    }

    pub fn config(&self) -> Config {
        self.lock().config().into()
    }

    pub fn set_config(&self, config: Config) {
        self.lock().set_config(config.into());
    }
}

/// Whether `key` can depend on the document text before the caret. Read the
/// document (and pass it as `text_before_caret`) only for these keys, and only
/// while nothing is pending.
#[uniffi::export]
pub fn key_reads_document(key: String) -> bool {
    bengali_ime_core::Composer::key_reads_document(&key)
}

/// Bulk conversion of a roman document (the "Convert selection" command).
#[uniffi::export]
pub fn transpile_roman_document(
    document: String,
    preserve_line_breaks: bool,
    config: Config,
) -> String {
    catch_unwind(|| {
        bengali_ime_core::transpile_roman_document_with_config(
            &document,
            preserve_line_breaks,
            config.into(),
        )
    })
    .unwrap_or(document.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn type_keys(composer: &Composer, keys: &str) -> String {
        let mut committed = String::new();
        for ch in keys.chars() {
            let update = composer.key(ch.to_string(), None);
            committed.push_str(&update.commit);
        }
        committed
    }

    #[test]
    fn typing_through_the_ffi_surface() {
        let composer = Composer::new(default_config());
        assert_eq!(type_keys(&composer, "khub "), "খুব ");
        assert_eq!(composer.pending(), "");
    }

    #[test]
    fn document_keys() {
        assert!(key_reads_document("i".into()));
        assert!(key_reads_document("-".into()));
        assert!(!key_reads_document("k".into()));
    }

    #[test]
    fn pending_and_backspace() {
        let composer = Composer::new(default_config());
        assert_eq!(composer.key("k".into(), None).pending, "ক");
        assert_eq!(composer.key("h".into(), None).pending, "খ");
        let update = composer.backspace();
        assert!(update.handled);
        assert_eq!(update.pending, "");
        assert!(!composer.backspace().handled);
    }

    #[test]
    fn config_round_trip() {
        let composer = Composer::new(default_config());
        let config = Config {
            bengali_digits: false,
            ..default_config()
        };
        composer.set_config(config);
        assert_eq!(composer.config(), config);
        assert_eq!(composer.key("2".into(), None).commit, "2");
    }

    #[test]
    fn transpile_applies_config() {
        let config = Config {
            dari_for_period: false,
            ..default_config()
        };
        assert_eq!(
            transpile_roman_document("ami banglay gan gai.".into(), true, default_config()),
            "আমি বাংলা\u{9DF} গান গাই।"
        );
        assert_eq!(
            transpile_roman_document("ami.".into(), true, config),
            "আমি."
        );
    }
}
