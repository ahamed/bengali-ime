## Why

Bengali spelling often leaves out the inherent vowel between two consonants without writing a hasant:
করতে is spoken /kɔrte/ but written with no hasant. Druti joins every consonant typed after a
consonant, so `korte` gives `কর্তে`, `dekhte` gives `দেখ্তে`, and `kolomTa` gives `কলম্টা`. People type
these words the way they say them, so today they must remember to add an `o` (`korote`) that they
neither say nor write. `korta` must still give `কর্তা`, so the fix can't simply stop joining.

The difference between `korte` and `korta` is only the last vowel, and between `korte` (করতে) and
`Sorte` (শর্তে) only the first consonant. `porbo` is two real words (পর্ব and পরব). So no rule that
looks only at the roman letters can decide. The engine needs a small, fixed piece of knowledge about
Bengali, applied the same way every time. It must not offer suggestions or learn from the user, as
Avro's dictionary does.

## What Changes

- New output setting **smart hasant**, off by default (so all current output is unchanged). When it is
  on, the Bengali word being typed is resolved after every key by two fixed rules, and only ever loses
  hasants that plain Druti would have written:
  - **Real conjuncts only.** Two consonants stay joined only if Bengali spelling has that conjunct
    (`দেখ্তে` → `দেখতে`, `কলম্টা` → `কলমটা`). Reph (`র্`) and the `য`/`র`/`ব` folas always stay.
  - **Verb endings.** A whole word made of a verb root and a consonant-initial inflection is written
    without the hasant between them (`korte` → `করতে`, `korbo` → `করব`, `korchilo` → `করছিল`). `korta`,
    `kortar`, `Sorte` and `rokte` are not verb forms and keep their conjuncts.
- New **join key** `` ` `` (backtick), while smart hasant is on: typed between two consonants it keeps
  the hasant, so the noun reading of a collision is reachable (`por`bo` → `পর্ব`, while `porbo` → `পরব`).
  A second backtick types a literal one.
- `o` still always separates two consonants (`korote` → `করতে`), with the setting on or off.
- The output is a fixed function of the keys and the settings: the same keys always give the same
  text, with no candidates, no history and no per-user data. The rule tables ship in `druti-core` and
  are pinned by fixtures.
- Hosts get the setting: a checkable item in the macOS input menu (persisted), a playground toggle,
  and the `Config` record in both bindings. Bulk conversion and Convert selection apply it.

## Capabilities

### New Capabilities
- `conjunct-resolution`: when two consonants typed one after the other are joined by a hasant and
  when the inherent vowel between them is left unwritten. Covers the attested-conjunct rule, the
  verb-inflection rule, the join key, `o` as a separator, and determinism.

### Modified Capabilities
- `ime-composer`: "Output toggles" gains the smart hasant setting; "Commit and pending split" states
  that, with it on, committed and pending text are the resolved form of the engine's output.
- `rust-engine-core`: "Bulk transpilation" resolves each word when smart hasant is on.
- `macos-input-source`: "Input menu" gains the smart hasant item.
- `web-playground`: "Playground settings toggles" gains the smart hasant toggle; the WASM default
  settings scenario names the new setting.

## Impact

- **Rust**:
  - `druti-core`: `Config` gains `smart_hasant`. The composer and bulk conversion get a crate-private
    word resolver and the backtick join key.
  - `data` gains three public tables (attested conjunct pairs, verb roots, verb inflections), which
    are compared with `tests/fixtures/engine/data.json`.
  - The `Engine` and its keystroke fixtures do not change.
- **Bindings**: `druti-ffi` and `druti-wasm` `Config` gain `smart_hasant` / `smartHasant`, with their
  parity tests. Swift code that builds a `Config` adds the field.
- **Swift**: `Settings` (a new persisted key, default off) and the `InputController` menu.
- **Playground**: a new toggle in `examples/playground/`.
- **Fixtures**:
  - new composer cases with the setting on;
  - new transpile cases with the setting on;
  - a new resolver word list.
  - Existing fixtures do not change.
- **Docs**: the "How typing works" section of `README.md`, `crates/druti-core/README.md`, and
  `docs/macos-input-source.md`.
