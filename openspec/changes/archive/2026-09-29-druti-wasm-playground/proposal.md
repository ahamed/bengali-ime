## Why

The project is now Druti (the GitHub repo moved to `ahamed/druti-ime`), and the Rust engine is what
users actually run, in the macOS input source. The TypeScript engine is still the "reference" that
generates the parity fixtures, so every rule has to be written twice. The web playground still runs
the TypeScript code, so it no longer shows what Druti types. Making Rust the only engine and running
it in the browser through WASM leaves a single implementation, gives a public "try it" page, and lets
the first public macOS release (1.0.0) link to it.

## What Changes

- **Rename**: the crates `bengali-ime-core` and `bengali-ime-ffi` become `druti-core` and `druti-ffi`.
  The FFI library keeps the name `bengali_ime_ffi` and the Swift/Xcode names (`BengaliIMECore`,
  `BengaliIMEFFI`) stay, so the macOS build is unchanged. Every repository, issue and release URL points to
  `github.com/ahamed/druti-ime`. The README drops the note about the `deterministic-bengali-typewriter`
  monorepo copy.
- **BREAKING — remove the TypeScript engine**: delete `src/`, `scripts/gen-fixtures.ts`, the Vitest
  suite and the unpublished npm package `@ahamed/bengali-ime`. Rust becomes the only source of truth.
  The fixture JSON files stay as frozen test data under the core crate and are edited deliberately
  when behaviour changes. The CI job that runs Node tests and checks fixture freshness goes away.
- **New `druti-wasm` crate**: wasm-bindgen bindings that expose the composer (key, backspace, flush,
  reset, pending, config) and bulk transliteration with config to JavaScript.
- **New web playground** in `examples/playground/` with its own `package.json`, Vite and TypeScript UI
  code, built on `druti-wasm`:
  - an editor that shows the composer's pending text underlined inline, as macOS marked text looks
  - toggles for Bengali digits, দাঁড়ি for `.` and smart quotes
  - an English-mode toggle
  - the bulk transliteration panel
  - a link to download the macOS DMG
- **GitHub Pages**: a workflow builds the WASM package and the playground and deploys them to
  `ahamed.github.io/druti-ime` on every push to `main`. CI builds the playground on pull requests.
- **Release assets**: the tag-triggered macOS release also attaches `Druti-X.Y.Z.app.zip` and its
  SHA-256. The release is still a draft, signed ad hoc and not notarized.
- **Release 1.0.0**: after this change merges, `macos-v1.0.0` is tagged on `main`. The manual Mac checks
  carried over from `add-macos-distribution` (tasks 4.4 and 7.1–7.7) must pass before the draft is published.

## Capabilities

### New Capabilities
- `web-playground`: The WASM build of the engine and the browser playground: what the JavaScript
  bindings expose, how the editor shows committed and pending text, the settings and English-mode
  toggles, bulk transliteration, the download link and the public deployment.

### Modified Capabilities
- `rust-engine-core`: Parity with the TypeScript engine is replaced by conformance to committed golden
  fixtures. The TypeScript-generated fixtures, the regeneration step and the freshness check are removed.
  Requirements that describe behaviour as "the same as the TypeScript engine" are restated as standalone
  behaviour.
- `macos-distribution`: The tag-triggered draft release also carries a zipped `Druti.app` and its checksum.

## Impact

- **Rust**: `Cargo.toml` workspace members and URLs. The crate directories and package names are renamed,
  and `use bengali_ime_core` becomes `use druti_core`. There's a new crate, `crates/druti-wasm`, which
  depends on `wasm-bindgen`, and the `wasm32-unknown-unknown` target is needed to build it.
- **Removed**: `src/`, `scripts/gen-fixtures.ts`, the root `package.json`, `tsconfig*.json`,
  `vite.config.ts`, `vitest.config.ts`, `yarn.lock` and `.npmignore`.
- **Moved**: `fixtures/` becomes `crates/druti-core/tests/fixtures/`.
- **macOS build**: `scripts/build-xcframework.sh` and `macos/Makefile` (cargo-about manifest path) use the
  new package names. Swift code and the Xcode project don't change.
- **CI**: `ci.yml` drops the Node test job and adds a job that builds the WASM package and the playground.
  A new `pages.yml` deploys the playground. `release-macos.yml` zips the app and checksums it.
- **Repository settings**: GitHub Pages must be enabled with "GitHub Actions" as the source. This is a
  one-time maintainer action.
- **Docs**: README (Druti title, playground link, no npm usage section), `crates/*/README.md`,
  `macos/README.md`, `docs/macos-input-source.md`, the release notes template and the DMG Read Me URLs.
  `openspec/config.yaml` context now describes Rust as the only engine.
