# druti-core

Druti's phonetic roman → Bengali engine, plus the `Composer` adapter that input methods use. This
is the only implementation of the algorithm: the macOS input method uses it through `druti-ffi`,
and the web playground through `druti-wasm`. Its behaviour is pinned by the golden fixtures in
`tests/fixtures/`.

## API

| Item | Purpose |
|---|---|
| `Engine` | Keystroke engine: `process(key, text_before_caret)`, `process_backspace()`, `resume_cluster()`, `toggle_english_mode()`, `set_output()` (resync), `output()`, `buffer()`. Returns `Action`s (`Insert`, `Replace`, `Delete`, `SplitBlock`), with back counts in UTF-16 code units. |
| `Config` | Output toggles: `bengali_digits`, `dari_for_period`, `smart_quotes`, all on by default. |
| `Composer` | For marked-text hosts. `key()` (with an optional text before the caret), `backspace()`, `flush()` and `reset()` return an `Update { commit, pending, handled }`: replace the pending text with `commit`, then show `pending` as the new pending text. Text committed earlier is never changed. `matches_text_before_caret()` tells a real caret move from an app that reports the caret late. |
| `transpile_roman_document(text, preserve_line_breaks)` | Whole-document conversion (`_with_config` for the toggles). |
| `ends_with_kar_taking_consonant`, `ends_with_consonant_and_chandrabindu` | What the text before the caret allows a vowel to do. |
| `data` | The lookup tables. |

## Engine vs. Composer

`Engine` rewrites recent output freely. `Composer` adapts it to hosts that can only change their
own marked (pending) text, which is all that every host supports: it keeps the whole Bengali word
being typed pending and never asks a host to change committed text.

| Behaviour | `Engine` | `Composer` |
|---|---|---|
| Pending text | the `buffer`: the cluster the next key may rewrite | the Bengali word being typed, which contains the buffer |
| Backspace with pending text | deletes the last letter (`দ্ম` → `দ`) and resumes the cluster before it | deletes the last letter of the pending word and ends the cluster, so the next consonant starts a new letter (`কা`, Backspace, `k` → `কক`) |
| Backspace with nothing pending | the same | not handled: the host deletes, and the composer resets |
| After a reset or a caret move | `resume_cluster()` makes the consonant run before the caret the cluster | no cluster is resumed; a vowel still attaches as a kar to the text before the caret |
| A rule that rewrites text before the pending text (`-` after `-`) | rewrites it | applies as if the word started at the caret |
| Enter | `SplitBlock` action | flushes and reports the key as not handled, so the application inserts its own newline |
| A lone `-` or `।` | output | held as pending, because the next key may rewrite it (`--` → `—`, `।.` → `..`) |

## Tests

```sh
cargo test -p druti-core   # golden fixtures, data tables, composer scenarios, host models and invariants
```

See [`tests/fixtures/README.md`](tests/fixtures/README.md) for the fixture formats and how to
change them.
