# Tasks

## 1. Engine rules (Linux)

- [ ] 1.1 In `crates/druti-core/src/engine.rs` `process_consonant`, write a consonant after a buffer ending in `র` without a hasant, restarting the buffer with it (design D1). Verify with new `engine/unit.json` cases for the "Infinitive", "Former reph spelling" and "র-ফলা is unchanged" scenarios.
- [ ] 1.2 Add the `r`-after-`র` arming rule in `rules.rs`: insert `্`, keep it in the buffer, and let the next consonant follow it (design D2). Verify with `engine/unit.json` cases for "Reph appears as the consonant is typed" (actions and output after every key), "Aspiration after reph", "Reph before a conjunct", "Third r" and "Armed reph at a word break".
- [ ] 1.3 Change `rules::rassaw_ri` to read an armed `র্` instead of `র্র`, and remove the hasant before any other vowel in `process_vowel` (design D3). Verify with `engine/unit.json` cases for "Vowel sign on র", "Silent o after double r", "Independent ঋ" and "ঋ-kar".
- [ ] 1.4 Make `y` after an armed `র্` append `য` (design D4). Verify with `engine/unit.json` cases for "য-ফলা without doubling", "য-ফলা after double r" and "The letter য".
- [ ] 1.5 Update doc comments for the changed rules, citing "rr-reph design D1–D4". Verify that `cargo clippy --all-targets -- -D warnings` and `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --workspace` are clean.

## 2. Golden fixtures (Linux)

- [ ] 2.1 Regenerate the affected cases in `engine/unit.json`, `engine/words.json`, `engine/random.json` and `engine/transpile.json`, using a one-off script kept out of the repo. The script must fail if any case without `r` + consonant key or `rr` would change. Verify that `cargo test -p druti-core` passes. Check that `git diff --stat` lists only those four files and that the changed case count matches the design (about 5 / 18 / 201 / 9).
- [ ] 2.2 Add `engine/words.json` entries for the curated words in the specs (`korte`, `korbo`, `korlam`, `korchi`, `dorkar`, `korrta`, `orrtho`, `dhorrmo`, `porrzonto`, `poryonto`, `bryanD`, `karryo`, `rrin`, `krriShi`, `brriShTi`). Add `engine/transpile.json` cases, for example `ami kaj korte cai, korrtar kotha Suni` → `আমি কাজ করতে চাই, কর্তার কথা শুনি` and `korrta korte`. Verify that `word_fixtures` and `transpile_fixtures` pass.

## 3. Composer (Linux)

- [ ] 3.1 Add `composer/backspace.json` cases for the four "Armed reph in the pending word" scenarios. Verify that `cargo test -p druti-core --test composer` passes with no change to composer code.
- [ ] 3.2 Run `tests/hosts.rs` on the regenerated `random.json` and add a `korrta` + Backspace script. Verify that the playground, Mac and terminal models show identical text.

## 4. Bindings and hosts (Linux, then Mac)

- [ ] 4.1 Run `cargo test -p druti-ffi -p druti-wasm` and the WASM clippy target (Linux). Verify that the parity tests pass with no binding changes.
- [ ] 4.2 Run `make -C macos test`, including under Rosetta (Mac). Verify that it passes with no Swift changes.
- [ ] 4.3 Manually type `korte`, `korrta`, `korr` + Backspace + `t` and `krriShi` in TextEdit and one Chromium-based app with `make -C macos app` (Mac). Verify the results match the spec scenarios and record them in the PR.

## 5. Documentation and release (Linux, then Mac)

- [ ] 5.1 Rewrite the hasant and reph part of `README.md` "How typing works": single `r` never forms reph, `rr` does (shown as `কর্`), a vowel cancels it, `rri` is ঋ, `y` is য-ফলা and `z` is য. Update the `rri` note in `docs/macos-input-source.md`. Verify that every example in the docs matches a fixture.
- [ ] 5.2 Write the 2.0.0 release notes, with a table from old to new spellings (`korta` → `korrta`, `dhormo` → `dhorrmo`, `korote` → `korte`). Bump the version in `macos/project.yml` (Mac: verify that `make -C macos version` prints 2.0.0).
- [ ] 5.3 Run the full CLAUDE.md command list: fmt, clippy (native and WASM), tests, docs, MSRV, and the Swift targets on the Mac. Verify there are no warnings or failures.
