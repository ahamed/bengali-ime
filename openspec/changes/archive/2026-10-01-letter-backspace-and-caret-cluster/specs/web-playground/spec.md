## MODIFIED Requirements

### Requirement: Playground editor shows committed and pending text
The playground SHALL provide an editor where every key the composer handles, Backspace included, is
sent to it together with the text before the caret. The editor SHALL apply each update: delete
`replaceBefore` units before the pending text, replace the pending text with `commit`, and show the
new pending text. Pending text SHALL be shown inline and underlined, as macOS shows marked text, and the
caret SHALL sit after it. Keys the composer does not handle SHALL keep their normal browser behaviour
after the update is applied.

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
- **WHEN** the user types `dm` and presses Backspace
- **THEN** the editor shows `দ` underlined

#### Scenario: Backspace through a committed word
- **WHEN** the user types `korote` and presses Backspace three times
- **THEN** the editor shows `করত`, then `কর`, then `ক`

#### Scenario: Backspace on a committed conjunct
- **WHEN** the editor contains `দ্ম` with nothing underlined and the user presses Backspace at its end
- **THEN** the editor shows `দ`, with no hasant left

### Requirement: Playground resets on caret moves and outside edits
When the caret moves by mouse or navigation key, when text is pasted, or when the editor loses focus, the
playground SHALL commit any pending text and reset the composer. The next key then reads the actual
text before the caret, and continues the consonant cluster that ends there. A modifier key pressed
on its own (Shift, Control, Option, Command, Caps Lock) SHALL NOT commit or reset anything, because
it only changes the next key.

#### Scenario: Click elsewhere mid-cluster
- **WHEN** the user types `k`, clicks right after a space elsewhere and types `h`
- **THEN** `ক` stays where it was and `হ` is inserted at the new position

#### Scenario: Kar attaches to existing text
- **WHEN** the editor already contains `ক`, the user clicks right after it and types `i`
- **THEN** the editor shows `কি`

#### Scenario: Kar in the middle of a word
- **WHEN** the editor contains `করতে`, the user places the caret right after `র` and types `i`
- **THEN** the editor shows `করিতে`

#### Scenario: Consonant continues the cluster at the caret
- **WHEN** the editor contains `করত`, the user places the caret at its end and types `h`
- **THEN** the editor shows `করথ`, with `থ` underlined

#### Scenario: Shift for a capital letter keeps the cluster
- **WHEN** the user types `eko`, then holds Shift and types `T`, then `a`
- **THEN** the editor shows `একটা`, not `এক্টা`
