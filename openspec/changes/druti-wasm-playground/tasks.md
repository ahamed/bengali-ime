## 1. M1: Rename to Druti (Linux)

- [x] 1.1 `git mv crates/bengali-ime-core crates/druti-core` and `crates/bengali-ime-ffi crates/druti-ffi`. Rename the packages to `druti-core` and `druti-ffi`, keeping `[lib] name = "bengali_ime_ffi"` in `druti-ffi` (design D1). Update the workspace members, the `repository` URL, the crate descriptions and every `bengali_ime_core` import. Verify with `cargo test --all` (same tests, all pass)
- [x] 1.2 Update `scripts/build-xcframework.sh` (`--package druti-ffi`) and `macos/Makefile` (cargo-about `-m ../crates/druti-ffi/Cargo.toml`). Verify that `grep -rn "bengali-ime-" --exclude-dir={target,.git,node_modules,build,openspec}` finds nothing outside the archived changes
- [x] 1.3 Change every `github.com/ahamed/bengali-ime` URL to `druti-ime`: README, `macos/README.md`, `macos/Packaging/release-notes.md`, `macos/Packaging/Read Me.txt` and `docs/macos-input-source.md`. Remove the `deterministic-bengali-typewriter` monorepo paragraph from the README

## 2. M2: Remove the TypeScript engine and freeze the fixtures (Linux)

- [x] 2.1 `git mv fixtures crates/druti-core/tests/fixtures` (design D2). Point `tests/composer.rs` and `tests/parity.rs` at `CARGO_MANIFEST_DIR/tests/fixtures`, rename `parity.rs` to `fixtures.rs`, and drop the `yarn fixtures` hint. Verify that `cargo test -p druti-core` passes with the same number of tests as before the move
- [x] 2.2 Rewrite `tests/fixtures/README.md` to say the files are golden, and that they're edited in the same commit as an intended engine change and never regenerated. Update the doc comments that say "generated from the TypeScript engine" or "port of … .ts" in `lib.rs`, `data.rs`, `transpile.rs` and the other `druti-core` sources, and in `druti-ffi/src/lib.rs`
- [x] 2.3 Delete `src/`, `scripts/gen-fixtures.ts`, the root `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vite.config.ts`, `vitest.config.ts`, `yarn.lock` and `.npmignore`, plus `node_modules/` locally. Update `.gitignore`
- [x] 2.4 Update `crates/druti-core/README.md`, `docs/macos-input-source.md` (repo layout, "TS oracle" wording) and `openspec/config.yaml` context so Rust is the only engine and fixtures are golden

## 3. M3: `druti-wasm` crate (Linux)

- [x] 3.1 Add `crates/druti-wasm` (`cdylib` + `rlib`, `wasm-bindgen` pinned with `=`) to the workspace, exporting `Config`, `Update`, `Composer` and `transpileRomanDocument` with camelCase JavaScript names (design D3)
- [x] 3.2 Add host-side Rust unit tests in `druti-wasm` for the spec scenarios "Aspiration in the browser", "Commit on a word break", "Default settings" and "Multi-line document", asserting that the wrapper returns the same values as `druti_core::Composer` and `transpile_roman_document_with_config`
- [x] 3.3 Run `rustup target add wasm32-unknown-unknown` and install wasm-pack locally. Verify that `wasm-pack build crates/druti-wasm --target web` succeeds and that the generated `.d.ts` exposes the API from 3.1

## 4. M4: Playground (Linux build, browser check on the Mac)

