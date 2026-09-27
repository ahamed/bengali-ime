# bengali-ime-core

Rust port of the TypeScript `@ahamed/bengali-ime` engine (phonetic roman → Bengali), plus the
`Composer` adapter that native input methods use. The TypeScript engine in `src/` is the
reference: `fixtures/engine/` is generated from it (`yarn fixtures`) and `cargo test` replays every
fixture, so the two engines cannot drift apart unnoticed.

## API

| Item | Purpose |
|---|---|
| `Engine` | Port of `BengaliIME`: `process(key, text_before_caret)`, `process_backspace()`, `toggle_english_mode()`, `set_output()` (resync), `output()`, `buffer()`. Returns `Action`s (`Insert`, `Replace`, `Delete`, `SplitBlock`), with back counts in UTF-16 code units. |
| `Config` | Output toggles: `bengali_digits`, `dari_for_period`, `smart_quotes`. `Config::default()` equals the TypeScript engine. |
| `Composer` | For marked-text hosts. `key()`, `backspace()`, `flush()` and `reset()` return an `Update { replace_before, commit, pending, handled }`: delete `replace_before` UTF-16 units before the pending text, replace the pending text with `commit`, then show `pending` as the new pending text. |
| `transpile_roman_document(text, preserve_line_breaks)` | Port of `transpileRomanDocument`. |
| `ends_with_kar_taking_consonant`, `ends_with_consonant_and_chandrabindu` | Port of `vowel-attach-context.ts`. |
| `data` | The lookup tables of `bengali-ime-data.ts`. |

## Where Rust intentionally differs from TypeScript

The differences live in `Composer` and `Config`; `Engine` with the default `Config` matches the
TypeScript engine exactly.

| Behaviour | TypeScript engine | Rust |
|---|---|---|
| Backspace with pending text | undoes the last keystroke | `Composer::backspace` removes the last grapheme cluster of the pending text and ends the cluster (`Engine::process_backspace` keeps the TS behaviour) |
| Backspace with nothing pending | undoes the last keystroke | not handled: the host application deletes, and the composer resets |
| Enter | `splitBlock` action | `Composer::key("Enter")` flushes and reports the key as not handled, so the application inserts its own newline |
| A lone `-` or `।` | committed | held as pending, because the next key may rewrite it (`--` → `—`, `।.` → `..`) |
| Output toggles | none | `Config` (all on by default) |

## Tests

```sh
yarn fixtures   # regenerate fixtures/engine from the TypeScript engine
cargo test      # parity fixtures, data tables, composer scenarios and invariants
```

`fixtures/composer/` is written by hand from the `ime-composer` spec in
`openspec/changes/add-macos-input-source/`.
