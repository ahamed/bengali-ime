# druti-core

Druti's phonetic roman → Bengali engine, plus the `Composer` adapter that input methods use. This
is the only implementation of the algorithm: the macOS input method uses it through `druti-ffi`,
and the web playground through `druti-wasm`. Its behaviour is pinned by the golden fixtures in
`tests/fixtures/`.

## API

| Item | Purpose |
|---|---|
| `Engine` | Keystroke engine: `process(key, text_before_caret)`, `process_backspace()`, `toggle_english_mode()`, `set_output()` (resync), `output()`, `buffer()`. Returns `Action`s (`Insert`, `Replace`, `Delete`, `SplitBlock`), with back counts in UTF-16 code units. |
| `Config` | Output toggles: `bengali_digits`, `dari_for_period`, `smart_quotes`, all on by default. |
| `Composer` | For marked-text hosts. `key()`, `backspace()`, `flush()` and `reset()` return an `Update { replace_before, commit, pending, handled }`: delete `replace_before` UTF-16 units before the pending text, replace the pending text with `commit`, then show `pending` as the new pending text. |
| `transpile_roman_document(text, preserve_line_breaks)` | Whole-document conversion (`_with_config` for the toggles). |
| `ends_with_kar_taking_consonant`, `ends_with_consonant_and_chandrabindu` | What the text before the caret allows a vowel to do. |
| `data` | The lookup tables. |

## Engine vs. Composer

`Engine` rewrites recent output freely. `Composer` adapts it to hosts that can only change their
own marked (pending) text:

| Behaviour | `Engine` | `Composer` |
|---|---|---|
| Backspace with pending text | undoes the last keystroke | removes the last grapheme cluster of the pending text and ends the cluster |
| Backspace with nothing pending | undoes the last keystroke | not handled: the host application deletes, and the composer resets |
| Enter | `SplitBlock` action | flushes and reports the key as not handled, so the application inserts its own newline |
| A lone `-` or `।` | output | held as pending, because the next key may rewrite it (`--` → `—`, `।.` → `..`) |

## Tests

```sh
cargo test -p druti-core   # golden fixtures, data tables, composer scenarios and invariants
```

See [`tests/fixtures/README.md`](tests/fixtures/README.md) for the fixture formats and how to
change them.
