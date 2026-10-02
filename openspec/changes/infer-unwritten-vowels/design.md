## Context

The engine (`engine.rs`, `rules.rs`) joins any consonant typed after a kar-taking consonant with a
hasant (`process_consonant`). Only a silent `o` in between prevents it. The composer keeps the whole
word being typed pending and reports each update as `commit` plus a complete new `pending` text, never
a back count into the document (whole-word-pending D1, D2). Bulk conversion (`transpile.rs`) feeds
each character to an `Engine`.

The project config requires new options to default to current behaviour. The engine's fixtures pin
the plain behaviour.

A scratch prototype was run against the real engine before this proposal. It resolved the engine's
output word by word with the two rules below. On 96 hand-picked words it gave:

| Group | Plain | Rule 1 | Rules 1 + 2 |
|---|---|---|---|
| Verb forms | 0/46 | 14/46 | 46/46 |
| Conjuncts that must stay | 35/35 | 35/35 | 35/35 |
| Nouns with a consonant-initial ending | 0/13 | 5/13 | 5/13 |
| Two-word collisions (noun reading) | 4/4 | 4/4 | 0/4 |

Over the vocabulary in `tests/fixtures/engine/words.json`, rule 2 changed nothing. Rule 1 changed
eight odd test inputs, such as `chnad` and `spoSTo`, and corrected `rajdhani` to রাজধানী. That
doesn't matter for this change, because existing fixtures run with the setting off.

## Goals / Non-Goals

**Goals:**
- Common spoken spellings give the written word (`korte`, `dekhte`, `kolomTa`) when the setting is on.
- Every output stays reachable: `o` separates, the join key joins.
- Output is a fixed function of the input (conjunct-resolution spec, "Deterministic output").
- The engine and all existing fixtures are unchanged.

**Non-Goals:**
- Nouns whose unwritten vowel sits before a reph-joined or attested pair, such as দরকার, সরকার,
  ঘরটা, বাজারকে, কলকাতা and মানুষকে. They need a word list, which would make the output harder to
  predict. People keep typing `o` for these (`dorokar`).
- Suggestions, candidate lists, learning, or any per-user data.
- Turning the setting on by default. That would be a separate change once people have used it.
- Changing what the `Engine` API produces.

## Decisions

### D1. Resolve the plain output, outside the engine
Resolution is a pure, crate-private function from a plain Bengali word, plus the join marks inside
it, to the resolved word. It only removes hasants. The composer applies it to the pending word after
every key and Backspace, and when the word is committed. Bulk conversion applies it to every word of
the engine's output. The `Engine` never sees the setting: it ignores `Config::smart_hasant`, and its
doc says so.

The same function then defines both rules exactly: "resolved = resolve(plain)". This gives:
- a property test: with the setting on, the output equals the resolved output with it off, for every
  seeded random sequence;
- unchanged engine fixtures;
- unchanged `Action` semantics, since resolution happens after them.

The composer's `Update` already replaces the whole pending text, so resolving a letter two places
back (`কর্তা` + `m` → `করতাম`) needs no new host capability.

*Alternative:* decide in `process_consonant` when the second consonant is typed. Rejected because:
- the deciding key often comes later (`korta` vs `korte` differ only in the last vowel);
- aspiration changes the pair afterwards (`g`, `d`, `h` → গ্ধ, which is attested, while গ্দ is not);
- undoing a decision when the word grows (`porbe` → `porber`) would need per-key undo state.

*Alternative:* resolve only when the word is committed. Rejected because the change would show up on
the space key, like autocorrect, and the text would differ while typing.

### D2. The composer keeps the plain pending word
The composer stores the plain pending word, which is the end of the engine's output as today, plus
its join marks. It reports `resolve(plain)` as `pending` and commits the resolved text. When a host
passes the text before the caret, the engine's view becomes that committed text plus the plain
pending word. Committed text is the resolved text. That is harmless for the engine, because:
- the engine never rewrites committed text (whole-word-pending D2);
- the rules that read the document look only at whether the last character is a consonant, a digit,
  a dash or a dari, and at quote counts, and removing a hasant changes none of these.

`matches_text_before_caret` compares with the resolved output, which the composer keeps alongside
the plain output (the new ime-composer requirement).

Backspace removes the last plain letter, as today, then resolves again. So `korte` + Backspace shows
`কর্ত`, the same as the plain `kort`. This is the price of D1's pure function; the spec records it.

### D3. Rule 1: a table of real conjunct pairs
`data::ATTESTED_CONJUNCT_PAIRS` lists every consonant pair C1 + C2 that occurs inside a Bengali
conjunct, including inside three-consonant conjuncts such as স্ত্র. A hasant between consonants is
kept when:
- the pair is in the table;
- C1 is `র` (reph); or
- C2 is `য`, `র` or `ব` (folas).

