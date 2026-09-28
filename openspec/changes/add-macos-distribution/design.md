## Context

- Today `make -C macos install` does all the installing in shell: `ditto` into `~/Library/Input Methods`,
  `lsregister -f -R`, `Druti --register` (`TISRegisterInputSource`), then `killall` for Druti,
  `TextInputMenuAgent` and System Settings. `Installer.swift` only knows `--register` and `--disable`.
- The app is `LSBackgroundOnly`, signed ad hoc with hardened runtime off, arm64 only. The engine comes
  from `scripts/build-xcframework.sh`, which builds `aarch64-apple-darwin` only, into a
  `macos-arm64` XCFramework slice.
- The version is hard-coded in `Info.plist` (`0.1.0` / `1`). There's no LICENSE, no tags and no
  releases, and the repo is public.
- A browser marks downloaded files with `com.apple.quarantine`. When a quarantined app is opened, macOS
  runs it from a randomized read-only copy ("App Translocation"), and on macOS 15 and later an ad-hoc
  app can only be approved through Privacy & Security → Open Anyway. The input method itself is started
  by the system rather than by the user, so a quarantined copy there would be blocked with no
  visible explanation.
- Decisions already made with the author (see proposal): ad hoc only, a self-installing app in a styled
  DMG, Universal build for macOS 14 or later, MIT, GitHub Releases through a tag-triggered draft,
  `macos-vX.Y.Z` tags starting at 1.0.0, manual updates, uninstall from the menu.

## Goals / Non-Goals

**Goals:**
- One Swift install/uninstall implementation, used by the DMG, by `make install` and by
  `make uninstall`, so developers exercise what users run.
- A release that is fully reproducible from a tag on a GitHub runner, with no secrets.
- A user never needs Terminal: approving the app once in Privacy & Security is the only step outside Druti's own dialogs.

**Non-Goals:**
- Installing for all users into `/Library/Input Methods`, or anything that needs admin rights.
- Localising the installer dialogs (English only, like the menu).
- Reproducible bit-for-bit binaries, since ad-hoc signatures differ per build anyway.
- Any network access from the app.

## Decisions

### D1. The mode is chosen from arguments and the bundle's location
`main.swift` decides what to run before starting the IMK server:
1. `--install` / `--uninstall` / `--register` / `--disable`: command-line modes with no UI, for the Makefile.
2. No flag, and the bundle's parent directory isn't `~/Library/Input Methods`: **GUI installer mode**.
3. Otherwise: the input method, as today.

The location check compares standardized, symlink-resolved paths. A translocated app
(`/private/var/folders/.../AppTranslocation/...`) is outside Input Methods, so it becomes the installer,
and it copies from `Bundle.main.bundleURL`, which still points at the readable translocated copy.
- *Alternative:* a separate installer app in the DMG. Rejected because it means two bundles to sign and
  version, and users would see two icons.
- *Alternative:* a flag file or Info.plist key. Rejected because the location is the fact that matters.

### D2. Copy with `ditto --noqtn` into a staging path, then swap
The installer does the following:
1. Copies the bundle with `/usr/bin/ditto --noqtn <src> "~/Library/Input Methods/.Druti.app.partial"`,
   creating the folder if needed.
2. Stops running Druti instances other than itself (`NSRunningApplication` for the bundle ID, `terminate`,
   then `forceTerminate` after a short timeout).
3. Swaps the partial copy into place with `FileManager.replaceItemAt`. The partial copy is removed on
   any failure, so no half-copied bundle is ever left behind.
4. Clears `com.apple.quarantine` on the staged copy and every file in it, with `removexattr`. It
   ignores files that don't have the flag and fails the install on any other error.

`ditto` is what `make install` already uses. Contrary to its name, `--noqtn` does **not** remove a
flag the source already carries (checked on macOS 27), so step 4 is what clears it. Doing that is
fine, because the user already approved this exact app through Gatekeeper to open it. Gatekeeper
also kills a quarantined ad-hoc executable run from Terminal (exit 137), so the flag can't simply be
left on the copy. The
`com.apple.provenance` attribute on macOS 13 and later can't be removed and isn't removed; it records
where the file came from but doesn't stop the app from launching.
- *Alternative:* `FileManager.copyItem` followed by `removexattr` on every file. It works too, but it's
  more code and the quarantine attribute sits on every file in the bundle.

### D3. Registration, enabling and caches
After the swap, the installer does the following:
1. Calls `LSRegisterURL(installed, true)`, which replaces `lsregister -f -R`.
2. Calls `TISRegisterInputSource(installed)`.
3. Looks up the input *mode* source `com.ahamed.inputmethod.Druti.Bengali` and calls `TISEnableInputSource`
   on it. It never calls `TISSelectInputSource`, so the current input source doesn't change (spec:
   "without making it the current input source").
