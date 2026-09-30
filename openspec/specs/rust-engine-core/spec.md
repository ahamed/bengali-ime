# rust-engine-core Specification

## Purpose
The engine that turns phonetic roman keystrokes into Bengali, keystroke by keystroke. It is the only
implementation of Druti's algorithm, shared by the macOS input source, the web playground and later
an iOS keyboard, and its behaviour is pinned by golden fixtures.
## Requirements
### Requirement: Keystroke behaviour
For any sequence of keys, and for any optional text-before-caret supplied with each key, the engine SHALL
produce the edit actions (insert, replace with a back count, delete with a back count, block split), the
accumulated output and the pending buffer after every key that the committed golden fixtures record for
that sequence with default settings. The Rust engine is the only implementation and the reference for
this behaviour.

#### Scenario: Aspiration rewrites the previous consonant
- **WHEN** the keys `k` then `h` are processed
- **THEN** the second key yields a single replace action of 1 unit with text `খ`, and the output and buffer are both `খ`

#### Scenario: Conjunct built by deleting and reinserting
- **WHEN** the keys `k`, `k`, `h` are processed
- **THEN** the third key yields a delete of 3 units followed by an insert of `ক্ষ`, and the output and buffer are both `ক্ষ`

#### Scenario: Vowel after a consonant becomes a kar
- **WHEN** the keys `a`, `m`, `i` are processed
- **THEN** the output is `আমি` and the buffer is empty

#### Scenario: Silent o breaks kar attachment
- **WHEN** the keys `k`, `o`, `a` are processed
- **THEN** the output is `কআ`

#### Scenario: Numbers and punctuation
- **WHEN** the keys `a`, `.` are processed on a fresh engine
- **THEN** the output is `আ।`

#### Scenario: Decimal point after a digit
- **WHEN** the keys `1`, `.`, `5` are processed on a fresh engine
- **THEN** the output is `১.৫`

#### Scenario: Unmapped keys pass through
- **WHEN** the keys `k`, `?`, `k` are processed
- **THEN** the output is `ক?ক`

### Requirement: Document-aware vowels
A vowel key SHALL produce the dependent vowel sign (kar) only when the character immediately before
the caret (ignoring one trailing combining nukta) is a consonant that can carry a kar, and no silent
`o` came just before; otherwise it SHALL produce the independent vowel. The text before the caret is
the supplied text-before-caret, or the engine's own output when none is supplied.

#### Scenario: Kar attaches to a consonant already in the document
- **WHEN** a fresh engine processes `i` with text-before-caret `ক`
- **THEN** it inserts `ি`

#### Scenario: No document context
- **WHEN** a fresh engine processes `i` with no text-before-caret
- **THEN** it inserts `ই`

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

### Requirement: UTF-16 lengths
All back counts reported by the engine SHALL be measured in UTF-16 code units, matching the host
platforms' string ranges (NSString/NSRange on Apple platforms, JavaScript strings in the browser).

#### Scenario: Back counts match UTF-16 length
- **WHEN** any action with a back count is produced
- **THEN** the count equals the UTF-16 length of the text it removes

### Requirement: Bulk transpilation
Bulk conversion of a roman document SHALL produce the Bengali text recorded in the committed transpile
fixtures for the same input and line-break option, which is the text produced by feeding each character to the engine
as a keystroke (a newline as Enter when line breaks are kept).

#### Scenario: Multi-line document
- **WHEN** `ami banglay gan gai\nami banglar gan gai` is converted with line breaks preserved
- **THEN** the result equals the fixture's expected text, with the newline kept between the two sentences

### Requirement: Platform independence
The engine SHALL have no dependency on any operating system UI framework or I/O. It SHALL build and pass
its tests on Linux and on macOS, and it SHALL build for `wasm32-unknown-unknown`, so the macOS input
source, a later iOS keyboard extension and the web playground all use it.

#### Scenario: Linux test run
- **WHEN** the native test suite runs on a Linux machine
- **THEN** it builds and all golden fixtures pass

#### Scenario: WebAssembly build
- **WHEN** the engine is built for `wasm32-unknown-unknown`
- **THEN** it compiles without platform-specific code

### Requirement: Golden fixtures pin behaviour
The repository SHALL keep the committed fixture files that record the actions, output and buffer after
every key for (a) the unit cases, (b) a curated list of Bengali words and sentences, and (c) seeded
random key sequences drawn from every key the engine handles, plus the composer and bulk transpilation
fixtures. The engine test suite SHALL replay every fixture, and continuous integration SHALL fail when
any fixture fails to replay. Fixtures SHALL change only in the same commit as an intended behaviour change.

#### Scenario: Unintended behaviour change
- **WHEN** an engine rule changes and the fixtures are not updated
- **THEN** the fixture replay fails in CI

#### Scenario: Unicode edge cases stay covered
- **WHEN** the fixtures are replayed
- **THEN** they include text-before-caret ending in a decomposed nukta letter, in a surrogate pair (emoji), and in consonant + chandrabindu
