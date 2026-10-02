# Spec Delta

## MODIFIED Requirements

### Requirement: Commit and pending split
After every key, the composer SHALL report (a) text to commit, which becomes final in the document,
and (b) the complete pending text that replaces any previous pending text. Committed text plus
pending text SHALL always equal the engine output accumulated since the last reset, with each word
resolved when smart hasant is on (see the conjunct-resolution spec).

The pending text SHALL be the Bengali word being typed: the Bengali letters, signs, kars, hasant,
nukta and joiners that end that output since the last flush or reset. It always contains the
engine's buffer. Anything else ends the word and SHALL be committed with everything before it: a
space, a digit, punctuation, a symbol or a quote. The only exception is a held `-` or `।` (see
"Holding a trailing hyphen or dari").

#### Scenario: Consonant stays pending
- **WHEN** `k` is pressed
- **THEN** nothing is committed and the pending text is `ক`

#### Scenario: Aspiration rewrites only the pending text
- **WHEN** `k` then `h` are pressed
- **THEN** after `h` nothing is committed and the pending text is `খ`

#### Scenario: Kar stays in the pending word
- **WHEN** `k`, `h`, `u` are pressed
- **THEN** after `u` nothing is committed and the pending text is `খু`

#### Scenario: Space commits the word
- **WHEN** `k`, `h`, `u`, `b`, space are pressed
- **THEN** after `b` the pending text is `খুব`, and after space `খুব ` is committed with nothing pending

#### Scenario: Vowel sign change stays pending
- **WHEN** `k`, `O` are pressed and then `i`
- **THEN** after `O` the pending text is `কো`, and after `i` the pending text is `কৈ` with nothing committed

#### Scenario: Digit commits the word
- **WHEN** `k` then `1` are pressed
- **THEN** after `1`, `ক১` is committed with nothing pending

#### Scenario: Resolved word is committed
- **WHEN** smart hasant is on and `k`, `o`, `r`, `t`, `e`, space are pressed
- **THEN** after `e` the pending text is `করতে`, and after space `করতে ` is committed with nothing pending

### Requirement: Output toggles
The composer SHALL support four settings. Bengali digits, দাঁড়ি for `.`, and typographic quotes are
on by default; smart hasant is off by default. With the three on and smart hasant off, output SHALL
be identical to the engine with default behaviour. With one of the three off, the matching key SHALL
produce its ASCII character instead: the digit, `.`, `"` or `'`. With smart hasant on, words are
resolved as the conjunct-resolution spec describes.

#### Scenario: Defaults
- **WHEN** `1`, space, `.`, space are pressed with default settings
- **THEN** `১ । ` is committed

#### Scenario: ASCII digits
- **WHEN** Bengali digits is off and `2` is pressed
- **THEN** `2` is committed

#### Scenario: Plain full stop
- **WHEN** দাঁড়ি for `.` is off and `.` is pressed
- **THEN** `.` is committed

#### Scenario: Straight quotes
- **WHEN** typographic quotes is off and `"` is pressed
- **THEN** `"` is committed

#### Scenario: Smart hasant off by default
- **WHEN** `korte` and space are pressed with default settings
- **THEN** `কর্তে ` is committed

#### Scenario: Smart hasant on
- **WHEN** smart hasant is on and `korte` and space are pressed
- **THEN** `করতে ` is committed

#### Scenario: Setting change applies from the next key
- **WHEN** `kort` is pressed, smart hasant is turned on, and `e` is pressed
- **THEN** the pending text is `করতে`

## ADDED Requirements

### Requirement: Checking resolved text before the caret
With smart hasant on, checking the text before the caret SHALL compare it with the composer's output
as the host shows it, with each word resolved. A host that shows a resolved word SHALL NOT be treated
as having moved the caret.

#### Scenario: Resolved word in the document
- **WHEN** smart hasant is on, `korte` and space are pressed, and the host reports `করতে ` before the caret
- **THEN** the text before the caret matches the composer
