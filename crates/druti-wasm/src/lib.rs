//! wasm-bindgen surface of `druti-core` for the web playground. It mirrors the
//! UniFFI surface in `druti-ffi`, so the browser types exactly like the macOS
//! input method. Nothing platform-specific lives here.
//!
//! A panic traps on `wasm32-unknown-unknown` (there is no unwinding), so the
//! JavaScript host catches the exception, creates a new `Composer` and lets
//! the key through.

use wasm_bindgen::prelude::*;

/// Output options; see `druti_core::Config`. `new Config()` has every option on.
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Config {
    #[wasm_bindgen(js_name = bengaliDigits)]
    pub bengali_digits: bool,
    #[wasm_bindgen(js_name = dariForPeriod)]
    pub dari_for_period: bool,
    #[wasm_bindgen(js_name = smartQuotes)]
    pub smart_quotes: bool,
}

#[wasm_bindgen]
impl Config {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        druti_core::Config::default().into()
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::new()
    }
}

impl From<Config> for druti_core::Config {
    fn from(c: Config) -> Self {
        Self {
            bengali_digits: c.bengali_digits,
            dari_for_period: c.dari_for_period,
            smart_quotes: c.smart_quotes,
        }
    }
}

impl From<druti_core::Config> for Config {
    fn from(c: druti_core::Config) -> Self {
        Self {
            bengali_digits: c.bengali_digits,
            dari_for_period: c.dari_for_period,
            smart_quotes: c.smart_quotes,
        }
    }
}

/// What the host applies after a key; see `druti_core::Update`.
/// `replaceBefore` is in UTF-16 code units, the unit of JavaScript strings.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Update {
    #[wasm_bindgen(js_name = replaceBefore)]
    pub replace_before: u32,
    pub commit: String,
    pub pending: String,
    pub handled: bool,
}

impl From<druti_core::Update> for Update {
    fn from(u: druti_core::Update) -> Self {
        Self {
            replace_before: u.replace_before,
            commit: u.commit,
            pending: u.pending,
            handled: u.handled,
        }
    }
}

/// One composer per editor.
#[wasm_bindgen]
pub struct Composer {
    inner: druti_core::Composer,
}

#[wasm_bindgen]
impl Composer {
    #[wasm_bindgen(constructor)]
    pub fn new(config: &Config) -> Self {
        Self {
            inner: druti_core::Composer::new((*config).into()),
        }
    }

    /// One typed character (or `"Enter"`); `textBeforeCaret` is the committed
    /// text before the pending text.
    pub fn key(
        &mut self,
        key: &str,
        #[wasm_bindgen(js_name = textBeforeCaret)] text_before_caret: Option<String>,
    ) -> Update {
        self.inner.key(key, text_before_caret.as_deref()).into()
    }

    pub fn backspace(&mut self) -> Update {
        self.inner.backspace().into()
    }

    pub fn flush(&mut self) -> Update {
        self.inner.flush().into()
    }

    pub fn reset(
        &mut self,
        #[wasm_bindgen(js_name = textBeforeCaret)] text_before_caret: Option<String>,
    ) -> Update {
        self.inner.reset(text_before_caret.as_deref()).into()
    }

    /// The pending text the host should currently be showing.
    #[wasm_bindgen(getter)]
    pub fn pending(&self) -> String {
        self.inner.pending()
    }

    #[wasm_bindgen(getter)]
    pub fn config(&self) -> Config {
        self.inner.config().into()
    }

    /// Applies from the next key.
    #[wasm_bindgen(js_name = setConfig)]
    pub fn set_config(&mut self, config: &Config) {
        self.inner.set_config((*config).into());
    }
}

/// Bulk conversion of a roman document.
#[wasm_bindgen(js_name = transpileRomanDocument)]
pub fn transpile_roman_document(
    document: &str,
    #[wasm_bindgen(js_name = preserveLineBreaks)] preserve_line_breaks: bool,
    config: &Config,
) -> String {
    druti_core::transpile_roman_document_with_config(
        document,
        preserve_line_breaks,
        (*config).into(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn type_keys(composer: &mut Composer, keys: &str) -> Vec<Update> {
        keys.chars()
            .map(|ch| composer.key(&ch.to_string(), None))
            .collect()
    }

    #[test]
    fn aspiration_in_the_browser() {
        let mut composer = Composer::new(&Config::new());
        let updates = type_keys(&mut composer, "kh");
        assert_eq!(updates[0].pending, "ক");
        assert_eq!(updates[0].commit, "");
        assert_eq!(updates[1].pending, "খ");
        assert_eq!(updates[1].commit, "");
    }

    #[test]
    fn commit_on_a_word_break() {
        let mut composer = Composer::new(&Config::new());
        let updates = type_keys(&mut composer, "ami ");
        let committed: String = updates.iter().map(|u| u.commit.as_str()).collect();
        assert_eq!(committed, "আমি ");
        assert_eq!(updates.last().unwrap().pending, "");
    }

    #[test]
    fn default_settings() {
        let config = Config::new();
        assert!(config.bengali_digits && config.dari_for_period && config.smart_quotes);
        assert_eq!(
            druti_core::Config::from(config),
            druti_core::Config::default()
        );
    }

    #[test]
    fn same_updates_as_the_core_composer() {
        let mut wasm = Composer::new(&Config::new());
        let mut core = druti_core::Composer::new(druti_core::Config::default());
        for key in [
            "k", "k", "h", "i", " ", "-", "-", "1", ".", "5", "\"", "Enter",
        ] {
            assert_eq!(
                wasm.key(key, Some("ক".into())),
                core.key(key, Some("ক")).into()
            );
        }
        assert_eq!(wasm.backspace(), core.backspace().into());
        assert_eq!(wasm.flush(), core.flush().into());
        assert_eq!(wasm.reset(Some("ক".into())), core.reset(Some("ক")).into());
    }

    #[test]
    fn config_changes_apply_from_the_next_key() {
        let mut composer = Composer::new(&Config::new());
        let mut config = composer.config();
        config.bengali_digits = false;
        composer.set_config(&config);
        assert_eq!(composer.key("2", None).commit, "2");
    }

    #[test]
    fn multi_line_document() {
        let input = "ami banglay gan gai\nami banglar gan gai";
        let config = Config::new();
        let expected = druti_core::transpile_roman_document_with_config(input, true, config.into());
        assert_eq!(transpile_roman_document(input, true, &config), expected);
        assert_eq!(expected.lines().count(), 2);
    }
}
