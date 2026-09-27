# Spec Delta

## Purpose

Turns the engine's rewriting edit actions into what a marked-text input method can show: text that
is final in the document, plus a short pending tail that later keys may still change. Every
keystroke shows its exact Bengali immediately.

## ADDED Requirements

### Requirement: Commit and pending split
After every key, the composer SHALL report (a) text to commit, which becomes final in the document,
and (b) the complete pending text that replaces any previous pending text. Committed text plus
pending text SHALL always equal the engine output accumulated since the last reset. The pending
text SHALL be exactly the engine's buffer, except for a held `-` or `।` (see "Holding a trailing hyphen or dari").

#### Scenario: Consonant stays pending
- **WHEN** `k` is pressed
- **THEN** nothing is committed and the pending text is `ক`

#### Scenario: Aspiration rewrites only the pending text
- **WHEN** `k` then `h` are pressed
- **THEN** after `h` nothing is committed and the pending text is `খ`

#### Scenario: Kar flushes the cluster
- **WHEN** `k`, `h`, `u` are pressed
- **THEN** after `u`, `খু` is committed and the pending text is empty

#### Scenario: Space ends the word
- **WHEN** `k`, `h`, `u`, `b`, space are pressed
- **THEN** after space, `ব ` is committed, the pending text is empty, and the total committed text is `খুব `

#### Scenario: Vowel sign change stays pending
- **WHEN** `k`, `O` are pressed and then `i`
- **THEN** after `O` the pending text is `কো`, and after `i`, `কৈ` is committed with nothing pending

### Requirement: Keys the engine does not map are typed literally
A single-character key with no Bengali mapping (for example `?`, `!`, `/`, `(`, `)`, `@`, `;`) SHALL
commit any pending text followed by the key's own character, and end the cluster, so later keys
never rewrite across it. This is the engine's own behaviour; the composer passes it through.

#### Scenario: Question mark after a word
- **WHEN** `k`, `i`, `?` are pressed
- **THEN** the total committed text is `কি?` and nothing is pending

#### Scenario: Symbol while a cluster is pending
- **WHEN** `k` is pressed (pending `ক`) and then `(`
- **THEN** `ক(` is committed and nothing is pending, and a following `h` produces `হ`, not `খ`

### Requirement: Committed text is never rewritten during normal typing
Except for the one case in "Rewriting text outside the composer", the composer SHALL NOT ask the
host to change text it has already committed. This SHALL be verified by replaying the random key
sequences from the engine fixtures through the composer.

#### Scenario: Random typing never reaches committed text
- **WHEN** every seeded random key sequence is replayed through the composer
- **THEN** no update asks the host to replace or delete committed text

### Requirement: Holding a trailing hyphen or dari
When a key inserts a `-` or a `।` and leaves the engine buffer empty, the composer SHALL hold that
character as pending instead of committing it, because the next key may rewrite it (`--` → `—`,
`।` + `.` → `..`). Any other key SHALL commit the held character along with that key's own result.

#### Scenario: Double hyphen becomes an em dash
- **WHEN** `-` then `-` are pressed
- **THEN** after the first key the pending text is `-`, and after the second key `—` is committed with nothing pending

#### Scenario: Single hyphen followed by a letter
- **WHEN** `-` then `k` are pressed
- **THEN** after `k`, `-` is committed and the pending text is `ক`

#### Scenario: Ellipsis after a dari
- **WHEN** `a`, `.`, `.`, `.` are pressed
- **THEN** after the first `.` the pending text is `।`, and the total committed text at the end is `আ...` with nothing pending

### Requirement: Rewriting text outside the composer
When the engine rewrites text that precedes the composer's pending text (for example a `-` that
already existed in the document before the caret), the composer SHALL report how many UTF-16 code
units of committed text to replace, together with the text that replaces them.

#### Scenario: Hyphen already in the document
- **WHEN** after a reset, `-` is pressed with text-before-caret ending in `-`
- **THEN** the update asks the host to replace 1 unit before the caret with `—`

#### Scenario: Dari already in the document
- **WHEN** after a reset, `.` is pressed with text-before-caret ending in `।`
- **THEN** the update asks the host to replace 1 unit before the caret with `..`

### Requirement: Grapheme backspace in pending text
When pending text exists, Backspace SHALL remove the last extended grapheme cluster of the pending
text and end the cluster: any remaining pending text is committed and the next key starts a new
cluster. This intentionally differs from the engine's keystroke-undo Backspace. When no pending text
exists, the composer SHALL report Backspace as not handled so the host application deletes text by
its own rules, and SHALL reset itself.

#### Scenario: Remove a whole conjunct
- **WHEN** `k`, `k`, `h` are pressed (pending `ক্ষ`) and then Backspace
- **THEN** the pending text is empty and nothing is committed

#### Scenario: Remove an aspirated consonant
- **WHEN** `k`, `h` are pressed (pending `খ`) and then Backspace
- **THEN** the pending text is empty

#### Scenario: Nothing pending
- **WHEN** Backspace is pressed right after a space
- **THEN** the update reports the key as not handled and changes nothing

### Requirement: Document context with fallback
When the host supplies the text before the pending text, the composer SHALL give the engine that text
followed by the pending text. When the host cannot supply it, the text the composer has itself
produced since the last reset SHALL be used instead (the engine's own output).

#### Scenario: Host provides context
- **WHEN** after a reset the host supplies text-before-caret `ক` and `i` is pressed
- **THEN** `ি` is committed

#### Scenario: Host cannot provide context mid-typing
- **WHEN** the host never supplies context and the keys `a`, `m`, space, `i` are pressed
- **THEN** the composer uses its own output as context and produces the same text as the engine given that context

#### Scenario: Host cannot provide context after reset
- **WHEN** the composer is reset without context and `i` is pressed
- **THEN** `ই` is committed

### Requirement: Flush and reset
Flush SHALL commit all pending text and leave the engine ready for a new cluster. Reset SHALL discard
engine state without committing anything, optionally seeding it with the text before the caret.

#### Scenario: Flush on focus change
- **WHEN** pending text is `খ` and flush is requested
- **THEN** `খ` is committed and the pending text is empty

#### Scenario: Reset after caret move
- **WHEN** reset is requested while pending text is `খ`
- **THEN** the update commits nothing, and the next key starts a new cluster

### Requirement: Output toggles
The composer SHALL support three settings, all on by default: Bengali digits, দাঁড়ি for `.`, and
typographic quotes. With all three on, output SHALL be identical to the engine with default
behaviour. With a setting off, the matching key SHALL produce its ASCII character instead: the digit,
`.`, `"` or `'`.

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
