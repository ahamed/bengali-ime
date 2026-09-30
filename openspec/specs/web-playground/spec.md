# web-playground Specification

## Purpose
Runs Druti's Rust engine in the browser through WebAssembly and offers a public playground where anyone
can try the same typing model as the macOS input source without installing anything.

## Requirements
### Requirement: WASM bindings expose the composer
The WebAssembly package SHALL expose the composer to JavaScript. It SHALL support:
- creating a composer with a settings object;
- a key with optional text before the caret;
- backspace;
- flush;
- reset with optional text before the caret;
- checking a text before the caret against the composer;
- reading the pending text;
- reading and changing the settings.

Each key, backspace, flush or reset SHALL return an update with the same three fields as the native
composer (`commit`, `pending`, `handled`). The values SHALL be identical to what the native composer
returns for the same inputs.

#### Scenario: Aspiration in the browser
- **WHEN** JavaScript creates a composer with default settings and sends `k`, then `h`
- **THEN** the first update has pending `ক` and commits nothing, and the second has pending `খ` and commits nothing

#### Scenario: Commit on a word break
- **WHEN** JavaScript sends `a`, `m`, `i`, then a space
- **THEN** the commits of the four updates join to `আমি ` and the last update leaves no pending text

#### Scenario: Default settings
- **WHEN** JavaScript asks for the default settings
- **THEN** Bengali digits, দাঁড়ি for `.` and smart quotes are all on

### Requirement: WASM bindings expose bulk transliteration
The WebAssembly package SHALL expose bulk conversion of a roman document with a line-break option and
settings. Its output SHALL be identical to the native bulk conversion for the same input, option and settings.

#### Scenario: Multi-line document
- **WHEN** `ami banglay gan gai\nami banglar gan gai` is converted with line breaks preserved and default settings
- **THEN** the result is two lines of Bengali with the newline kept between them, identical to the native result

### Requirement: Playground editor shows committed and pending text
The playground SHALL provide an editor that sends every key the composer handles to it: typed keys
with the text before the caret, and Backspace. The editor SHALL apply each update: replace the
pending text with `commit`, then show the new pending text. Pending text (the word being typed)
SHALL be shown inline and underlined, as macOS shows marked text, and the caret SHALL sit after it.
Keys the composer does not handle SHALL keep their normal browser behaviour after the update is
applied.

#### Scenario: Pending consonant is underlined
- **WHEN** the user types `k` in an empty editor
- **THEN** the editor shows `ক` underlined, with the caret after it

#### Scenario: Word committed
- **WHEN** the user types `ami` and then a space
- **THEN** the editor shows `আমি ` with nothing underlined

#### Scenario: Unhandled navigation key
- **WHEN** pending text is showing and the user presses an arrow key
- **THEN** the pending text is committed as it is and the caret moves as normal

#### Scenario: Backspace in a pending conjunct
- **WHEN** the user types `podmo` and presses Backspace
- **THEN** the editor shows `পদ` underlined

#### Scenario: Backspace through the word being typed
- **WHEN** the user types `korote` and presses Backspace three times
- **THEN** the editor shows `করত`, then `কর`, then `ক`

#### Scenario: Consonant after Backspace
- **WHEN** the user types `ka`, presses Backspace and types `k`
- **THEN** the editor shows `কক`

#### Scenario: Backspace on committed text
- **WHEN** the editor contains `দ্ম` with nothing underlined and the user presses Backspace at its end
- **THEN** the browser deletes one code point and the editor shows `দ্`

### Requirement: Playground resets on caret moves and outside edits
When the caret moves by mouse or navigation key, when text is pasted, or when the editor loses focus,
the playground SHALL commit any pending text and reset the composer. The next key then reads the
actual text before the caret: a vowel attaches to it as a kar, and a consonant starts a new letter.
A modifier key pressed on its own (Shift, Control, Option, Command, Caps Lock) SHALL NOT commit or
reset anything, because it only changes the next key.

#### Scenario: Click elsewhere mid-word
- **WHEN** the user types `k`, clicks right after a space elsewhere and types `h`
- **THEN** `ক` stays where it was and `হ` is inserted at the new position

#### Scenario: Kar attaches to existing text
- **WHEN** the editor already contains `ক`, the user clicks right after it and types `i`
- **THEN** the editor shows `কি`

#### Scenario: Kar in the middle of a word
- **WHEN** the editor contains `করতে`, the user places the caret right after `র` and types `i`
- **THEN** the editor shows `করিতে`

#### Scenario: Consonant after a caret move starts a new letter
- **WHEN** the editor contains `করত`, the user places the caret at its end and types `h`
- **THEN** the editor shows `করতহ`, with `হ` underlined

#### Scenario: Shift for a capital letter keeps the word
- **WHEN** the user types `eko`, then holds Shift and types `T`, then `a`
- **THEN** the editor shows `একটা`, underlined as one word

### Requirement: Playground settings toggles
The playground SHALL offer toggles for Bengali digits, দাঁড়ি for `.` and smart quotes, all on by
default. Changing a toggle SHALL apply from the next key in the editor and to the next bulk conversion.

#### Scenario: ASCII digits
- **WHEN** the user turns Bengali digits off and types `2`
- **THEN** the editor shows `2`

### Requirement: Playground English mode
The playground SHALL offer an English-mode toggle. Turning it on SHALL commit any pending text, and while
it is on, keys SHALL go into the editor unchanged. Turning it off SHALL reset the composer so the next key
starts a new Bengali cluster. The current mode SHALL be visible next to the toggle.

#### Scenario: Typing English
- **WHEN** English mode is on and the user types `khub`
- **THEN** the editor shows `khub`

#### Scenario: Switching back
- **WHEN** English mode is turned off and the user types `khub`
- **THEN** the editor shows `খুব`

### Requirement: Playground bulk transliteration panel
The playground SHALL offer a panel where the user pastes roman text, chooses whether to keep line breaks,
and converts it with the current settings into a read-only Bengali output field.

#### Scenario: Convert sample text
- **WHEN** the user converts the prefilled sample with line breaks kept
- **THEN** the output field shows the Bengali text with the same line structure

### Requirement: Link to the macOS download
The playground SHALL link to the latest macOS release on GitHub, so visitors can install Druti.

#### Scenario: Download link
- **WHEN** a visitor opens the playground
- **THEN** a visible "Download for macOS" link points to `https://github.com/ahamed/druti-ime/releases/latest`

### Requirement: Public deployment
Every push to `main` SHALL build the WebAssembly package and the playground from that commit and deploy
them to GitHub Pages at `https://ahamed.github.io/druti-ime/`. Pull requests SHALL build the playground
in CI without deploying it. The deployed playground SHALL need no server beyond static hosting.

#### Scenario: Merge to main
- **WHEN** a change to the engine is merged into `main`
- **THEN** after the workflow finishes, the public playground types with the new engine

#### Scenario: Broken playground build
- **WHEN** a pull request breaks the WASM or playground build
- **THEN** CI fails on that pull request
