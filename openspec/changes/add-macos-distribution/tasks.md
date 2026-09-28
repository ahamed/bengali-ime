# Tasks

No task here changes engine behaviour. The Rust core and composer, and their fixtures, stay exactly as
they are.

## 1. M0 — Housekeeping and a spike on background-only dialogs (Linux + Mac)

- [x] 1.1 (Mac) Spike design D4: in a throwaway branch, make `Druti.app` with `LSBackgroundOnly` call `NSApp.setActivationPolicy(.accessory)`, activate itself and run an `NSAlert` when started with no flag from outside Input Methods. Verify the alert comes to the front when the app is opened from Finder. If it doesn't, switch to the `LSUIElement` fallback and verify that typing in TextEdit still works and no Dock icon appears. Record the result in design.md D4
- [x] 1.2 (Linux) Add the MIT `LICENSE` at the repo root (copyright holder Sajeeb Ahamed), set `"license": "MIT"` in `package.json` and the `license` field in both crates' `Cargo.toml`. Verify `cargo metadata` shows MIT for both crates
- [x] 1.3 (Linux) Update `openspec/config.yaml`'s context from "personal use, arm64, ad hoc via make install" to the public, Universal DMG distribution. Verify `openspec validate add-macos-distribution --strict` still passes

## 2. M1 — Universal build and versioning (Mac)

- [x] 2.1 Extend `scripts/build-xcframework.sh` to build `x86_64-apple-darwin` as well, merge the two libraries with `lipo -create`, and package one `macos-arm64_x86_64` slice (design D7). Verify `lipo -archs` on the static library prints `x86_64 arm64`, and update the prerequisites in `macos/README.md` (`rustup target add x86_64-apple-darwin`)
- [x] 2.2 Set `ARCHS: "arm64 x86_64"`, `ONLY_ACTIVE_ARCH: NO`, `MARKETING_VERSION: 1.0.0` and `CURRENT_PROJECT_VERSION: 1` in `macos/project.yml`. Point `CFBundleShortVersionString`/`CFBundleVersion` in `Info.plist` at those settings, and make the Makefile build with `-destination 'generic/platform=macOS'` and pass `CURRENT_PROJECT_VERSION` through. Verify `lipo -archs` on the app executable prints both architectures, and that Finder → Get Info shows 1.0.0
- [x] 2.3 Add `make version` (prints `MARKETING_VERSION` from `project.yml`). Verify `make -s -C macos version` prints `1.0.0`
- [x] 2.4 Update the `macos` job in `.github/workflows/ci.yml` to use the new slice path and check both architectures on the library and the app. Add `cargo test --target x86_64-apple-darwin -p bengali-ime-core` and `swift test --arch x86_64` under Rosetta (install Rosetta if missing). Verify the job passes on the branch

## 3. M2 — Installer, upgrade and uninstall in Swift (Mac)

- [x] 3.1 Restructure `Installer.swift` into `install(from:)`, `uninstall(moveToTrash:)`, `register`, `enable` and `disable`, and add the `--install` / `--uninstall` command-line modes (design D1, D2, D3, D5). Keep `--register` and `--disable` working. Verify `Druti --install` from the build folder installs, registers and enables Druti, and that a quarantined test copy (`xattr -w com.apple.quarantine ...` on the source) produces an installed copy with no quarantine attribute (`xattr -l`)
- [x] 3.2 Make `install(from:)` stage into `.Druti.app.partial`, stop other running Druti instances, swap the copy in with `replaceItemAt`, and clean up on failure. Verify by making `~/Library/Input Methods` read-only in a test account: the error is reported and no partial bundle remains
- [x] 3.3 Choose the mode in `main.swift` from the flags and the resolved bundle location (design D1). Verify that opening the app from the build folder, from a mounted test DMG, and from a translocated quarantined copy all enter installer mode, and that the installed copy still starts as the input method
- [x] 3.4 Build the GUI installer flow: the success dialog with switching guidance and the keep-ABC advice; the fallback dialog when enabling fails, with an "Open Keyboard Settings" button (`x-apple.systempreferences:com.apple.Keyboard-Settings.extension`); and the error dialog. Verify each dialog by forcing its path (for example, by temporarily breaking the mode ID for the fallback)
- [x] 3.5 Verify the upgrade path: install 1.0.0 and enable it, change a toggle, then install a build with `MARKETING_VERSION` 1.0.1. The next key press uses 1.0.1, Druti stays enabled, the toggle is kept, and the current input source doesn't change
- [x] 3.6 Add "Uninstall Druti…" at the bottom of the input menu, after a separator, with a confirmation alert (design D5). Verify that confirming removes Druti from the input menu, puts the bundle in the Trash and removes the defaults domain (`defaults read com.ahamed.inputmethod.Druti` fails), and that cancelling changes nothing
- [x] 3.7 Switch the Makefile's `install` to `Druti --install` (keeping the System Settings restart; the old Seher cleanup was later removed, since Druti is the final name) and `uninstall` to `Druti --uninstall` (design D11). Verify a fresh `make install`, a reinstall after a code change (takes effect on the next key, no log-out) and `make uninstall` all behave as the modified "Local install and registration" requirement says

