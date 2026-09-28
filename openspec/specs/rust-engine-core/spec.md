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

### Requirement: Keystroke-undo backspace
Engine-level backspace SHALL undo the last keystroke, restoring output, buffer and flags exactly. After
the host assigns the output (a resync) there is no history, and it deletes one code point plus a hasant
that would be left dangling. It does nothing on an empty output.

#### Scenario: Backspace inside a conjunct
- **WHEN** the keys `k`, `k`, `h` are processed and then backspace
- **THEN** a replace of 3 units with `ক্ক` is returned, and the output and buffer are both `ক্ক`

#### Scenario: Backspace after a resync
- **WHEN** the output is assigned `ক্ত` and then backspace is processed
- **THEN** a delete of 2 units is returned and the output is `ক`

#### Scenario: Backspace on empty output
- **WHEN** backspace is processed on a fresh engine
- **THEN** no actions are returned

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
