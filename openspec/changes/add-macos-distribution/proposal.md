## Why

Druti works on the author's Mac, but installing it means cloning the repo and building it with Xcode,
Rust and XcodeGen, which rules out almost everyone who would want a Bangla keyboard on their Mac. A downloadable `.dmg` on
GitHub Releases lets anyone install it without developer tools, while keeping the project free (no
paid Apple Developer account).

## What Changes

- Add an **installer mode** to `Druti.app`. When it's opened from anywhere other than
  `~/Library/Input Methods` (for example from the mounted DMG), it copies itself there, clears the
  quarantine flag on the copy, stops any running copy, registers and enables the input source, and
  shows a dialog explaining how to switch to it. If enabling fails, the dialog offers to open Keyboard settings.
  Running it again upgrades an existing install in place.
- Add an **"Uninstall Druti…"** item to the input menu. After confirmation it disables the input source,
  moves the bundle to the Trash, removes its settings and quits.
- `make install` now builds the app and runs `Druti --install`, so developers go through the same
  code path as users. The Makefile keeps only the developer extras: removing the old Seher install and
  restarting System Settings.
- Build a **Universal** app (arm64 + x86_64) for macOS 14 or later. The XCFramework gets an x86_64
  slice, and CI also runs the Rust and Swift tests for x86_64 under Rosetta.
- Package a **styled DMG** built with `dmgbuild`. It contains `Druti.app`, a background image with the
  install steps (including "Open Anyway" for the ad-hoc build), `Read Me.txt` and the licenses.
- Add a **release workflow**. Pushing a `macos-vX.Y.Z` tag builds the DMG on a macOS runner, checks the
  tag against `MARKETING_VERSION`, and creates a **draft** GitHub Release with the DMG and its SHA-256.
  The first public release is **1.0.0**.
- Add an **MIT `LICENSE`**, plus third-party license notices for the Rust dependencies, bundled in the app and the DMG.
- Documentation: a "Download for macOS" section in the top-level README. `macos/README.md` is split
  into a user part (install, the "Open Anyway" step, uninstall) and a developer part.
- Pre-release verification carried over from `add-macos-input-source` (tasks 6.1–6.5): the context,
  caret-move, password-field and per-app compatibility checks.
- Not in scope: Developer ID signing, notarization, `.pkg` installers, Homebrew, and update checks or
  auto-updates. Users update by opening a newer DMG.

## Capabilities

### New Capabilities
- `macos-distribution`: How Druti is packaged and published: Universal build, versioning and tags,
  DMG contents, the tag-triggered draft release on GitHub, license notices, and user-facing install
  documentation.

### Modified Capabilities
- `macos-input-source`: "Local install and registration" changes. It's no longer Apple Silicon-only,
  and the developer command uses the app's own installer. New requirements cover installer mode
  (self-install, quarantine clearing, enabling, first-run guidance, in-place upgrade) and uninstalling
  from the input menu.

## Impact

- **Swift (`macos/Druti/`)**: `Installer.swift` gets `--install` and the GUI installer mode. `main.swift`
  decides between installer mode and IMK server mode based on the bundle location. `InputController.menu()` gets the
  Uninstall item.
- **Build**: `scripts/build-xcframework.sh` (x86_64 target + `lipo`), `macos/project.yml` (ARCHS,
  `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`), `macos/Druti/Info.plist` (versions read from build
  settings), `macos/Makefile` (`install` via `--install`, new `dmg` target).
- **New files**: `LICENSE`, a DMG settings file and background image under `macos/Packaging/`, a
  script that generates third-party notices, and `.github/workflows/release-macos.yml`.
- **CI**: the `macos` job checks both architecture slices and runs the x86_64 tests under Rosetta.
- **New build tools**: `dmgbuild` (Python, CI and `make dmg` only) and `cargo-about` (or an equivalent)
  for license notices. No new runtime dependencies.
- **Users**: the ad-hoc build asks each user to approve it once in Privacy & Security, and that step is documented.
  Intel support ships untested on real hardware and is labelled that way in the release notes.
- **Project context**: `openspec/config.yaml` still describes "personal use, arm64". Update it to the public,
  Universal distribution.
