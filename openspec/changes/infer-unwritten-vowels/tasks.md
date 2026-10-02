# Tasks

## 1. Rule tables (Linux)

- [ ] 1.1 Add `ATTESTED_CONJUNCT_PAIRS`, `VERB_ROOTS` and `VERB_INFLECTIONS` to `crates/druti-core/src/data.rs` with doc comments (design D3, D4), writing nukta letters as `\u{...}` escapes; verify `cargo doc` with `-D warnings` is clean.
- [ ] 1.2 Add the three tables to `tests/fixtures/engine/data.json` and to `data_tables_match_golden` in `tests/fixtures.rs`; verify `cargo test -p druti-core data_tables_match_golden` passes.
- [ ] 1.3 Have the author review both lists (design, Open Questions) and record the review in the PR description; verify every prototype word in 2.2 still resolves as expected after any edits.

## 2. Resolver (Linux)

- [ ] 2.1 Add a crate-private `resolve` module: a pure function from a plain word in UTF-16, plus protected join indices, to the resolved word. It removes only hasants: rule 1 (pairs, reph, folas) and rule 2 (whole word = root + hasant + inflection + optional ই/ও). Verify with unit tests named as sentences, for example `resolution_never_adds_or_reorders_characters`.
- [ ] 2.2 Add `tests/fixtures/resolve/words.json` (`{ roman, plain, resolved }`) with the prototype's 96 words and every resolution example in the conjunct-resolution spec, plus a runner in `tests/fixtures.rs`. Document the file in `tests/fixtures/README.md`. Verify the new test passes and that each `plain` equals today's `transpile_roman_document` output.

## 3. Setting and composer (Linux)

- [ ] 3.1 Add `Config::smart_hasant` (default `false`), documented as applied by the composer and bulk conversion and ignored by `Engine`. Verify all existing fixtures pass unchanged (`cargo test --all`).
- [ ] 3.2 Make the composer keep the plain pending word, report and commit `resolve(plain)`, re-resolve after every key, Backspace and setting change, and pass committed text + plain pending word as the engine's context (design D2). Verify with new `tests/fixtures/composer/smart-hasant.json` cases for the "Resolution only removes hasants", "Only real conjuncts stay joined", "Verb inflections are not joined to their root", "The word is re-resolved after every key" and "`o` always separates" scenarios, and the ime-composer "Commit and pending split" and "Output toggles" scenarios. Replay them from `tests/composer.rs` after extending `ConfigPatch` with `smartHasant`.
- [ ] 3.3 Add the backtick join key to the composer (design D5): arming, the protected join, dropping the mark on a non-consonant key or on Backspace, and a literal second backtick. Verify with `composer/smart-hasant.json` cases for the "Join key keeps a conjunct" and "Literal backtick" scenarios.
- [ ] 3.4 Make `matches_text_before_caret` compare with the resolved output. Verify with a test in `tests/composer.rs` for the "Resolved word in the document" scenario.
- [ ] 3.5 Add property tests to `tests/composer.rs`. Over `random.json`, with the setting on, every update's `pending` and the joined commits equal the resolved form of the setting-off run. Two fresh composers with the same keys give identical updates. Verify both tests pass.
- [ ] 3.6 Run the hosts model with the setting on in `tests/hosts.rs`. The playground, the Mac with text access, and the terminal must show identical text over the random sequences and for the `korte` + Backspace script. Verify the test passes.

## 4. Bulk conversion (Linux)

- [ ] 4.1 Apply resolution word by word in `transpile_roman_document_with_config`, with the same backtick handling, when `smart_hasant` is on. Verify with new `engine/transpile.json` entries for the three new rust-engine-core scenarios; extend the transpile case format and runner with a `smartHasant` option.

## 5. Bindings (Linux)

- [ ] 5.1 Add `smart_hasant` to the `druti-ffi` `Config` record and its `From` conversions, and update the `default_config` doc ("every option on" is no longer true). Verify the ffi parity test passes.
- [ ] 5.2 Add `smartHasant` to the `druti-wasm` `Config` and its conversions, and extend the default-settings test. Add a test for the "Smart hasant in the browser" scenario that compares with `druti_core`. Verify `cargo test -p druti-wasm` and the WASM clippy target from CLAUDE.md pass.

## 6. Playground (Linux)

- [ ] 6.1 Add an unchecked "Smart hasant" toggle in `examples/playground/` that sets `config.smartHasant` for the editor and the bulk panel. Verify by building the playground and typing `korte` with the toggle on (shows `করতে`) and off (shows `কর্তে`).

## 7. macOS input source (Mac)

- [ ] 7.1 Add `.smartHasant` to `Settings` (persisted, default off) and a checkable input-menu item in `InputController`. Update the `Config(...)` call in `BengaliIMECoreTests`. Verify `make -C macos format`, `make -C macos lint` and `make -C macos test` pass.
- [ ] 7.2 Add a Swift Testing case in `BengaliIMECoreTests` showing that a composer created with `smartHasant: true` commits `করতে ` for `korte` + space. Verify `make -C macos test` passes, including under Rosetta.
- [ ] 7.3 Manually check the "Turning on smart hasant" and "Upgrading keeps smart hasant off" scenarios in TextEdit and one Chromium-based app with `make -C macos app`. Record the result in the PR.

## 8. Documentation and integration (Linux)

- [ ] 8.1 Document the setting in `README.md` "How typing works": the two rules, `o` to separate, `` ` `` to join, and the collision list (পর্ব, সর্ব, চর্বি). Also update the `Config` row in `crates/druti-core/README.md` and the `Config` struct in `docs/macos-input-source.md`. Verify every example in the docs matches `resolve/words.json`.
- [ ] 8.2 Run the full CLAUDE.md command list: fmt, clippy (native and WASM), tests, docs, MSRV, and the Swift targets on the Mac. Verify there are no warnings and that no existing `engine/` or `composer/` fixture changed (`git diff --stat` shows only additions to fixtures).
