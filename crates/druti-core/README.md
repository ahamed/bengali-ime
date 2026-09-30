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
| `Composer` | For marked-text hosts. `key()`, `backspace()` (both with an optional text before the caret), `flush()` and `reset()` return an `Update { replace_before, commit, pending, handled }`: delete `replace_before` UTF-16 units before the pending text, replace the pending text with `commit`, then show `pending` as the new pending text. |
| `transpile_roman_document(text, preserve_line_breaks)` | Whole-document conversion (`_with_config` for the toggles). |
| `ends_with_kar_taking_consonant`, `ends_with_consonant_and_chandrabindu` | What the text before the caret allows a vowel to do. |
| `data` | The lookup tables. |

## Engine vs. Composer

`Engine` rewrites recent output freely. `Composer` adapts it to hosts that can only change their
own marked (pending) text:

| Behaviour | `Engine` | `Composer` |
|---|---|---|
| Backspace with pending text | deletes the last letter (`দ্ম` → `দ`) and resumes the cluster before it | the same, on the pending text; the resumed cluster stays pending |
| Backspace with nothing pending | the same | with text before the caret ending in Bengali: deletes that letter through `replace_before`; otherwise not handled (the host deletes) and the composer resets |
| After a reset or a caret move | `resume_cluster()` makes the consonant run before the caret the cluster | resumes from the text before the caret, so `h` after `ত` gives `থ` |
| Enter | `SplitBlock` action | flushes and reports the key as not handled, so the application inserts its own newline |
| A lone `-` or `।` | output | held as pending, because the next key may rewrite it (`--` → `—`, `।.` → `..`) |

## Tests

```sh
cargo test -p druti-core   # golden fixtures, data tables, composer scenarios and invariants
```

See [`tests/fixtures/README.md`](tests/fixtures/README.md) for the fixture formats and how to
change them.
