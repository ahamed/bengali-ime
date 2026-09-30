## RENAMED Requirements

- FROM: `### Requirement: Grapheme backspace in pending text`
- TO: `### Requirement: Letter backspace`

## MODIFIED Requirements

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

## ADDED Requirements

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
