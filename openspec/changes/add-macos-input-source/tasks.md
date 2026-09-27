# Tasks

## 1. M0 — Parity fixtures from the TS engine (Linux)

- [x] 1.1 Move the key/expected inputs used by `src/__tests__/*.test.ts` into a shared case list (`src/__tests__/cases.ts`) that the vitest files import, and verify `yarn test` still passes with the same test count (148)
- [x] 1.2 Add `tsx` as a dev dependency and `scripts/gen-fixtures.ts`, which writes `fixtures/engine/unit.json` from the shared cases (per-key actions, output and buffer, with optional `textBeforeCaret`). Verify by running `yarn fixtures` twice and seeing no diff the second time
- [x] 1.3 Add `fixtures/engine/words.json` from a curated roman word/sentence list (conjuncts, `rri`, `Oi`/`OU`, nasals, ya-phala, digits, punctuation, `--`, quotes) and verify it contains an entry for each of those categories
- [x] 1.4 Add `fixtures/engine/random.json` (fixed seed, full key alphabet, with and without `textBeforeCaret`, including conjunct-ending contexts such as `ক্ষ` and `ন্ত`), capped at a few thousand compact one-line cases. Verify the file stays under 2 MB and regenerates identically
- [ ] 1.5 Add a `fixtures` job step to `.github/workflows/ci.yml` that regenerates the fixtures and runs `git diff --exit-code fixtures/`. Verify it by pushing a branch with a deliberately stale fixture and seeing it fail, then reverting

## 2. M1 — Rust engine port (Linux)

- [x] 2.1 Create the Cargo workspace (`Cargo.toml`, `crates/bengali-ime-core`) with a fixture-replay test harness that loads `fixtures/engine/*.json` and reports the first mismatching key per case. Verify `cargo test` runs and reports every fixture as failing, since there is no engine yet
- [x] 2.2 Port `bengali-ime-data.ts` to `data.rs` (tables, symbol maps, grapheme sets) and verify with a unit test that the table sizes and a sample of entries match the TS exports
- [ ] 2.3 Port `vowel-attach-context.ts` using a pinned `unicode-segmentation`, and verify the Rust equivalents of all 9 cases in `vowel-attach-context.test.ts` pass, plus the conjunct-context entries in `fixtures/engine/random.json`
- [ ] 2.4 Port `Engine` (state, `process`, `process_backspace`, append/replace/pop helpers, UTF-16 back counts) with consonant, vowel, number, punctuation and word-boundary paths, and verify the non-rule cases of `fixtures/engine/unit.json` pass
- [ ] 2.5 Port the Akkhar rules in TS order (`Kkhiyo`, `Ho`, `KhandaTo`, `JaFala`, `AspiratedConsonant`, nasal connectors, `RassawRI`, `Oi`, `Ou`) and verify all of `fixtures/engine/unit.json` and `words.json` pass
- [ ] 2.6 Port `transpileRomanDocument` to `transpile_roman_document` and verify its fixture cases, including the multi-line document from `transpile-roman-document.test.ts`
- [ ] 2.7 Verify `fixtures/engine/random.json` passes in full. If grapheme segmentation disagrees on conjuncts, apply design D3's fallback and add a comment and a fixture naming the case
- [ ] 2.8 Add a `rust` job to `.github/workflows/ci.yml` (`cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`) and verify it passes on the branch

## 3. M2 — Composer and config (Linux)

