# Golden fixtures

These files pin the behaviour of `druti-core`. `cargo test -p druti-core` replays every case
(`tests/fixtures.rs` for `engine/`, `tests/composer.rs` for `composer/`), and CI fails on any
mismatch.

They were first generated from the original TypeScript engine, which has since been removed. They
are never regenerated. **When you change the engine on purpose, update the affected entries in the
same commit**, by hand or with a one-off script, so the review shows the behaviour change next to
the code change. A fixture diff without an engine change, or an engine change that breaks a fixture
with no matching fixture edit, is a regression.

`composer/` is written by hand from the spec in `openspec/specs/ime-composer/`.

## `engine/`

| File | Contents |
|---|---|
| `unit.json` | Unit cases per rule (aspiration, conjuncts, kars, digits, punctuation, …) |
| `words.json` | Curated roman words and sentences by category, each without context and with the engine output as context |
| `random.json` | Seeded random sequences (keys, Backspace, no/output/pooled context) |
| `vowel-attach.json` | `{ text, karTaking, consonantChandrabindu }`: `ends_with_kar_taking_consonant` and `ends_with_consonant_and_chandrabindu` |
| `transpile.json` | `{ input, preserveLineBreaks?, output }`: `transpile_roman_document` |
| `data.json` | Every lookup table in `src/data.rs`, in order |

## Engine case format

Each case is one line: `{ "name", "category"?, "steps": [...] }`, replayed on a fresh engine.
A step is one operation plus the engine state after it:

| Field | Meaning |
|---|---|
| `k` | Key passed to `process` (a character, or `"Enter"`) |
| `c` | `text_before_caret` passed with the key (absent = not passed) |
| `bs` | `1` = `process_backspace()` (undoes the last keystroke) |
| `en` | `1` = `toggle_english_mode()` |
| `set` | `set_output()` (a host resync; clears the undo history) |
| `a` | Returned actions: `["i", text]` insert, `["r", n, text]` replace, `["d", n]` delete, `["s"]` split block |
| `o`, `b` | `output` and `buffer` after the step |

All counts (`n`) are UTF-16 code units. Nukta letters are the precomposed code points
(U+09DC ড়, U+09DD ঢ়, U+09DF য়); write them as `\u` escapes in source, because Unicode
normalization decomposes them.