- [x] 4.1 Scaffold `examples/playground/` as in design D7: a private `package.json` (yarn 1, `vite`, `typescript`), `wasm`/`dev`/`build` scripts that run wasm-pack first, `tsconfig.json`, `vite.config.ts` (`base: './'`) and a gitignored `wasm/`. Delete the old `main.ts` and move the styles to `src/`
- [x] 4.2 Implement `src/editor.ts`: a model-backed `contenteditable` with an underlined pending span, key routing, applying updates, and resets on caret moves, paste, cut, drop and blur (design D5). Wrap WASM calls and recreate the composer on an exception
- [x] 4.3 Implement `src/main.ts` and `index.html`: the Druti header with a "Download for macOS" link to `releases/latest`, the editor, the three settings toggles (applied to the composer and the bulk conversion), the English-mode toggle with a mode label (design D6), and the bulk transliteration panel with the line-break option
- [x] 4.4 Verify that `yarn build` in `examples/playground` type-checks and produces `dist/` that works when served from a subpath (`npx vite preview --base /druti-ime/`)
- [ ] 4.5 (Mac) Check every `web-playground` spec scenario by hand in Safari, Chrome and Firefox: underlined `ক`, then `আমি ` committed, arrow key commits, click mid-cluster, `কি` after clicking, ASCII digits, English mode on and off, bulk sample and download link

## 5. M5: CI, Pages and release assets (Linux, dry run on GitHub)

- [x] 5.1 In `ci.yml`, replace the `test` job with a `web` job: Rust with `wasm32-unknown-unknown`, wasm-pack via `taiki-e/install-action`, `cargo build -p druti-wasm --target wasm32-unknown-unknown`, then `yarn --frozen-lockfile && yarn build` in `examples/playground` (design D8). Keep the `rust` and `macos` jobs green with the renamed crates
- [x] 5.2 Add `.github/workflows/pages.yml` (push to `main` and `workflow_dispatch`: build, `upload-pages-artifact`, `deploy-pages`)
- [x] 5.3 Add an `app-zip` target to `macos/Makefile` (`ditto -c -k --keepParent`) (design D9). Make `release-macos.yml` build `dmg app-zip`, checksum both files and upload all four assets. Update `release-notes.md` with the zip option, the zip checksum command and the playground link. Verify locally with `make -C macos dmg app-zip`: unzipping gives a bundle whose `codesign -dv` output matches the one in the DMG
- [x] 5.4 Update the README: Druti title and intro, a "Try it in your browser" link, the macOS download (DMG or zip), a developer section (`cargo test`, `cd examples/playground && yarn dev`), and no npm usage section. Update the Releasing section in `macos/README.md` for the zip asset
- [ ] 5.5 Run `openspec validate druti-wasm-playground --strict` and `actionlint` (if available) on the workflows. Open the PR and get CI green

## 6. M6: Go live (maintainer approval needed)

- [ ] 6.1 After the author approves, enable GitHub Pages with "GitHub Actions" as the source. After the merge, confirm the Pages workflow deploys and `https://ahamed.github.io/druti-ime/` types `khub` → `খুব`
- [ ] 6.2 Push the tag `macos-v1.0.0` on `main`. Verify the draft release "Druti 1.0.0" has the DMG, zip and both `.sha256` files, and that the checksums match the downloads

## 7. M7: Pre-release verification for 1.0.0 (Mac), carried over from `add-macos-distribution`

- [ ] 7.1 Carried over from 4.4: download the draft DMG through Safari (so it's quarantined), open it, go through Open Anyway, install, and type `khub` in TextEdit to get `খুব`, with no further Gatekeeper prompt after logging out and back in. Repeat with the `.app.zip`
- [ ] 7.2 Carried over from 7.1: in TextEdit, clicking after an existing `ক` and typing `i` gives `কি`. In Terminal, the same steps give `কই`
- [ ] 7.3 Carried over from 7.2: typing `k`, clicking elsewhere and typing `h` leaves `ক` in place and inserts `হ` at the new position
- [ ] 7.4 Carried over from 7.3: in TextEdit, typing `-` in ABC, switching to Druti and typing `-` produces `—`
- [ ] 7.5 Carried over from 7.4: a password field receives plain ASCII while Druti is selected
- [ ] 7.6 Carried over from 7.5: run the compatibility pass in `macos/COMPATIBILITY.md` with the 1.0.0 draft build, record a result for every app, and fix any stray or duplicated characters before publishing
- [ ] 7.7 Carried over from 7.6: fresh-install check in a new macOS user account using only the top-level README. Verify it types Bengali without Xcode, Rust or Homebrew
- [ ] 7.8 Fill in the release notes' "Changes" section. After the author approves, publish the 1.0.0 release
