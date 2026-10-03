## Why

Bengali spelling often leaves the inherent vowel between two consonants unwritten, without a hasant:
করতে is spoken /kɔrte/. Druti joins every consonant typed after `r` into a reph, so `korte` gives
`কর্তে`, `korbo` gives `কর্ব`, and `dorkar` gives `দর্কার`. To get the right word, people must type an
`o` they neither say nor write (`korote`, `korobo`, `dorokar`).

Reph and the unwritten vowel sound the same (কর্তা /kɔrta/, করতে /kɔrte/), so no rule can tell them
apart from the letters alone. A rule that waits for later keys, or that uses a word list, changes text
already on screen (`কর্তা` → `করতাম`). The typist then has to re-read every word, which defeats fast
typing from muscle memory. So the typist has to mark one of the two readings, and the mark should go
on the less frequent one.

In a 2.4-million-word Bengali corpus (subtitles, close to everyday writing), র followed directly by a
consonant mid-word is a reph in 40,825 tokens and an unwritten vowel in 67,306. These include the most
common verb forms in the language: করতে, করবে, করছি, পারবে, দরকার.

## What Changes

- **BREAKING** A single `r` never joins the consonant after it: `korte` → `করতে`, `korbo` → `করব`,
  `korlam` → `করলাম`, `dorkar` → `দরকার`. A র typed after another consonant (র-ফলা: `pr` → `প্র`)
  is unchanged.
- **BREAKING** Reph is typed as `rr`. The second `r` shows a hasant right away (`korr` → `কর্`), and
  the next consonant completes the reph without changing any letter: `korrta` → `কর্তা`, `orrtho` →
  `অর্থ`, `dhorrmo` → `ধর্ম`.
- A vowel after `rr` cancels the reph: `korra` → `করা`, `korro` → `কর`. The exception is `i`, which
  keeps making ঋ / ঋ-kar as today: `rrin` → `ঋণ`, `krriShi` → `কৃষি`.
- `y` after `r` is still য-ফলা (`poryonto` → `পর্যন্ত`). Only `z` is the letter য, and it follows the
  `r` rule like any consonant (`porzonto` → `পরযন্ত`, `porrzonto` → `পর্যন্ত`).
- `o` still separates consonants everywhere (`korote` → `করতে`), so the old spellings that use `o`
  keep working.
- This becomes the default and only behaviour, with no setting. It ships as Druti 2.0.0. It
  deliberately overrides the project rule that new behaviour defaults to the current one: these are
  core typing rules, and two algorithms would split users' muscle memory.
- Every decision is made by the key being typed, using only the letters since the last vowel. Text
  before the last vowel never changes.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `rust-engine-core`: new requirements for when `r` joins: a single `r` never forms reph; `rr` forms
  reph; a vowel after `rr`; ঋ from `rr` + `i`; য-ফলা after `r`.
- `ime-composer`: a new requirement for the armed reph in the pending word (Backspace and committing).

## Impact

- **Rust**: `druti-core`, in `engine.rs` (`process_consonant`, `process_vowel`) and `rules.rs`
  (`rassaw_ri` now reads `র্`, not `র্র`; a new rule for `r` after `r`). The public API and the
  bindings don't change.
- **Fixtures**: the engine fixtures that type `r` before a consonant key, or `rr`. That is 5 unit
  cases, 18 curated words, 201 of the 2,400 random sequences, and 9 bulk conversion cases. Each is
  updated in the same commit as the engine change. No other fixture changes.
- **Hosts**: no code changes in Swift or TypeScript. Both pick up the new engine.
- **Docs**: the "How typing works" section of `README.md`, the `rri` note in
  `docs/macos-input-source.md`, and release notes with a table from old to new spellings.
- **Release**: Druti 2.0.0 (`macos/project.yml`).
- **Follow-up, not in this change**: consonant pairs that never form a conjunct stop joining (`dekhte`
  → `দেখতে`, `kolomTa` → `কলমটা`). It needs its own reviewed conjunct table.