4. Restarts `TextInputMenuAgent` so the input menu picks up the name and icon.

It doesn't quit System Settings on a user's machine. The Makefile still does that for developers.
- On upgrade, the source is already enabled. Enabling again does nothing, and settings live in the
  `com.ahamed.inputmethod.Druti` defaults domain, which the installer never touches.
- Checked on macOS 27: `TISEnableInputSource` does enable Druti's mode after a fresh install. The
  input mode has to be disabled by its own ID, because a bundle ID lookup only finds the parent
  source. The mode disappears from the list shortly after the bundle is unregistered.
- If the enabled mode can't be found after registering (the system can take a moment to list it), the
  installer retries for up to ~2 s. After that it treats enabling as failed and shows the manual steps,
  offering to open `x-apple.systempreferences:com.apple.Keyboard-Settings.extension`.

### D4. Showing dialogs from a background-only app
`LSBackgroundOnly` stays set, because it's what keeps the input method out of the Dock. In installer mode, the
app calls `NSApp.setActivationPolicy(.accessory)` and activates itself before running `NSAlert`s,
then exits. Task 1.1 checks this first, because the rest of the installer UI depends on it. If a
background-only app can't bring an alert to the front, the fallback is to drop `LSBackgroundOnly` and
set `LSUIElement` instead, which also has no Dock icon. That would be checked against the IMK behaviour in
`openspec/specs/macos-input-source`.

**Result (task 1.1, confirmed by the author):** `.accessory` plus `activate()` works. The installer's
dialogs and the Uninstall confirmation come to the front while `LSBackgroundOnly` stays set, so the
`LSUIElement` fallback isn't needed.

### D5. Uninstall shares the installer's code
`Installer.uninstall()` does the following:
1. Disables every source with Druti's bundle ID.
2. Unregisters the bundle with `lsregister -u`. LaunchServices has no public unregister API.
3. Moves the bundle to the Trash with `NSWorkspace.recycle`, which lets a user recover it.
4. Removes the defaults domain.
5. Restarts `TextInputMenuAgent`.

The menu item in `InputController` commits pending text, confirms with an `NSAlert` using the D4
activation approach, and then calls `uninstall()` and `exit(0)`. The running input method moving its own
bundle to the Trash is fine, because the executable stays mapped until exit. `make uninstall` runs
`Druti --uninstall`, which removes the bundle with `rm` instead of the Trash (a developer
rebuilds anyway).

### D6. Versions come from build settings
`project.yml` sets `MARKETING_VERSION: 1.0.0` (the single source) and `CURRENT_PROJECT_VERSION: 1`.
`Info.plist` uses `$(MARKETING_VERSION)` and `$(CURRENT_PROJECT_VERSION)`. The release workflow runs
`make app CURRENT_PROJECT_VERSION=$GITHUB_RUN_NUMBER`, which only ever increases for that workflow.
`make version` prints the marketing version, and the workflow compares it with the tag
(`macos-v$(make -s version)`) before building.
- *Alternative:* take the version from the tag. Rejected because a local `make install` would then have
  no meaningful version, and the tag could drift from the code without anyone noticing.

### D7. Universal engine library
`build-xcframework.sh` builds `aarch64-apple-darwin` and `x86_64-apple-darwin`, merges the two static
libraries with `lipo -create`, and packages a single `macos-arm64_x86_64` slice. Bindings are still
generated once, from the host-architecture dylib. The Makefile builds with
`-destination 'generic/platform=macOS' ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO`, and
`project.yml` sets `ARCHS` to match. In CI, the `macos` job:
- checks `lipo -archs` for both architectures, on both the static library and the app executable
- runs `cargo test --target x86_64-apple-darwin -p bengali-ime-core`
- runs `swift test --arch x86_64` under Rosetta, installing Rosetta with
  `softwareupdate --install-rosetta --agree-to-license` if the image lacks it

### D8. The DMG is built with dmgbuild, and its background is generated
`macos/Packaging/dmg-settings.py` configures `dmgbuild`: the window layout, icon positions, the background
and the files. `dmgbuild` writes the `.DS_Store` itself instead of scripting Finder, so it works on a
headless runner.

The background is rendered by `macos/Tools/make-dmg-background.swift` as a 1x/2x TIFF with the numbered
steps, in the same way `make-icon.swift` renders the menu icon. Its text lives in the code and can be
changed in review, with no binary PNG in git.

`make dmg` does the following:
1. Builds the app.
2. Generates the licenses and the background.
3. Fills in `Read Me.txt` from a template with the version.
4. Runs `dmgbuild` into `build/Druti-X.Y.Z.dmg`.

