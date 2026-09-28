## MODIFIED Requirements

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
