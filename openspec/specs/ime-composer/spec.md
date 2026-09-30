# ime-composer Specification

## Purpose
Turns the engine's rewriting edit actions into what a marked-text input method can show: text that
is final in the document, plus a short pending tail that later keys may still change. Every
keystroke shows its exact Bengali immediately.
## Requirements
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
The composer SHALL NOT ask the host to change text it has already committed, except in three cases:
- the one case in "Rewriting text outside the composer";
- the first key that continues a resumed cluster (see "Resuming the cluster before the caret");
- Backspace on committed text (see "Letter backspace").

This SHALL be verified by replaying the random key sequences from the engine fixtures through the
composer, with no resets and no Backspace.

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

### Requirement: Letter backspace
Backspace SHALL remove one letter, as the engine's letter backspace defines it, with the same
result the engine gives. Backspace MAY take the committed text before the pending text, when the host
can read it.

When pending text exists, the composer SHALL remove the last letter of the pending text. Afterwards
the pending text SHALL be the resumed cluster (the trailing consonant run before the caret), and any
other remaining pending text SHALL be committed.

When no pending text exists and the host supplies text before the caret that ends in a Bengali
letter, the composer SHALL handle the key: it asks the host to delete that letter through
`replace_before`, commits nothing, and leaves the pending text empty. The consonant run left before
the caret becomes the cluster, but stays plain text until the next key rewrites it (see "Resuming the
cluster before the caret").

When no pending text exists and the host supplies no text, or text that doesn't end in a Bengali
letter, the composer SHALL report Backspace as not handled so the host deletes by its own rules. It
SHALL then reset itself and resume the cluster from the text supplied with the next key.

#### Scenario: Remove one consonant from a conjunct
- **WHEN** `d`, `m` are pressed (pending `দ্ম`) and then Backspace
- **THEN** nothing is committed and the pending text is `দ`

#### Scenario: Remove the last consonant of ক্ষ
- **WHEN** `k`, `k`, `h` are pressed (pending `ক্ষ`) and then Backspace
- **THEN** nothing is committed and the pending text is `ক`

#### Scenario: Remove an aspirated consonant
- **WHEN** `k`, `h` are pressed (pending `খ`) and then Backspace
- **THEN** the pending text is empty

#### Scenario: Remainder stays live
- **WHEN** `d`, `m` are pressed, then Backspace, then `h`
- **THEN** nothing is committed and the pending text is `ধ`

#### Scenario: Remaining vowel is committed
- **WHEN** `O`, `C` are pressed (pending `ওছ`) and then Backspace
- **THEN** `ও` is committed and the pending text is empty

#### Scenario: Held hyphen
- **WHEN** `-` is pressed (pending `-`) and then Backspace
- **THEN** nothing is committed and the pending text is empty

#### Scenario: Committed conjunct loses one consonant
- **WHEN** nothing is pending and Backspace is pressed with text-before-caret `দ্ম`
- **THEN** the update is handled, asks the host to delete 2 units before the caret, and commits nothing

#### Scenario: Committed kar is removed on its own
- **WHEN** nothing is pending and Backspace is pressed with text-before-caret `করতে`
- **THEN** the update is handled and asks the host to delete 1 unit before the caret

#### Scenario: Committed remainder continues on the next key
- **WHEN** nothing is pending, Backspace is pressed with text-before-caret `করতে`, and then `h` is pressed with text-before-caret `করত`
- **THEN** the second update asks the host to replace 1 unit before the caret and shows pending `থ`

#### Scenario: Nothing pending and no context
- **WHEN** Backspace is pressed right after a space, with no text-before-caret
- **THEN** the update reports the key as not handled and changes nothing

#### Scenario: Text before the caret is not Bengali
- **WHEN** nothing is pending and Backspace is pressed with text-before-caret `আমি `
- **THEN** the update reports the key as not handled and changes nothing

### Requirement: Resuming the cluster before the caret
After a reset, and after every Backspace, the composer SHALL resume the cluster from the text before
the caret. That text is what was supplied with the reset or the Backspace, or otherwise what is
supplied with the next key. The trailing consonant run of that text (as the engine's resume defines
it) becomes the cluster. When the next key continues the run, the composer SHALL ask the host to
replace the run through `replace_before`, and SHALL show the whole new cluster as pending text.

The composer SHALL NOT resume at any other time, so a cluster the engine ended itself stays ended even
when the host supplies context with every key.

To let hosts supply that context, the keys that read the document (`key_reads_document`) SHALL include
every consonant key and `^`, in addition to vowels, `-`, `.`, `"` and `'`.

#### Scenario: Aspiration after a caret move
- **WHEN** the composer is reset with text-before-caret `করত` and `h` is pressed
- **THEN** the update asks the host to replace 1 unit before the caret, commits nothing, and shows pending `থ`

#### Scenario: Conjunct after a reset without context
- **WHEN** the composer is reset without context and `m` is pressed with text-before-caret `দ`
- **THEN** the update asks the host to replace 1 unit before the caret and shows pending `দ্ম`

#### Scenario: Kar after a resumed conjunct
- **WHEN** the composer is reset with text-before-caret `এক`, then `T` and `a` are pressed
- **THEN** after `T` the pending text is `ক্ট`, and after `a`, `ক্টা` is committed with nothing pending

#### Scenario: Vowel in the middle of a word
- **WHEN** the composer is reset with text-before-caret `কর` and `i` is pressed
- **THEN** `ি` is committed and nothing is replaced

#### Scenario: Nothing to resume after a kar
- **WHEN** the composer is reset with text-before-caret `কি` and `h` is pressed
- **THEN** nothing is replaced and the pending text is `হ`

#### Scenario: Silent o is not undone by context
- **WHEN** `k`, `o`, `m` are pressed with the text before the caret supplied for every key
- **THEN** nothing is replaced and the total text is `কম`

#### Scenario: Consonant keys read the document
- **WHEN** a host asks whether `h`, `k` or `i` read the document
- **THEN** the answer is yes for each, and no for `1` and space

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
