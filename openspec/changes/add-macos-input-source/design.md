# Design

## Context

- The TS engine (`src/bengali-ime.ts`) is a string state machine. `process()` returns `IMEAction[]`
  that rewrite recently emitted text, and `buffer` holds the cluster that can still change.
  `textBeforeCaret` is consulted only for vowels (kar vs independent vowel), `-` (em dash) and
  quotes (balancing). When it is `undefined`, a vowel on an empty buffer is always independent.
- Since the engine rework on main (#1): Backspace undoes the last keystroke via an undo stack,
  kars attach only to a consonant directly before the caret (`endsWithKarTakingConsonant`, no
  grapheme segmentation), unmapped keys pass through, and without `textBeforeCaret` the engine
  reads its own output.
- Checked by fuzzing 30,000 random 12-key sequences against the reworked TS engine: `buffer` is
  always a suffix of `output`, and while typing (Backspace aside) only two keys rewrite text before
  the buffer: `-` after `-` (→ `—`) and `.` after `।` (→ `..`). The commit/pending split in
  `specs/ime-composer` depends on this.
- macOS input methods can reliably control only their own marked text. Changing committed text
  needs `insertText(_:replacementRange:)`, which Terminal, many Electron apps and Java apps ignore.
  Reading the document (`attributedSubstring(from:)`) has the same limits.
- Work is split between a Linux cloud session (Rust, TS, fixtures) and the author's Apple Silicon
  Mac (Xcode, manual app testing). The author is a TS developer who is new to Swift.

## Goals / Non-Goals

**Goals:**
- One native engine whose behaviour is proven identical to TS by generated fixtures, not by review.
- Keep all platform-independent behaviour (commit/pending split, backspace, toggles) in Rust, where
  it can be tested on Linux. The Swift layer stays thin: event routing and IMK calls.
- A reproducible local build from the command line (`make install`), with no hand-edited Xcode
  project state.

**Non-Goals:**
- Replacing the TS engine in the npm package or web app (no WASM in this change).
- The iOS keyboard extension, and a live-commit mode that uses replacement ranges. The design keeps
  both possible, but neither is built here.
- Signing with a Developer ID, notarization, auto-update, localisation of the menu.
- Dictionary suggestions or candidate windows.
- Keyboard layouts other than US QWERTY as the physical base layout.

## Decisions

### D1. Rust port with TS as the oracle
Port each TS module one-to-one (`bengali-ime-data` → `data.rs`, each `supports/*.ts` → a rule in
`rules/`, `BengaliIME` → `Engine`, `transpileRomanDocument` → `transpile.rs`), keeping the rule
order of `processVowel` / `processConsonant`. Keep the TS names (Akkhar rules, `replace_last`,
`append_and_flush_buffer`) so a TS diff maps line by line onto the Rust diff.
- *Alternatives:* JavaScriptCore running the TS bundle (one engine, but the logic can't be tested
  on Linux without a JS runtime and would be a poor fit inside an iOS keyboard extension); a Swift
  port (not reusable beyond Apple platforms). The Rust option was chosen explicitly by the author.

### D2. Fixtures generated from TS, replayed in Rust
`scripts/gen-fixtures.ts` (run with `vite-node` or `tsx` as a dev dependency) writes
`fixtures/engine/{unit,words,random}.json`. Each case is
`{ keys: [{ key, textBeforeCaret? }], steps: [{ actions, output, buffer }] }`.
- `unit`: the inputs used by the existing vitest suites, extracted into a shared list that the
  vitest files also import, so the list isn't duplicated.
- `words`: a curated list of Bengali words and sentences in roman form, including conjuncts,
  `rri`, `Oi`/`OU`, nasals, ya-phala, digits and punctuation.
- `random`: seeded sequences over the full key alphabet, some with and some without
  `textBeforeCaret`, including conjunct-ending contexts.
CI runs the generator and fails on `git diff --exit-code fixtures/`, then runs `cargo test`.
- *Alternative:* hand-writing Rust tests that mirror vitest. Rejected: two suites drift, and random
  coverage would be lost.

### D3. Grapheme segmentation via `unicode-segmentation`, pinned, composer only
The engine no longer segments graphemes, so there is no ICU/crate parity risk in the engine. The
composer uses `unicode-segmentation` (pinned) for grapheme Backspace, a Rust-only behaviour with its
own fixtures.

### D4. Composer in Rust, not Swift
`Composer` wraps `Engine` and keeps `committed_len` (UTF-16). After each key:
`pending = output[committed_len..]` is recomputed with the held part being `buffer`, or a lone
trailing `-` or `।` that the key just inserted. The update is
`Update { replace_before: u32, commit: String, pending: String, handled: bool }`, where
`replace_before` is non-zero only when the engine rewrote text before `committed_len`
(specs/ime-composer, "Rewriting text outside the composer").
- *Why Rust:* the whole split, including the "never rewrite committed text" property, is
  fuzz-tested on Linux, and a future iOS extension reuses it unchanged.
- *Alternative:* diffing in Swift. Rejected: it is untestable without a Mac and would be duplicated for iOS.

### D5. Context fallback lives in the engine
The host passes `Option<String>` for the committed text before the pending text. The composer
passes host text + pending text when present, and `None` otherwise; since #1 the engine then reads
its own output (what it produced since the last reset), exactly as the web typing flow does.

### D6. Intentional differences from the TS engine (all Rust-side, outside `Engine`)
| Behaviour | TS engine | Rust |
|---|---|---|
| Backspace in pending text | undoes the last keystroke (`processBackspace`) | removes 1 grapheme cluster and ends the cluster (`Composer::backspace`, the author's choice). `Engine::process_backspace` keeps TS behaviour for parity. |
| Backspace with nothing pending | undoes the last keystroke | not handled; the host app deletes and the composer resets |
| Enter | `splitBlock` action | host commits pending text and passes Return to the app; the engine never sees Enter |
| Output toggles | none | `Config { bengali_digits, dari_for_period, smart_quotes }`, applied as a post-mapping in `Engine` key classification. `Config::default()` reproduces TS exactly, and all fixtures run with the default. |
| Lone `-` or `।` | committed immediately | held as pending by the composer (output text is identical) |

### D7. UniFFI proc-macro bindings + XCFramework
`bengali-ime-ffi` exposes `Composer` as a UniFFI `Object` (interior `Mutex`), plus `Update`,
`Config` and `transpile_roman_document`. `scripts/build-xcframework.sh` builds
`aarch64-apple-darwin` as a static lib, generates the Swift bindings with `uniffi-bindgen`, and runs
`xcodebuild -create-xcframework`. The outputs go into the `macos/BengaliIMECore` Swift package
(`BengaliIMEFFI.xcframework` as a binary target, the bindings under `Sources/BengaliIMECore/Generated`)
and are git-ignored. The package also holds the AppKit-free host helpers (key routing, the context
window), so `swift test` covers them. iOS slices can be added to the same script later.
- *Alternatives:* cbindgen and a hand-written C ABI (manual string ownership, more unsafe code);
  swift-bridge (less mature, and doesn't give Kotlin if Android is ever added).

### D8. InputMethodKit app shape
- `main.swift`: create an `IMKServer` with `InputMethodConnectionName` and run `NSApplication`.
- `InputController: IMKInputController`: holds one `Composer` per controller instance (IMK creates
  one per client text session), overrides `handle(_:client:)`, `commitComposition(_:)`,
  `deactivateServer(_:)` and `menu()`.
- `ClientText.swift`: reads `selectedRange()`; reads up to 1,024 UTF-16 units before the caret,
  clipped at the last paragraph break, via `attributedSubstring(from:)`, only for keys where
  `key_reads_document(key)` is true and nothing is pending. `InputController` tracks the expected
  caret for caret-move detection and applies each `Update` (`insertText` with `replacementRange` for
  `replace_before`, then `setMarkedText` with the no-underline attributes and the selection at the
  end of the marked text).
- `Settings.swift`: `UserDefaults` for the three toggles, rebuilding `Config` on change.
- Bundle id `com.ahamed.inputmethod.BanglaPhonetic`, `LSBackgroundOnly`,
  `tsInputMethodCharacterRepertoireKey = [Beng]`, deployment target macOS 14, arm64 only.
- Project defined in `macos/project.yml` (XcodeGen). `macos/Makefile` chains
  `build-xcframework` → `xcodegen` → `xcodebuild` → `codesign -s -` → copy →
  `BanglaPhonetic --register` (`TISRegisterInputSource`, so a log-out is usually unnecessary) →
  `killall`. The menu bar icon (অ) is rendered at build time by `macos/Tools/make-icon.swift` with
  the system Bengali font, so no binary image is committed.

### D9. Caret-move detection
After applying an update, the controller records `expected = caret after the update`. On the next
key, if `selectedRange().location != expected`, or the selection length is non-zero, it calls
`composer.reset(context)` first. If the client reports `NSNotFound`, the check is skipped, and
IMK's `commitComposition` (sent on clicks and focus changes) is relied on instead.

## Risks / Trade-offs

- **Upstream engine changes.** The TS engine can change under this work (as #1 did). → The
  fixture freshness check fails CI until fixtures are regenerated, and `cargo test` then fails until
  the port follows; composer assumptions (buffer is a suffix; which keys rewrite committed text) are
  re-checked by the composer property test (task 3.6).
- **Apps that ignore the no-underline attribute.** → Accepted. Only 1–4 pending characters are
  underlined (specs/macos-input-source).
- **Apps with no text access** (Terminal, some Electron/Java apps) lose kar attachment after a caret
  move, and `replace_before` can't be applied. → Documented degraded behaviour. `replace_before` only
  occurs for `-` or `.` typed right after an existing `-` or `।` in the document, so the worst case
  is `-—` instead of `—` or `।..` instead of `..`.
- **Input method crash while typing.** → Keep ABC enabled; log with `os.Logger`; no panic crosses
  the FFI: `bengali-ime-ffi` wraps every call in `catch_unwind`, resets the composer and reports the
  key as not handled, so the app still receives it (a panic in a non-throwing UniFFI function would
  otherwise abort the input method).
- **Ad-hoc signing on newer macOS.** Future macOS versions may refuse ad-hoc signed input
  methods. → Fall back to Xcode's free "Sign to Run Locally" with a personal team, which needs no
  paid account.
- **Swift is new to the author.** → Keep the Swift layer small (~300 lines), with the logic in
  tested Rust and explanatory comments on the IMK-specific parts.
- **Fixture file size.** Random fixtures could bloat the repo. → Cap them at a few thousand
  sequences, store compact JSON (one line per case), and use a fixed seed.

## Migration Plan

Additive only: the npm package and web app are unaffected. Rollout is per developer machine with
`make install`; rollback is `make uninstall` (and removing the input source in System Settings). The
existing `docs/macos-input-source.md` is updated to point at this change and to correct its
context-fallback description (D5).

## Open Questions

- The icon artwork for the menu bar (a template image of "অ" is the placeholder).
- Whether the "Convert selection" menu item also gets a global keyboard shortcut. It can be added
  later without changing the specs.