Each pair in a cluster is checked on its own. A nukta letter (`ড়`, `ঢ়`, `য়`) is never C1 of an
attested pair. The table is public data, compared entry by entry with `data.json` like the other
tables. Nukta letters are written as `\u{...}` escapes: the prototype's first run failed because an
editor had decomposed `ড়`.

*Alternative:* a list of pairs that never join. Rejected: the set of pairs that do join is closed
and documented, while its complement is open-ended.

### D4. Rule 2: closed verb-root and inflection tables
- `data::VERB_ROOTS`: consonant-final roots, in the form they take before a consonant-initial ending
  (`কর`, `দেখ`, `বুঝ`, `শুন`, `পড়`).
- `data::VERB_INFLECTIONS`: the endings that start with `ত`, `ল`, `ব` or `ছ` (`তে`, `তাম`, `লে`, `লাম`,
  `ব`, `বে`, `ছি`, `ছিল`…).

A word matches when it is exactly root + hasant + inflection, optionally + `ই`/`ও`. Then that one
hasant is removed. Verbs are a closed class and their endings are regular. Nouns are an open class,
which is why there is no noun rule.

Where a word is both a noun and a verb form (`পর্ব`/`পরব`, `সর্ব`/`সরব`, `চর্বি`/`চরবি`, `পর্বে`/`পরবে`),
the verb wins, and the noun takes the join key. The proposal's rule is "verbs are typed as spoken",
and the exception list stays short.

*Alternative:* match any word that ends in a verb ending, without a root list. Rejected: `rokte`,
`Sorte` and `torke` would lose their conjuncts.

### D5. Backtick is the join key
With the setting on, the composer handles `` ` `` itself when the plain pending word ends in a
consonant. It passes nothing to the engine and arms a mark. The next consonant key's join is then
recorded as protected: an index into the plain pending word that resolution skips.
- Backspace over that consonant removes the mark.
- A non-consonant key drops an armed mark.
- A second backtick while armed passes to the engine and is typed literally.

Bulk conversion uses the same mark handling.

The backtick is unmapped today and rare in Bengali text. A key the engine already maps would change
the plain behaviour. `key_reads_document` is unaffected.

### D6. The setting
`Config::smart_hasant: bool` is named to match `smart_quotes`. It is off in `Config::default()`. It
is mirrored as `smart_hasant` in `druti-ffi` and as `smartHasant` in `druti-wasm`, each with its
parity test. Swift persists it in `Settings` under a new key that defaults to off, so an upgrade
keeps today's output. The playground adds an unchecked toggle.

### Behaviour and fixture changes
- **Engine:** no change; no `engine/` fixture is edited.
- **Composer:** with the setting off, no change; no existing `composer/` fixture is edited.
- **New fixtures:**
  - `composer/smart-hasant.json` covers every conjunct-resolution and ime-composer scenario in this
    change.
  - New `engine/transpile.json` entries carry a `"smartHasant": true` option.
  - `engine/data.json` gains the three tables.
  - `resolve/words.json` holds `{ roman, plain, resolved }` rows, including the prototype's 96 words.

## Risks / Trade-offs

- **[Trade-off] Letters change two places back.** `korta` → `কর্তা`, then `m` → `করতাম`.
  → It happens only inside the pending word, which every host can rewrite. It is the same kind of
  change as aspiration, over a longer distance.
- **[Trade-off] Backspace can bring a hasant back** (`করতে` → `কর্ত`). → It is what the pure function
  requires, and it equals the plain result.
- **[Risk] Table quality decides the experience.** A missing attested pair splits a real conjunct; a
  missing root leaves a verb joined. → Both tables are reviewed by a native speaker before merging,
  and every row is pinned in `resolve/words.json`. The join key and `o` always override.
- **[Risk] A literal backtick right after a consonant now takes two presses.** → Documented; the
  setting is off by default.
- **[Trade-off] Collisions favour the verb.** People writing about episodes (`পর্ব`) need the join
  key. → Listed in the README.
- **[Risk] Adding a field to the UniFFI `Config` record breaks Swift code that builds it.** → The only
  such site is `BengaliIMECoreTests`; it changes in the same commit.

## Migration Plan

- Nothing to migrate: the setting is off for existing and new users.
- Rollback is a revert. A persisted `smartHasant` key left behind by a newer build is ignored by an
  older one.

## Open Questions

- The exact rows of `ATTESTED_CONJUNCT_PAIRS` and `VERB_ROOTS`. The prototype used about 140 pairs
  and 90 roots. The final lists come from a standard conjunct inventory and a verb-root list,
  reviewed by the author. This changes data, not the approach.
- The wording of the macOS menu item and the playground label, for example "Smart Hasant (korte →
  করতে)".