- [ ] 3.1 Add `Config` (Bengali digits, দাঁড়ি for `.`, smart quotes; default = TS behaviour) to `Engine`, and verify all engine fixtures still pass with the default plus new `fixtures/composer/config.json` cases for each toggle turned off
- [ ] 3.2 Implement `Composer::key` with the commit/pending split and `Update { replace_before, commit, pending, handled }`, and verify the "Commit and pending split" scenarios in `fixtures/composer/split.json`
- [ ] 3.3 Implement dash holding and `replace_before` for engine rewrites before the committed boundary, and verify the "Dash holding" and "Rewriting text outside the composer" scenarios in `fixtures/composer/dash.json`
- [ ] 3.4 Implement the context fallback (host text, else the composer's own output) and `reset(Option<context>)` / `flush()`, and verify the "Document context with fallback" and "Flush and reset" scenarios in `fixtures/composer/context.json`
- [ ] 3.5 Implement grapheme Backspace (last extended grapheme of the pending text, engine buffer emptied, `handled = false` when nothing is pending), and verify the "Grapheme backspace in pending text" scenarios in `fixtures/composer/backspace.json`
- [ ] 3.6 Add a property test that replays every `random.json` sequence through the composer, asserting committed + pending == engine output and `replace_before == 0` when no host context was supplied. Verify it passes under `cargo test`
- [ ] 3.7 Document the Rust crate API and the intentional TS differences (design D6) in `crates/bengali-ime-core/README.md`, and verify `cargo doc --no-deps` builds without warnings

## 4. M3 — UniFFI bindings and XCFramework (Linux for bindings, Mac for the framework)

- [ ] 4.1 Create `crates/bengali-ime-ffi` exporting `Composer` (UniFFI object with an interior `Mutex`), `Update`, `Config` and `transpile_roman_document`, and verify `cargo test -p bengali-ime-ffi` and Swift binding generation (`uniffi-bindgen generate --language swift`) succeed on Linux
- [ ] 4.2 Add `scripts/build-xcframework.sh` (arm64 macOS static lib, generated Swift bindings, `xcodebuild -create-xcframework`), and verify on the Mac that it produces `build/BengaliIMECore.xcframework` containing an `arm64` slice (`lipo -info`)
- [ ] 4.3 Add a small Swift package test target that calls `Composer.key` for `k`, `h`, `u`, `b`, space through the bindings, and verify on the Mac that it yields the committed text `খুব `

## 5. M4 — Input method MVP (Mac)

- [ ] 5.1 Add `macos/project.yml` (XcodeGen; bundle id `com.ahamed.inputmethod.BanglaPhonetic`; macOS 14; arm64; links the XCFramework) with `Info.plist` (`InputMethodConnectionName`, `InputMethodServerControllerClass`, `LSBackgroundOnly`, `tsInputMethodCharacterRepertoireKey`, icon) and a placeholder "অ" template icon. Verify `xcodegen generate && xcodebuild build` succeeds
- [ ] 5.2 Implement `main.swift` (`IMKServer` + run loop) and `InputController` with key routing (printable keys, space, Return, Backspace, navigation keys, modifier combos), applying `Update` via `insertText` and `setMarkedText` with no-underline attributes. Verify in TextEdit that typing `khub` shows `ক`, `খ`, `খু`, `খুব` and never roman letters
- [ ] 5.3 Commit pending text in `commitComposition` and `deactivateServer`, and verify that switching to ABC with `খ` pending leaves `খ` in the document, and that Command-S mid-word commits and then saves
- [ ] 5.4 Add `macos/Makefile` with `install` (build XCFramework → xcodegen → xcodebuild → `codesign --force -s -` → copy to `~/Library/Input Methods` → `killall BanglaPhonetic`) and `uninstall`. Verify a fresh install appears as "Bangla Phonetic" under Bengali in Input Sources, and that a reinstall takes effect without logging out
- [ ] 5.5 Write `macos/README.md` (prerequisites: Xcode, `brew install xcodegen`, `rustup target add aarch64-apple-darwin`; install, enable, debug with `log stream`; keep ABC enabled) and verify that following it on a clean checkout ends with a working input source

## 6. M5 — Document context, caret moves and compatibility (Mac)

- [ ] 6.1 Implement `ClientContext`: bounded text-before-caret read (≤1,024 UTF-16 units, clipped at the paragraph start) when nothing is pending and the key is a vowel, quote or `-`; `nil` when unavailable. Verify in TextEdit that clicking after an existing `ক` and typing `i` gives `কি`, and that the same steps in Terminal give `কই`
- [ ] 6.2 Implement caret-move detection (expected caret vs `selectedRange()`, non-empty selection, `NSNotFound` skip) with `composer.reset`. Verify that typing `k`, clicking elsewhere and typing `h` leaves `ক` in place and inserts `হ` at the new position
- [ ] 6.3 Apply `replace_before` via `insertText(_:replacementRange:)`, and verify in TextEdit that typing `-` in ABC, switching to Bangla Phonetic and typing `-` produces `—`
- [ ] 6.4 Verify that a password field receives plain ASCII while Bangla Phonetic is selected
- [ ] 6.5 Run the compatibility pass with the fixed test paragraph in `macos/COMPATIBILITY.md` (TextEdit, Notes, Pages, Safari, Chrome, VS Code, Slack, Terminal, iTerm2, Spotlight, Word). Record the result per app in that file, and fix any stray or duplicated characters before checking this off

## 7. M6 — Menu toggles and Convert selection (Mac)

- [ ] 7.1 Implement `menu()` with checkable toggles for Bengali digits, দাঁড়ি for `.` and smart quotes, stored in `UserDefaults` and pushed to the composer `Config`. Verify that unchecking Bengali digits makes `2024` type as ASCII, and that the setting survives logging out and back in
- [ ] 7.2 Implement "Convert selection to Bengali" (read the selection, `transpile_roman_document` with the current `Config`, replace via `replacementRange`, no-op when unavailable). Verify that `ami banglay gan gai` selected in TextEdit becomes `আমি বাংলায় গান গাই`, and that Terminal is left unchanged
- [ ] 7.3 Update `macos/README.md` with the menu options, and verify the documented steps match the running app

## 8. Integration and documentation (Linux + Mac)

- [ ] 8.1 Add a `macos` job (`macos-15` runner) to `.github/workflows/ci.yml` that builds the XCFramework and the input method app (no install), and verify it passes on the branch
- [ ] 8.2 Update `docs/macos-input-source.md` to point at this change and correct the context-fallback description (design D5), and add a "macOS input source" section to `README.md`. Verify the links resolve
- [ ] 8.3 Run `openspec validate add-macos-input-source --strict` and verify it passes before archiving
