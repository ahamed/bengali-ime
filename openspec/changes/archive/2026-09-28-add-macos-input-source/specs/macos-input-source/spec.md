# Spec Delta

## Purpose

A macOS input source named "Druti" that types Bengali with the bengali-ime algorithm in any
app. It shows the exact Bengali on every keystroke and installs locally without a paid Apple
Developer account.

## ADDED Requirements

### Requirement: Local install and registration
The project SHALL provide a single command that builds the input source, signs it ad hoc, installs it
into the user's `~/Library/Input Methods`, and restarts any running instance. A matching command
SHALL uninstall it. Once installed, the input source SHALL be listed under the Bengali language in
System Settings → Keyboard → Input Sources as "Druti", and SHALL appear in the menu bar's
input menu when enabled.

#### Scenario: First install
- **WHEN** the author runs the install command on an Apple Silicon Mac with macOS 14 or later
- **THEN** "Druti" can be added in Input Sources (after at most one log-out/log-in) and selected from the input menu

#### Scenario: Reinstall after a code change
- **WHEN** the install command runs again
- **THEN** the next keystroke in any app uses the newly built version, without logging out

#### Scenario: Uninstall
- **WHEN** the uninstall command runs
- **THEN** the input source is removed from `~/Library/Input Methods` and no longer runs

### Requirement: Immediate Bengali on every key
While Druti is active, every printable key without Command, Control or Option SHALL be
consumed and SHALL immediately show its Bengali result in the focused text field, following the
composer's commit/pending split. Committed text SHALL be inserted as normal text. Pending text SHALL
be shown as marked text that asks the app to draw no underline.

#### Scenario: Typing a word in TextEdit
- **WHEN** the author types `khub` in TextEdit
- **THEN** the field shows `ক`, then `খ`, then `খু`, then `খুব` after each key, and no roman letters appear at any point

#### Scenario: App that ignores the no-underline request
- **WHEN** the author types in an app that draws its own marked-text underline
- **THEN** only the pending cluster (for example `ব` in `খুব`) is underlined, and it becomes normal text on the next committing key

### Requirement: Key routing
The input source SHALL route keys as follows:
- Space goes to the engine, and its result is committed.
- Return/Enter commits pending text, then goes to the app.
- Backspace follows the composer (grapheme delete in pending text); otherwise it goes to the app.
- Arrow keys, Tab, Escape, Home, End, Page Up and Page Down commit pending text, then go to the app.
- Any key combined with Command, Control or Option commits pending text, then goes to the app.

#### Scenario: Enter sends a chat message with the whole word
- **WHEN** the author types `ami` and presses Return in a chat app
- **THEN** `আমি` is committed and the app receives Return, so the message sent contains `আমি`

#### Scenario: Keyboard shortcut mid-word
- **WHEN** pending text is `খ` and the author presses Command-S
- **THEN** `খ` is committed and the app handles Command-S

#### Scenario: Backspace on committed text
- **WHEN** nothing is pending and the author presses Backspace
- **THEN** the app performs its own deletion

### Requirement: Pending text is committed when focus leaves
When the input source is switched away, the text field loses focus, or the system asks the input
method to commit its composition, pending text SHALL be committed and never discarded.

#### Scenario: Switching to ABC mid-word
- **WHEN** pending text is `খ` and the author switches to the ABC input source
- **THEN** `খ` remains in the document as normal text

### Requirement: Reading the text before the caret
When a key could depend on the document (nothing pending, and the key is a vowel, a quote, `-` or `.`),
the input source SHALL read the text before the caret from the app, up to a bounded window, and give
it to the composer. When the app cannot supply that text, the input source SHALL continue without it.

#### Scenario: Kar attaches after clicking next to a consonant
- **WHEN** in TextEdit the author clicks right after an existing `ক` and types `i`
- **THEN** the result is `কি`

#### Scenario: App without text access
- **WHEN** in an app that does not expose its text (for example Terminal) the author clicks after an existing `ক` and types `i`
- **THEN** the result is `কই` and nothing else in the document changes

### Requirement: Caret-move detection
Before handling a key, the input source SHALL check whether the caret is where its last update left
it. If the caret has moved (click, paste, app-side edits), the input source SHALL reset the composer
before handling the key, so a new cluster is never built on text that isn't there.

#### Scenario: Click elsewhere and continue typing
- **WHEN** the author types `k`, clicks at another position in the document, and types `h`
- **THEN** the original `ক` stays as it is, and `h` starts a new cluster at the new position (`হ`)

### Requirement: Input menu
The input menu SHALL offer checkable toggles for Bengali digits, দাঁড়ি for `.`, and typographic
quotes, all on by default. Choices SHALL persist across restarts and apply to the next key typed.
The menu SHALL also offer "Convert selection to Bengali".

#### Scenario: Turning off Bengali digits
- **WHEN** the author unchecks Bengali digits and types `2024`
- **THEN** `2024` is inserted, and the setting is still off after logging out and back in

### Requirement: Convert selection
"Convert selection to Bengali" SHALL replace the selected roman text with the result of bulk
transpilation (line breaks preserved, current toggles applied) in apps that expose the selection.
In apps that don't, the command SHALL leave the document unchanged.

#### Scenario: Converting a pasted roman paragraph
- **WHEN** the author selects `ami banglay gan gai` in TextEdit and runs Convert selection
- **THEN** the selection is replaced with `আমি বাংলায় গান গাই`

#### Scenario: App without selection access
- **WHEN** the command is used in an app that does not expose its selection
- **THEN** the document is unchanged

### Requirement: Secure fields and resilience
The input source SHALL NOT handle keys in secure (password) fields, where macOS already bypasses
input methods. A failure in the input source SHALL NOT stop the author from switching to another
input source.

#### Scenario: Password field
- **WHEN** the author types into a password field while Druti is selected
- **THEN** the typed characters are the plain ASCII characters

### Requirement: App compatibility baseline
Before v1 is considered done, typing a fixed test paragraph SHALL produce the expected Bengali, with
no stray or duplicated characters, in TextEdit, Notes, Pages, Safari, Chrome, VS Code, Slack,
Terminal, iTerm2, Spotlight and Microsoft Word (if installed). Where document context or selection
isn't available, the degraded behaviour defined above is acceptable.

#### Scenario: Terminal
- **WHEN** the test paragraph is typed in Terminal
- **THEN** the output matches the expected Bengali, allowing only the documented no-context behaviour after caret moves
