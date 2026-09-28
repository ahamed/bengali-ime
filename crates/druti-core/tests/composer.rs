//! Replays the hand-written composer fixtures in `fixtures/composer/`, which
//! encode the ime-composer spec scenarios, through a simulated host document.

use std::path::PathBuf;

use druti_core::{Composer, Config, Update};
use serde::Deserialize;

#[derive(Deserialize)]
struct CaseFile {
    cases: Vec<Case>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ConfigPatch {
    bengali_digits: Option<bool>,
    dari_for_period: Option<bool>,
    smart_quotes: Option<bool>,
}

#[derive(Deserialize)]
struct Case {
    name: String,
    config: Option<ConfigPatch>,
    steps: Vec<Step>,
    committed: Option<String>,
}

#[derive(Deserialize)]
struct Step {
    key: Option<String>,
    ctx: Option<String>,
    backspace: Option<u8>,
    flush: Option<u8>,
    reset: Option<u8>,
    expect: Option<Expected>,
}

#[derive(Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct Expected {
    replace_before: u32,
    commit: String,
    pending: String,
    handled: bool,
}

impl From<&Update> for Expected {
    fn from(u: &Update) -> Self {
        Self {
            replace_before: u.replace_before,
            commit: u.commit.clone(),
            pending: u.pending.clone(),
            handled: u.handled,
        }
    }
}

/// The host side: committed document text plus the marked (pending) text.
#[derive(Default)]
struct Host {
    committed: Vec<u16>,
}

impl Host {
    fn apply(&mut self, update: &Update) {
        let keep = self
            .committed
            .len()
            .saturating_sub(update.replace_before as usize);
        self.committed.truncate(keep);
        self.committed.extend(update.commit.encode_utf16());
    }
}

fn run(case: &Case) -> Result<(), String> {
    let mut config = Config::default();
    if let Some(patch) = &case.config {
        config.bengali_digits = patch.bengali_digits.unwrap_or(config.bengali_digits);
        config.dari_for_period = patch.dari_for_period.unwrap_or(config.dari_for_period);
        config.smart_quotes = patch.smart_quotes.unwrap_or(config.smart_quotes);
    }
    let mut composer = Composer::new(config);
    let mut host = Host::default();
    for (index, step) in case.steps.iter().enumerate() {
        let (label, update) = if let Some(key) = &step.key {
            (
                format!("key {key:?}"),
                composer.key(key, step.ctx.as_deref()),
            )
        } else if step.backspace.is_some() {
            ("backspace".to_owned(), composer.backspace())
        } else if step.flush.is_some() {
            ("flush".to_owned(), composer.flush())
        } else if step.reset.is_some() {
            ("reset".to_owned(), composer.reset(step.ctx.as_deref()))
        } else {
            return Err(format!("step {index}: no operation"));
        };
        host.apply(&update);
        if let Some(expected) = &step.expect {
            let actual = Expected::from(&update);
            if &actual != expected {
                return Err(format!(
                    "step {index} ({label}): expected {expected:?}, actual {actual:?}"
                ));
            }
        }
        if update.pending != composer.pending() {
            return Err(format!(
                "step {index} ({label}): update pending differs from composer state"
            ));
        }
    }
    if let Some(expected) = &case.committed {
        let actual = String::from_utf16_lossy(&host.committed);
        if &actual != expected {
            return Err(format!(
                "committed text: expected {expected:?}, actual {actual:?}"
            ));
        }
    }
    Ok(())
}

fn replay(name: &str) {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/composer")
        .join(name);
    let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    let file: CaseFile =
        serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    let failures: Vec<String> = file
        .cases
        .iter()
        .filter_map(|case| run(case).err().map(|e| format!("  {:?}: {e}", case.name)))
        .collect();
    assert!(
        failures.is_empty(),
        "{name}: {} of {} failed\n{}",
        failures.len(),
        file.cases.len(),
        failures.join("\n")
    );
}

