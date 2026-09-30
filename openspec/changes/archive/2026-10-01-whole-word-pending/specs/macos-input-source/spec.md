## MODIFIED Requirements

### Requirement: Immediate Bengali on every key
While Druti is active, every printable key without Command, Control or Option SHALL be
consumed and SHALL immediately show its Bengali result in the focused text field, following the
composer's commit/pending split. Committed text SHALL be inserted as normal text. Pending text (the
word being typed) SHALL be shown as marked text that asks the app to draw no underline. The input
source SHALL never ask the app to replace text it has committed.

#### Scenario: Typing a word in TextEdit
- **WHEN** the author types `khub` in TextEdit
- **THEN** the field shows `ক`, then `খ`, then `খু`, then `খুব` after each key, and no roman letters appear at any point

#### Scenario: App that ignores the no-underline request
- **WHEN** the author types `khub` in an app that draws its own marked-text underline
- **THEN** the word being typed (`খুব`) is underlined, and it becomes normal text on the next word break

### Requirement: Key routing
The input source SHALL route keys as follows:
- Space goes to the engine, and its result is committed.
- Return/Enter commits pending text, then goes to the app.
- Backspace removes one letter of the pending word (`দ্ম` → `দ`); with nothing pending it goes to the
  app.
- Arrow keys, Tab, Escape, Home, End, Page Up and Page Down commit pending text, then go to the app.
- Any key combined with Command, Control or Option commits pending text, then goes to the app.

#### Scenario: Enter sends a chat message with the whole word
- **WHEN** the author types `ami` and presses Return in a chat app
- **THEN** `আমি` is committed and the app receives Return, so the message sent contains `আমি`

#### Scenario: Keyboard shortcut mid-word
- **WHEN** pending text is `খ` and the author presses Command-S
- **THEN** `খ` is committed and the app handles Command-S

#### Scenario: Backspace in the word being typed
- **WHEN** the author types `podmo` in any app, including Chromium-based apps and Cursor, and presses Backspace
- **THEN** the field shows `পদ`, with no hasant left

#### Scenario: Backspace on committed text
- **WHEN** nothing is pending and the author presses Backspace
- **THEN** the app performs its own deletion

### Requirement: Caret-move detection
Before handling a key, the input source SHALL check whether the caret is where its last update left
it. When the position differs, it SHALL read the text before the caret and ask the composer whether
that text matches what it typed. If it matches, the input source SHALL continue without a reset,
because some apps report the caret late or only for the text near it. Otherwise, or when the app
exposes no text, a moved caret (click, paste, app-side edits) SHALL reset the composer before the key
is handled, so a new word is never built on text that isn't there.

#### Scenario: Click elsewhere and continue typing
- **WHEN** the author types `k`, clicks at another position in the document, and types `h`
- **THEN** the original `ক` stays as it is, and `h` starts a new word at the new position (`হ`)

#### Scenario: An app reports the caret late
- **WHEN** in Cursor the author types `ekoTa podmo`, and Cursor reports the caret one step behind after some keys
- **THEN** the field shows `একটা পদ্ম`
