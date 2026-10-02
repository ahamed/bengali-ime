# Spec Delta

## Purpose

Decides, with the smart hasant setting on, whether two consonants typed one after the other are
written as a conjunct or with an unwritten inherent vowel between them (`korte` → করতে, `korta` →
কর্তা), using fixed rules that give the same output for the same keys every time.

## ADDED Requirements

### Requirement: Resolution only removes hasants
With smart hasant on, the text the composer shows and commits SHALL be the plain text it shows with
the setting off, with each Bengali word resolved: some hasants between two consonants are removed.
Resolution SHALL NOT add, remove or reorder any other character. With smart hasant off, nothing is
resolved.

#### Scenario: Plain text is the starting point
- **WHEN** smart hasant is on and `dekhte` is typed
- **THEN** the pending text is `দেখতে`, which is the plain `দেখ্তে` with its hasant removed

#### Scenario: Setting off keeps plain output
- **WHEN** smart hasant is off and `korte` is typed
- **THEN** the pending text is `কর্তে`

### Requirement: Only real conjuncts stay joined
A hasant between consonants C1 and C2 SHALL be removed when C1 + hasant + C2 is not in the table of
conjuncts that occur in Bengali spelling, unless C1 is `র` (reph) or C2 is `য`, `র` or `ব` (a fola).
The table is fixed data in the engine crate and is pinned by a fixture.

#### Scenario: Unattested pair is split
- **WHEN** smart hasant is on and `kolomTa` is typed
- **THEN** the pending text is `কলমটা`

#### Scenario: Attested conjunct stays
- **WHEN** smart hasant is on and `golpo`, `miShTi` and `bastob` are each typed as a word
- **THEN** the words are `গল্প`, `মিষ্টি` and `বাস্তব`

#### Scenario: Reph always stays
- **WHEN** smart hasant is on and `korta` is typed
- **THEN** the pending text is `কর্তা`

#### Scenario: Aspiration completes an attested conjunct
- **WHEN** smart hasant is on and `dugdho` is typed
- **THEN** the pending text is `দুগ্ধ`

### Requirement: Verb inflections are not joined to their root
When a whole word is a verb root from the root table, a hasant, then an inflection from the
inflection table, optionally followed by `ই` or `ও`, the hasant after the root SHALL be removed. Both
tables are fixed data in the engine crate and are pinned by a fixture. A word that only starts with
such a form is not a verb form.

#### Scenario: Infinitive
- **WHEN** smart hasant is on and `korte` is typed
- **THEN** the pending text is `করতে`

#### Scenario: Other inflections of the same root
- **WHEN** smart hasant is on and `korbo`, `korlam`, `korchi` and `korchilo` are each typed as a word
- **THEN** the words are `করব`, `করলাম`, `করছি` and `করছিল`

#### Scenario: Emphatic ending
- **WHEN** smart hasant is on and `korteO` is typed
- **THEN** the pending text is `করতেও`

#### Scenario: Noun with a conjunct before the case ending
- **WHEN** smart hasant is on and `Sorte`, `gorte` and `rokte` are each typed as a word
- **THEN** the words are `শর্তে`, `গর্তে` and `রক্তে`

#### Scenario: Not a verb inflection
- **WHEN** smart hasant is on and `kortar` is typed
- **THEN** the pending text is `কর্তার`

### Requirement: The word is re-resolved after every key
Resolution SHALL apply to the whole pending word after every key and every Backspace, so a hasant
removed for an earlier form of the word comes back when the word stops being that form.

#### Scenario: Ending typed after a conjunct
- **WHEN** smart hasant is on and `k`, `o`, `r`, `t`, `a`, `m` are typed
- **THEN** after `a` the pending text is `কর্তা`, and after `m` it is `করতাম`

#### Scenario: Word grows past a verb form
- **WHEN** smart hasant is on and `porbe` is typed, then `r`
- **THEN** after `porbe` the pending text is `পরবে`, and after `r` it is `পর্বের`

#### Scenario: Backspace out of a verb form
- **WHEN** smart hasant is on, `korte` is typed and Backspace is pressed
- **THEN** the pending text is `কর্ত`

### Requirement: Join key keeps a conjunct
With smart hasant on, a backtick typed while the pending word ends in a consonant SHALL produce no
text and SHALL keep the hasant written between that consonant and the next consonant typed. Neither
rule removes it. If the next key is not a consonant, the backtick has no effect.

#### Scenario: Noun reading of a collision
- **WHEN** smart hasant is on and `porbo` is typed as one word and `` por`bo `` as another
- **THEN** the words are `পরব` and `পর্ব`

#### Scenario: Join key on an unattested pair
- **WHEN** smart hasant is on and `` dekh`te `` is typed
- **THEN** the pending text is `দেখ্তে`

#### Scenario: Join key before a vowel
- **WHEN** smart hasant is on and `` kor`e `` is typed
- **THEN** the pending text is `করে`

### Requirement: Literal backtick
With smart hasant on, a backtick SHALL be typed as itself when the pending word does not end in a
consonant, or when it directly follows another backtick that produced no text. With smart hasant off,
a backtick is always typed as itself.

#### Scenario: Doubled backtick after a consonant
- **WHEN** smart hasant is on and `k`, `` ` ``, `` ` `` are typed
- **THEN** `` ক` `` has been typed

#### Scenario: Backtick after a space
- **WHEN** smart hasant is on and `` ` `` is typed with nothing pending
- **THEN** `` ` `` is committed

### Requirement: `o` always separates
An `o` typed between two consonants SHALL leave them unjoined whether smart hasant is on or off, since
resolution only removes hasants.

#### Scenario: Explicit inherent vowel
- **WHEN** smart hasant is on and `korote` is typed
- **THEN** the pending text is `করতে`

### Requirement: Deterministic output
With smart hasant on, the committed and pending text SHALL depend only on the keys, Backspaces,
caret moves and settings since the last reset, and on the text before the caret that the host
reports. The output SHALL NOT depend on earlier sessions, on how often a word was typed, or on
anything outside the engine crate, and the composer SHALL offer no alternatives.

#### Scenario: Same keys, same text
- **WHEN** two fresh composers with smart hasant on receive the same keys
- **THEN** they report identical updates after every key
