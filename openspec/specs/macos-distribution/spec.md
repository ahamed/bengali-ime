# macos-distribution Specification

## Purpose
How the Druti macOS input source is packaged and published, so that anyone can download a DMG from
GitHub Releases and install it without developer tools or a paid Apple Developer account.
## Requirements
### Requirement: Universal build for macOS 14 or later
The released `Druti.app` SHALL contain native code for both Apple Silicon (arm64) and Intel (x86_64)
Macs, and SHALL declare macOS 14 as its minimum system version. CI SHALL check that both architecture
slices are present in the app and in the engine library, and SHALL run the Rust and Swift tests for
x86_64 (under Rosetta on an Apple Silicon runner).

#### Scenario: Inspecting a release build
- **WHEN** `lipo -archs` is run on the released app's executable
- **THEN** it lists both `x86_64` and `arm64`

#### Scenario: Intel test run in CI
- **WHEN** the macOS CI job runs
- **THEN** the Rust engine tests and the Swift package tests pass for `x86_64` as well as `arm64`

### Requirement: Ad-hoc signing, no paid account
Release builds SHALL be signed ad hoc and SHALL NOT require an Apple Developer Program membership,
signing certificates or other secrets in CI. The release notes and user documentation SHALL state that
macOS asks the user to approve the app once through System Settings → Privacy & Security → "Open Anyway".

#### Scenario: Release workflow secrets
- **WHEN** the release workflow runs in a fork with no repository secrets configured
- **THEN** it builds the same signed DMG

### Requirement: Versioning and tags
The macOS app SHALL be versioned with semantic versions and git tags of the form `macos-vX.Y.Z`,
independently of the Rust crate versions. The app's version SHALL have exactly one source in the
repository, and every release build SHALL have a higher build number than the previous one. The first
public release SHALL be `1.0.0`.

#### Scenario: Tag and version disagree
- **WHEN** the tag `macos-v1.0.1` is pushed while the repository still declares version `1.0.0`
- **THEN** the release workflow fails before building and creates no release

#### Scenario: Version shown to the user
- **WHEN** a user checks the installed app's version (Finder → Get Info)
- **THEN** it shows the version from the tag it was built for, for example `1.0.0`

### Requirement: DMG contents
Each release SHALL publish one DMG named `Druti-X.Y.Z.dmg`. Mounting it SHALL open a window with a
background image that shows the install steps: open Druti, and if macOS blocks it, use Privacy & Security
→ Open Anyway. The DMG SHALL contain `Druti.app`, a plain-text Read Me with the same steps plus how to
uninstall, and the license notices. It SHALL NOT contain scripts or other executables besides `Druti.app`.

#### Scenario: Mounting the DMG
- **WHEN** a user double-clicks `Druti-1.0.0.dmg`
- **THEN** Finder shows the styled window with `Druti.app`, the Read Me and the licenses, and the background image shows the install steps

### Requirement: Tag-triggered draft release
Pushing a `macos-vX.Y.Z` tag SHALL build the Universal app and the DMG on a macOS CI runner from that
tagged commit, and SHALL create a draft GitHub Release for that tag. The release SHALL have these assets
attached: the DMG, a zip of `Druti.app` named `Druti-X.Y.Z.app.zip` that unpacks to the same signed
bundle as the one in the DMG, and a SHA-256 checksum file for each. The workflow SHALL NOT publish the release; the
maintainer publishes it after testing the downloads. The release notes SHALL include the "Open Anyway"
step, say that the DMG is the recommended download and the zip is for users who prefer it, link to the web playground,
and say that Intel support has not been tested on Intel hardware until that is confirmed.

#### Scenario: Releasing 1.0.0
- **WHEN** the maintainer pushes the tag `macos-v1.0.0`
- **THEN** a draft release "Druti 1.0.0" appears with `Druti-1.0.0.dmg`, `Druti-1.0.0.dmg.sha256`, `Druti-1.0.0.app.zip` and `Druti-1.0.0.app.zip.sha256`, visible only to maintainers

#### Scenario: Verifying a download
- **WHEN** a user runs `shasum -a 256` on the downloaded DMG or zip
- **THEN** the output matches the matching published `.sha256` file

#### Scenario: Installing from the zip
- **WHEN** a user downloads `Druti-1.0.0.app.zip` through a browser, unzips it and opens `Druti.app`, approving it with "Open Anyway"
- **THEN** the installer mode runs exactly as it does from the DMG and Druti ends up in `~/Library/Input Methods`

### Requirement: License notices
The repository SHALL carry an MIT license. The app bundle and the DMG SHALL include that license and
the license notices of every third-party component compiled into the app.

#### Scenario: Checking notices in the app
- **WHEN** a user opens the licenses file from the DMG or from `Druti.app/Contents/Resources`
- **THEN** it contains the MIT license for Druti and a notice for each bundled Rust crate, including UniFFI

### Requirement: User-facing install documentation
The top-level README SHALL link to the latest macOS release and give the steps to download, open,
approve with "Open Anyway" and start typing, plus how to uninstall and update. `macos/README.md` SHALL
keep these user steps separate from the developer build instructions.

#### Scenario: A user who never builds from source
- **WHEN** someone follows only the README's macOS download section on a Mac with macOS 14 or later
- **THEN** they end up typing Bengali with Druti without installing Xcode, Rust or Homebrew

### Requirement: Pre-release verification
Before a release is published, the maintainer SHALL download the DMG built by CI through a browser (so it
carries the quarantine flag) and install it in a macOS user account where Druti has never been installed,
and in one that has an earlier version installed. The maintainer SHALL also confirm that the app compatibility baseline in `macos/COMPATIBILITY.md`
is recorded for that version.

#### Scenario: Publishing 1.0.0
- **WHEN** the maintainer is about to publish the 1.0.0 draft release
- **THEN** the fresh-install check, the upgrade check (not applicable for the first release) and the compatibility table are all done and recorded
