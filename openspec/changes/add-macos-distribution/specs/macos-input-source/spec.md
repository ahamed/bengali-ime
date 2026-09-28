## MODIFIED Requirements

### Requirement: Local install and registration
The project SHALL provide a single developer command that builds the input source, signs it ad hoc,
and installs it into the user's `~/Library/Input Methods` using the app's own installer (the same code
path as the downloadable app). A matching command SHALL uninstall it. Once installed, the input source
SHALL be listed under the Bengali language in System Settings → Keyboard → Input Sources as "Druti",
and SHALL appear in the menu bar's input menu when enabled.

#### Scenario: First install
- **WHEN** the author runs the install command on a Mac with macOS 14 or later
- **THEN** "Druti" is enabled and can be selected from the input menu (after at most one log-out/log-in)

#### Scenario: Reinstall after a code change
- **WHEN** the install command runs again
- **THEN** the next keystroke in any app uses the newly built version, without logging out

#### Scenario: Uninstall
- **WHEN** the uninstall command runs
- **THEN** the input source is removed from `~/Library/Input Methods` and no longer runs

## ADDED Requirements

### Requirement: Installer mode
When `Druti.app` is opened from anywhere other than `~/Library/Input Methods` (for example the mounted
DMG or the Downloads folder), it SHALL act as its own installer rather than as the input method. It
SHALL copy itself to `~/Library/Input Methods/Druti.app`, replacing any existing copy, stop any running
instance, and register the input source with the system. It SHALL need no administrator password and no
developer tools.

#### Scenario: Installing from the DMG
- **WHEN** a user opens `Druti.app` from the mounted DMG and approves it with macOS's "Open Anyway" if asked
- **THEN** `~/Library/Input Methods/Druti.app` exists, the input source is registered, and a dialog reports that the install is done

#### Scenario: The DMG is ejected afterwards
- **WHEN** the user ejects the DMG and deletes the download after installing
- **THEN** Druti keeps working, because it runs from `~/Library/Input Methods`

#### Scenario: Install fails
- **WHEN** the copy or registration fails (for example, the folder is not writable)
- **THEN** a dialog says what failed, and no half-copied bundle is left in `~/Library/Input Methods`

### Requirement: Installed copy starts without Gatekeeper prompts
The installed copy SHALL NOT carry the download quarantine flag, so the system can start it on demand
without showing an approval dialog or silently refusing to launch it. The user SHALL only need to approve the downloaded app
once, when they open it to install.

#### Scenario: First key press after install
- **WHEN** the user selects Druti after installing and types `k` in TextEdit
- **THEN** `ক` appears, with no Gatekeeper dialog and no need to open Privacy & Security again

### Requirement: Enabling and first-run guidance
After installing, the installer SHALL enable Druti so it appears in the menu bar's input menu, without
making it the current input source. It SHALL then show a dialog that explains how to switch input
sources (the input menu, Control-Space or the 🌐 key) and advises keeping ABC or U.S. enabled for
passwords. If enabling fails, the dialog SHALL instead explain how to add Druti manually and offer to
open Keyboard settings.

#### Scenario: Enabled automatically
- **WHEN** the installer finishes on a Mac where enabling succeeds
- **THEN** Druti is listed in the input menu, the current input source is unchanged, and the guidance dialog is shown

#### Scenario: Enabling is refused
- **WHEN** the system does not allow the installer to enable the input source
- **THEN** the dialog explains Input Sources → Edit… → + → Bengali → Druti and offers a button that opens Keyboard settings

### Requirement: In-place upgrade
Opening a newer `Druti.app` from a DMG SHALL replace the installed copy and stop the running one, so
the next key press uses the new version, without the user having to uninstall first or log out. The
user's input menu settings and enabled state SHALL be kept.

#### Scenario: Upgrading from 1.0.0 to 1.0.1
- **WHEN** a user with 1.0.0 installed and enabled opens the 1.0.1 DMG's `Druti.app`
- **THEN** the next key press uses 1.0.1, Druti is still enabled, and the digits/দাঁড়ি/quotes toggles are unchanged

### Requirement: Uninstall from the input menu
The input menu SHALL offer "Uninstall Druti…". After the user confirms, Druti SHALL disable its input
source, move `~/Library/Input Methods/Druti.app` to the Trash, remove its stored settings and quit.
Cancelling SHALL change nothing.

#### Scenario: Confirmed uninstall
- **WHEN** the user chooses Uninstall Druti… and confirms
- **THEN** Druti disappears from the input menu, the bundle is in the Trash, and the next key press goes to another enabled input source

#### Scenario: Cancelled uninstall
- **WHEN** the user chooses Uninstall Druti… and cancels
- **THEN** Druti stays installed, enabled and selected, and typing continues as before
