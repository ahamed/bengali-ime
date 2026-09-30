## RENAMED Requirements

- FROM: `### Requirement: Keystroke-undo backspace`
- TO: `### Requirement: Letter backspace`

## MODIFIED Requirements

### Requirement: Letter backspace
Engine-level backspace SHALL delete the last letter of the output, where a letter is:
- a Bengali consonant (a precomposed nukta letter counts as one), together with a combining nukta
  after it and, when it is joined to a previous consonant, the hasant before it;
- otherwise, a single other Bengali code point: a kar, a sign (`ং ঃ ঁ`), an independent vowel, a
  digit, `।`, or a lone hasant;
- for text that isn't Bengali, one extended grapheme cluster.

Backspace SHALL NOT leave a hasant at the end of the output unless one was already there before the
deleted letter. It SHALL return a single delete action whose back count is the letter's length in
UTF-16 code units. It does nothing on an empty output. It never undoes a keystroke that produced no
visible text, such as the silent `o`. After deleting, the engine SHALL resume the cluster from the
output (see "Resuming the cluster from the output") and clear the silent-`o` state.

#### Scenario: Backspace inside a conjunct
- **WHEN** the keys `k`, `k`, `h` are processed and then backspace
- **THEN** a delete of 2 units is returned, and the output and buffer are both `ক`

#### Scenario: Backspace on a two-consonant conjunct
- **WHEN** the keys `d`, `m` are processed and then backspace
- **THEN** a delete of 2 units is returned, and the output and buffer are both `দ`

#### Scenario: Aspirated consonant is one letter
- **WHEN** the keys `k`, `h` are processed and then backspace
- **THEN** a delete of 1 unit is returned, and the output and buffer are both empty

#### Scenario: Three-consonant conjunct loses one consonant at a time
- **WHEN** the output is assigned `ন্ত্র` and backspace is processed twice
- **THEN** the output is `ন্ত` after the first backspace and `ন` after the second

#### Scenario: Kar is removed on its own
- **WHEN** the keys `k`, `o`, `r`, `o`, `t`, `e` are processed and then backspace three times
- **THEN** the output is `করত`, then `কর`, then `ক`

#### Scenario: Silent o does not use up a backspace
- **WHEN** the keys `k`, `o` are processed and then backspace
- **THEN** a delete of 1 unit is returned and the output is empty

#### Scenario: Remainder continues the cluster
- **WHEN** the keys `d`, `m` are processed, then backspace, then `h`
- **THEN** the output is `ধ`

#### Scenario: Backspace after a resync
- **WHEN** the output is assigned `ক্ত` and then backspace is processed
- **THEN** a delete of 2 units is returned and the output is `ক`

#### Scenario: Emoji is one letter
- **WHEN** the output is assigned `ক👍🏽` and then backspace is processed
- **THEN** a delete of 4 units is returned and the output is `ক`

#### Scenario: Backspace on empty output
- **WHEN** backspace is processed on a fresh engine
- **THEN** no actions are returned

## ADDED Requirements

### Requirement: Resuming the cluster from the output
When the host asks the engine to resume the cluster, the engine SHALL make the trailing consonant run
of its output the current buffer. The run is the last consonant that can carry a kar (with its nukta),
plus any consonants joined to it by hasants before it. When the output doesn't end in such a
consonant, the buffer SHALL be empty. The next consonant key then continues the run exactly as if the
run had just been typed. Resuming SHALL NOT change the output or return actions. The engine SHALL
never resume on its own after it ends a cluster itself (a silent `o`, a kar, a space, punctuation, an
unmapped key or English mode).

#### Scenario: Aspiration continues a resumed consonant
- **WHEN** the output is assigned `করত`, the cluster is resumed, and `h` is processed
- **THEN** a replace of 1 unit with `থ` is returned and the output is `করথ`

#### Scenario: Conjunct continues a resumed consonant
- **WHEN** the output is assigned `দ`, the cluster is resumed, and `m` is processed
- **THEN** the output and buffer are both `দ্ম`

#### Scenario: Whole conjunct run is resumed
- **WHEN** the output is assigned `এন্ত`, and the cluster is resumed
- **THEN** the buffer is `ন্ত`

#### Scenario: Nothing to resume after a kar
- **WHEN** the output is assigned `কি`, and the cluster is resumed
- **THEN** the buffer is empty

#### Scenario: Signs are not resumed
- **WHEN** the output is assigned `বাং`, and the cluster is resumed
- **THEN** the buffer is empty

#### Scenario: Silent o still ends the cluster
- **WHEN** the keys `k`, `o`, `m` are processed
- **THEN** the output is `কম`
