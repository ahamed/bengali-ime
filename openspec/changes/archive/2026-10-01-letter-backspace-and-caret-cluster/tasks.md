## 1. M1: Letters and resume in the engine (Linux)

- [x] 1.1 Add the private module `crates/druti-core/src/letters.rs` with `last_letter_len_utf16` and `trailing_consonant_run_len_utf16` (design D1), plus module docs. Unit-test the edge cases fixtures can't express directly: a decomposed nukta, a lone hasant, a surrogate pair, and an emoji with a skin tone
- [x] 1.2 Add `Engine::resume_cluster` (design D3) with docs. Add a `resume` step (`{"resume":1}`) to the replay harness in `tests/fixtures.rs` and to `tests/fixtures/README.md`. Add `unit.json` cases for the rust-engine-core "Resuming the cluster from the output" scenarios (`করত` + `h`, `দ` + `m`, `এন্ত`, `কি`, `বাং`, `kom`). Proven by `cargo test -p druti-core --test fixtures`
- [x] 1.3 Rewrite `Engine::process_backspace` as letter deletion followed by resume (design D2). Remove the undo machinery (`UndoEntry`, the undo stack and constants, `touched_from`, `output_assigned`, `restore`, `delete_last_code_point`, `delete_tail`), and update the `set_output` docs
- [x] 1.4 Update the three `backspace …` cases in `engine/unit.json` by hand, and add cases for the "Letter backspace" scenarios (`kkh`, `dm`, `kh`, `ন্ত্র` via `set`, `korote` + 3×bs, `ko`, `dm` bs `h`, `ক্ত` via `set`, `ক👍🏽` via `set`, empty). Proven by `cargo test -p druti-core --test fixtures`
- [x] 1.5 Regenerate every `engine/random.json` case that contains a `bs` step with a one-off program kept in the scratchpad, not committed (design D10). It rewrites `a`/`o`/`b` and asserts that cases without `bs` come out byte-identical. Check that `words.json` and `transpile.json` are untouched (`git diff --stat` shows only `random.json` and `unit.json` under `engine/`)

## 2. M2: Composer (Linux)

- [x] 2.1 Extract the shared replay-and-split code into `Composer::apply_actions`. Make the pending text always cover the whole engine buffer, prepending the resumed prefix and adding it to `replace_before` (design D5), with a `debug_assert!` that this only happens while nothing is pending
- [x] 2.2 Add the `resume_on_next_key` flag and wire `reset(Some)` / `reset(None)` / `key()` as in design D4. Add the ime-composer "Resuming the cluster before the caret" scenarios to `composer/context.json`, and check that its existing cases still pass unchanged
- [x] 2.3 Change `Composer::backspace` to take `text_before_caret: Option<&str>` and implement the three branches of design D6. Rewrite `composer/backspace.json` from the "Letter backspace" scenarios, and teach `tests/composer.rs` `ctx` on `backspace` steps. Proven by `cargo test -p druti-core --test composer`
- [x] 2.4 Add `is_consonant_key` and extend `Composer::key_reads_document` (design D7). Add the "Consonant keys read the document" scenario as a Rust unit test in `tests/composer.rs`, since the fixture format has no step for it
- [x] 2.5 Check that `composer_invariants_over_random_sequences` still passes unchanged: normal typing never rewrites committed text

## 3. M3: Bindings (Linux)

- [x] 3.1 `druti-ffi`: `backspace(text_before_caret: Option<String>)` with a UniFFI default of `None` (design D8), with docs mirroring the core. Extend `same_updates_as_the_core_composer` with a Backspace that has context. If the default isn't supported on a method, switch both bindings to the `backspace_with_context` fallback
- [x] 3.2 `druti-wasm`: `backspace(textBeforeCaret?)` with mirrored docs. Extend its `same_updates_as_the_core_composer` the same way. Verify with `cargo clippy -p druti-wasm --target wasm32-unknown-unknown -- -D warnings`
- [x] 3.3 Run the full Rust checks from CLAUDE.md: `cargo fmt --all`, `cargo clippy --all-targets -- -D warnings`, `cargo test --all`, `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --workspace`, and `cargo +1.91 check --workspace --all-targets --all-features`

## 4. M4: Playground (Linux build, browser check)

- [x] 4.1 In `examples/playground/src/editor.ts`, pass `this.text.slice(0, this.caret)` to `composer.backspace` (design D9). Verify that `yarn build` in `examples/playground` type-checks
- [x] 4.2 In the browser preview, check every changed web-playground scenario: `dm` + Backspace → underlined `দ`; `korote` + Backspace ×3 → `করত`, `কর`, `ক`; committed `দ্ম` + Backspace → `দ`; caret after `র` in `করতে` + `i` → `করিতে`; caret at the end of `করত` + `h` → `করথ`; `k`, click after a space, `h` → `হ`
- [x] 4.3 Ignore modifier keys pressed on their own in `editor.ts`. Shift used to commit and reset, and the reset then resumed `ক` from the document, so `ekoTa` gave `এক্টা`. Verified in the preview with a real Shift keydown: `ekoTa` → `একটা`, `ekola` → `একলা`

## 5. M5: Docs and the Mac build check (Linux docs, Mac build)

- [x] 5.1 Update the "How typing works" section of `README.md` (Backspace removes one letter; the caret continues the cluster before it), the `bs` row in `tests/fixtures/README.md`, and the `Composer`/`Engine` rustdoc
- [x] 5.2 (Mac) Run `make -C macos test`, `make -C macos lint` and `make -C macos app` to confirm the Swift code builds and passes against the new bindings (the default argument keeps `composer.backspace()` compiling). The one Swift test assertion that pinned `k` as not reading the document is flipped, as agreed with the user