`dmgbuild` is pinned in `macos/Packaging/requirements.txt`.
- *Alternative:* `create-dmg`. Rejected because it drives Finder over AppleScript, which is flaky on CI.
- *Alternative:* plain `hdiutil`. Rejected because nothing would show the user the steps.

### D9. License notices from cargo-about
`cargo about generate` uses an `about.toml` (the accepted licenses: MIT, Apache-2.0, MPL-2.0,
BSD-*, Unicode-*, ISC) and a Handlebars template to render `Licenses.txt`. The file starts with
Druti's own MIT license, followed by one section per crate compiled into `bengali-ime-ffi`. The
Makefile generates it into `Druti/Generated/` (git-ignored, like the icon), `project.yml` copies it into
`Contents/Resources`, and `make dmg` puts it in the DMG too. If a dependency's license isn't on the
accepted list, `cargo about` fails, and so does the release.

Everyday builds (`make app`, `make install`, the `ci.yml` job) don't require cargo-about. Without it,
`Licenses.txt` holds only Druti's own license and the Makefile prints a warning. `make dmg` refuses to
run without cargo-about and always regenerates the file, so a release never ships the fallback.

### D10. Release workflow
`.github/workflows/release-macos.yml` runs on `push: tags: ['macos-v*']`, on `macos-15`, with
`permissions: contents: write`. The steps are:
1. Checkout.
2. Install the Rust toolchain with both targets.
3. Install `xcodegen` (brew), `dmgbuild` (pip, pinned) and `cargo-about` (`taiki-e/install-action`).
4. Check the tag against the version.
5. Run the Swift and Rust tests for both architectures.
6. `make dmg`.
7. `shasum -a 256 > Druti-X.Y.Z.dmg.sha256`.
8. `gh release create "$TAG" --draft --title "Druti X.Y.Z" --notes-file <rendered notes> <dmg> <sha256>`.

The notes template `macos/Packaging/release-notes.md` includes the install steps, the "Open Anyway"
step and the Intel caveat. The maintainer adds the changes by hand before publishing. The existing
`ci.yml` jobs are left alone.

### D11. Makefile after the change
`install` becomes `app` → `$(APP)/Contents/MacOS/Druti --install` → `killall "System Settings"`.
The cleanup of the input source's earlier name, Seher, is removed: Druti is the final name, and no
Seher build was ever released. `uninstall` becomes `Druti --uninstall`, run from the installed copy. There are
new targets `dmg`, `licenses`, `version` and `dmg-background`. `clean` also removes `build/*.dmg`.

## Risks / Trade-offs

- [Some users won't know how to open an unnotarized app] → The DMG background, `Read Me.txt`, release notes and README all show the Privacy & Security → Open Anyway steps, with the macOS 15 wording. Revisit notarization if issues show many users get stuck.
- [`TISEnableInputSource` might be restricted for third-party input methods on some macOS versions] → Covered by D3's fallback dialog and the Settings button. The spec allows either outcome, so the specs don't depend on which one happens.
- [A background-only app might not be able to show alerts] → D4 checks it in the first task, with the `LSUIElement` fallback.
- [The Intel slice can't be tested end to end without Intel hardware] → Unit tests run under Rosetta in CI, and the release notes mark Intel as untested on real hardware. An Intel user's report is required before that label is removed.
- [Killing a running Druti during an upgrade drops the user's pending text] → The installer only runs while the user is in its own dialog, so no text field is composing. `forceTerminate` is only used after `terminate` times out.
- [Ad-hoc signatures change with every build, so macOS may ask again or reset TCC-style state] → Druti uses no TCC-protected APIs, and the Gatekeeper approval is only needed for the downloaded copy, which is never run again after the install.
- [`cargo-about` and `dmgbuild` are new build-time tools] → Both are only needed for `make dmg` and the release workflow, not for `make install` or the everyday CI jobs. Versions are pinned.
- [Someone runs `Druti.app` from the build folder by double-clicking it] → That's installer mode, which installs it. This is fine and the same as a user running it from the DMG.

## Migration Plan

- The author's existing `make install` copy is replaced by the first `make install` or DMG install of
  1.0.0, and the enabled state is kept (same bundle ID and mode ID).
- Rollback for users: open an older DMG from Releases, which the installer handles like an upgrade. Nothing
  checks for downgrades, on purpose.
- Rollback for a bad release: delete the draft, or unpublish the release, and fix it on a new patch tag.
  Tags are never moved.

## Open Questions

- Whether the `macos-15` runner image already has Rosetta. The workflow installs it if it's missing
  either way.
- The exact wording and layout of the DMG background. It's decided in review of the rendered image
  (task 4), and it doesn't affect the spec.