## 4. M3 — License notices and DMG packaging (Mac)

- [x] 4.1 Add `about.toml` and a Handlebars template, and a `make licenses` target that writes `Druti/Generated/Licenses.txt` (Druti's MIT license, then each crate compiled into `bengali-ime-ffi`) (design D9). Add it to the app's resources in `project.yml`. Verify the file lists `uniffi` with its MPL-2.0 text and is present in `Druti.app/Contents/Resources`
- [x] 4.2 Add `macos/Tools/make-dmg-background.swift`, which renders the install steps as a 1x/2x TIFF, and a `make dmg-background` target. Verify the rendered image in light and dark Finder appearances and agree the wording with the author
- [x] 4.3 Add `macos/Packaging/dmg-settings.py`, `requirements.txt` (pinned `dmgbuild`), a `Read Me.txt` template (install, Open Anyway, switching, uninstall, update), and `make dmg` producing `build/Druti-<version>.dmg` (design D8). Verify that mounting it shows the styled window with `Druti.app`, `Read Me.txt` and `Licenses.txt`, and nothing executable besides the app
- [ ] 4.4 Verify end to end on the Mac: upload the local DMG somewhere temporary and download it through Safari (so it's quarantined), open it, go through Open Anyway, install, and type `khub` in TextEdit to get `খুব`, with no further Gatekeeper prompt after log-out/log-in

## 5. M4 — Release workflow (Linux + Mac)

- [x] 5.1 (Linux) Add `macos/Packaging/release-notes.md` (install steps, Open Anyway, Intel-untested caveat, SHA-256 check, space for the changes)
- [x] 5.2 (Linux) Add `.github/workflows/release-macos.yml` (design D10): tag trigger `macos-v*`, check the tag against the version, run the tests for both architectures, `make dmg CURRENT_PROJECT_VERSION=$GITHUB_RUN_NUMBER`, create the `.sha256`, and `gh release create --draft`. Verify with `actionlint`, if available
- [x] 5.3 (Mac) Dry run: push a throwaway tag `macos-v0.0.0-test` against a branch where `MARKETING_VERSION` doesn't match, and verify the workflow fails before building. Then use a matching test version, and verify a draft release appears with the DMG and `.sha256` and that `shasum -a 256` matches. Delete the test release and tag afterwards

## 6. M5 — Documentation (Linux)

- [x] 6.1 Add a "Download for macOS" section to the top-level `README.md`, linking to `releases/latest`, with the install, Open Anyway, update and uninstall steps, and the macOS 14 or later requirement
- [x] 6.2 Split `macos/README.md` into "Install (users)" and "Build from source (developers)". Document the Uninstall menu item and the new Makefile targets (`dmg`, `licenses`, `version`), and verify every command in it runs as written
- [x] 6.3 Add a "Releasing" section to `macos/README.md`: bump `MARKETING_VERSION`, tag `macos-vX.Y.Z`, test the draft DMG as in section 7, then publish

## 7. M6 — Pre-release verification for 1.0.0 (Mac)

- [ ] 7.1 Carried over from `add-macos-input-source` 6.1: in TextEdit, clicking after an existing `ক` and typing `i` gives `কি`. In Terminal, the same steps give `কই`
- [ ] 7.2 Carried over from 6.2: typing `k`, clicking elsewhere and typing `h` leaves `ক` in place and inserts `হ` at the new position
- [ ] 7.3 Carried over from 6.3: in TextEdit, typing `-` in ABC, switching to Druti and typing `-` produces `—`
- [ ] 7.4 Carried over from 6.4: a password field receives plain ASCII while Druti is selected
- [ ] 7.5 Carried over from 6.5: run the compatibility pass in `macos/COMPATIBILITY.md` with the 1.0.0 draft DMG build, record a result for every app, and fix any stray or duplicated characters before publishing
- [ ] 7.6 Fresh-install check: in a new macOS user account, download the draft DMG through a browser and install it following only the top-level README. Verify it types Bengali without Xcode, Rust or Homebrew
- [ ] 7.7 Run `openspec validate add-macos-distribution --strict`, then publish the 1.0.0 release (the author does this)