#[test]
fn split() {
    replay("split.json");
}

#[test]
fn hold() {
    replay("hold.json");
}

#[test]
fn context() {
    replay("context.json");
}

#[test]
fn backspace() {
    replay("backspace.json");
}

#[test]
fn config() {
    replay("config.json");
}

#[derive(Deserialize)]
struct RandomFile {
    cases: Vec<RandomCase>,
}

#[derive(Deserialize)]
struct RandomCase {
    name: String,
    steps: Vec<RandomStep>,
}

#[derive(Deserialize)]
struct RandomStep {
    k: Option<String>,
}

/// Property: typing any key sequence through the composer (without host
/// context) keeps committed + pending equal to the engine's output, keeps the
/// pending text equal to the engine buffer (or a held `-` / `।`), and never
/// asks the host to rewrite committed text.
#[test]
fn composer_invariants_over_random_sequences() {
    use druti_core::Engine;
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/engine/random.json");
    let file: RandomFile = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let mut failures = Vec::new();
    let mut keys_checked = 0;
    for case in &file.cases {
        let mut composer = Composer::default();
        let mut reference = Engine::new();
        let mut host = Host::default();
        for key in case.steps.iter().filter_map(|s| s.k.as_deref()) {
            keys_checked += 1;
            let update = composer.key(key, None);
            if key == "Enter" {
                reference.end_cluster();
            } else {
                reference.process(key, None);
            }
            host.apply(&update);
            let shown = format!(
                "{}{}",
                String::from_utf16_lossy(&host.committed),
                update.pending
            );
            let buffer = reference.buffer();
            let pending_ok = update.pending == buffer
                || (buffer.is_empty() && (update.pending == "-" || update.pending == "।"));
            if shown != reference.output() || !pending_ok || update.replace_before != 0 {
                failures.push(format!(
                    "  {:?} key {key:?}: shown {shown:?} engine {:?} pending {:?} buffer {buffer:?} replace_before {}",
                    case.name,
                    reference.output(),
                    update.pending,
                    update.replace_before
                ));
                break;
            }
        }
    }
    assert!(keys_checked > 10_000, "only {keys_checked} keys checked");
    assert!(
        failures.is_empty(),
        "{} sequences failed\n{}",
        failures.len(),
        failures
            .iter()
            .take(10)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}

/// `Composer::key_reads_document` must name every key whose result can depend
/// on the text before the caret, or hosts would skip reading it. Checked by
/// typing each key after a range of document endings on a fresh composer and
/// comparing with an empty document.
#[test]
fn key_reads_document_covers_every_context_sensitive_key() {
    let contexts = [
        "\u{0995}",                 // ক
        "\u{0995}\u{09BC}",         // ক + nukta
        "\u{0995}\u{0981}",         // কঁ
        "\u{0995}\u{09CD}\u{09B7}", // ক্ষ
        "\u{0995}\u{09BF}",         // কি
        "-",
        "\u{0964}", // ।
        ".",
        "\u{09E7}", // ১
        "1",
        "\u{201C}\u{0995}", // “ক
        "\u{2018}",         // ‘
        "\"",
        "'",
        "a ",
        "\u{1F600}", // emoji (surrogate pair)
    ];
    let mut keys: Vec<String> = (0x20u8..0x7F).map(|b| (b as char).to_string()).collect();
    keys.push("\t".into());
    let mut missing = Vec::new();
    for key in &keys {
        let baseline = Composer::default().key(key, Some(""));
        for ctx in contexts {
            let update = Composer::default().key(key, Some(ctx));
            if update != baseline && !Composer::key_reads_document(key) {
                missing.push(format!("{key:?} after {ctx:?}"));
            }
        }
    }
    assert!(
        missing.is_empty(),
        "context-sensitive keys not reported: {missing:?}"
    );
    assert!(!Composer::key_reads_document("k"));
    assert!(Composer::key_reads_document("i"));
    assert!(Composer::key_reads_document("A"));
}
