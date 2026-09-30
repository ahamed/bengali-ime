## 1. Tests first (red)

- [x] 1.1 Add `crates/druti-core/tests/hosts.rs`: model the playground, a Mac app with text access and a terminal; type the reported scripts (`podmo`, `ekoTa podmo`, `korote` with Backspaces, `ka` + Backspace + `k`, caret moves, committed text) and the seeded random key and Backspace sequences; require the same text in every host (design D6). Run it against the old core and see it fail
- [x] 1.2 Rewrite the composer fixtures (`split`, `hold`, `backspace`, `context`, `config`) to the delta scenarios, drop `replaceBefore` from their expectations, and update `tests/composer.rs`: the random property checks the pending word; consonants don't read the document; the caret-check test ends its words with a space. See them fail against the old core

## 2. Core (green)

- [x] 2.1 In `letters.rs`, add `trailing_word_len_utf16` with unit tests (design D1)
- [x] 2.2 In `Composer`, keep the word being typed pending, hold `-` / `।` as before, and drop `replace_before` from `Update` (design D1, D2)
- [x] 2.3 Replay a key with only the pending text as context when its actions would reach committed text (design D2)
- [x] 2.4 Make `backspace()` take no text: remove the last letter of the pending text and end the cluster; with nothing pending, reset and report not handled (design D2, D3)
- [x] 2.5 Stop resuming the cluster on reset or on the first key; drop consonants and `^` from `key_reads_document`; remove the unused `is_consonant_key` (design D3)
- [x] 2.6 Keep context supplied with a key as the engine's output (design D5), with a test that fails without it
- [x] 2.7 Run `cargo fmt --all`, `cargo clippy --all-targets -- -D warnings`, `cargo test --all`, the doc build with `-D warnings`, the WASM clippy and the MSRV check

## 3. Bindings and hosts

- [x] 3.1 In `druti-ffi` and `druti-wasm`, drop `replace_before` / `replaceBefore` and the `backspace` argument with the same docs, and update both parity tests
- [x] 3.2 In `examples/playground/src/editor.ts`, apply updates without a replacement, call `backspace()`, and update the comments; rebuild and check `ka` + Backspace + `k`, `podmo` + Backspace and `korote` + three Backspaces in the browser
- [x] 3.3 In `macos/Druti/InputController.swift`, apply updates without replacement ranges, call `backspace()`, keep the text-confirmed caret-move check (design D4), and remove the temporary debug logging
- [x] 3.4 Update `BengaliIMECoreTests.swift` for the new behaviour; run `make -C macos format`, `make -C macos lint`, `make -C macos test` and `make -C macos app` with zero warnings

## 4. Docs

- [x] 4.1 Update `README.md`, `crates/druti-core/README.md`, `macos/README.md` and `docs/macos-input-source.md`: the word being typed stays pending, Backspace edits it and otherwise goes to the app, a consonant after Backspace or a caret move starts a new letter, and the composer never changes committed text

## 5. Manual checks (Mac)

- [ ] 5.1 Install with `make -C macos install`. In TextEdit, Notes, Safari, Chrome, Cursor, Slack and the Claude app, check: `podmo` + Backspace → `পদ`; `ekoTa podmo` → `একটা পদ্ম`, then Backspace → `একটা পদ`; `korote` + three Backspaces → `ক`; `ka` + Backspace + `k` → `কক`; Backspace after a space deletes the space; a click after `কর` in `করতে` then `i` → `করিতে`
- [ ] 5.2 In Terminal and iTerm2, check that typing and Backspace work, and Backspace with nothing pending deletes as usual
