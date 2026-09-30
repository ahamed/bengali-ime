## Context

Today two Backspaces exist:
- `Engine::process_backspace` undoes the last keystroke, using an undo stack of output snapshots.
  Only the fixture tests call it.
- `Composer::backspace` removes the last grapheme cluster of the pending text (via
  `Engine::delete_tail`) and commits the rest. With nothing pending it answers "not handled" and
  resets.

Neither can see the document, and the composer's Backspace takes no context. A cluster is only ever
built by typing: after `Composer::reset` the engine buffer is empty, so the document can supply a
kar's consonant but never a cluster to continue.

The hosts:
- The Mac app (`macos/Druti/InputController.swift`) passes text-before-caret only for keys where
  `key_reads_document` is true, only while nothing is pending, and only in apps that expose their
  text. It applies `replaceBefore` only while nothing is pending. It resets with `nil` on caret moves.
- The playground (`examples/playground/src/editor.ts`) passes context for every key and resets with
  context after any outside edit.

See the proposal (Why) for the problems, and the delta specs for the required behaviour.

## Goals / Non-Goals

**Goals:**
- One Backspace rule (letter deletion) shared by the engine and the composer, in `druti-core` only.
- Resuming a cluster from the document, done by the core, so hosts only supply text.
- No hand-written Swift changes. Mac call sites keep compiling.

**Non-Goals:**
- Passing context to Backspace from the Mac app. That is a separate follow-up change, so on the Mac,
  Backspace on committed text stays host-handled.
- Remembering how a letter was typed. After a Backspace the document is the only truth (see Risks).
- Forward delete, and Backspace over a selection (hosts already handle these).

## Decisions

### D1. A `letters` module defines "one letter"
A new private module `crates/druti-core/src/letters.rs` exports
`last_letter_len_utf16(units: &[u16]) -> usize` and `trailing_consonant_run_len_utf16(units: &[u16])
-> usize`. Both work on UTF-16 units (the engine's storage), always cut at code point boundaries, and
reuse `data::is_kar_taking_consonant`, `NUKTA` and `HASANT`.

Letter rule, applied from the end:
1. If the last code point is outside the Bengali block (U+0980–U+09FF), the letter is the last
   extended grapheme cluster (`unicode-segmentation`, already a dependency).
2. A consonant counts as a consonant letter. So does a combining nukta that follows a consonant; the
   nukta and its consonant go together.
3. For a consonant letter, if the text before it is a hasant preceded by a consonant, the hasant is
   included. This is what makes `দ্ম` → `দ` and `র্ক` → `র`, and it never strands a hasant.
4. Anything else in the Bengali block (a kar, `ং ঃ ঁ`, a vowel, a digit, `।`, a lone hasant) is one
   code point.

The consonant run is the last consonant letter, extended backwards while it is preceded by
hasant + consonant (so `ন্ত্র`). `ৎ`, which the data marks as not kar-taking, never starts or extends
a run, and neither do `ং ঃ ঁ`.

*Alternatives:*
- Grapheme clusters, which is what the composer does today. Rejected: a conjunct is one cluster.
- Plain code points plus stripping the hasant. This gives the same results except for a decomposed
  nukta, and is less explicit.

### D2. The engine's Backspace deletes a letter; the undo stack goes
`process_backspace` becomes:
1. Compute `n = last_letter_len_utf16(output)`.
2. Pop `n` units, emitting `Action::Delete { chars_back: n }`.
3. Clear the silent-`o` flag, then `resume_cluster()`.

`UndoEntry`, `undo_stack`, `MAX_UNDO_ENTRIES`, `UNDO_SNAPSHOT_UNITS`, `touched_from`/`touch`,
`output_assigned`/`drop_undo_history_if_resynced`, `restore`, `delete_last_code_point` and
`delete_tail` are removed.

`set_output` keeps its contract (it assigns the output and keeps the buffer). "Clears the undo history"
is dropped from its docs. This keeps the 130 `set` steps in `random.json` meaningful and unchanged,
except where a later Backspace in the same case changes.

*Alternative:* keep the undo stack for the engine alone. Rejected by the user: one algorithm
everywhere.

### D3. `Engine::resume_cluster` is public
`pub fn resume_cluster(&mut self)` sets `buffer` to the last `trailing_consonant_run_len_utf16(output)`
units of the output. It emits no actions. The composer and `process_backspace` call it, and so could
future hosts that drive the engine directly. The existing consonant rules already read only the
buffer (`has_hasant`, `aspirated_consonant`, `kkhiyo`, the nasal connectors, …), so a resumed buffer
behaves exactly like a typed one without any rule changes.

### D4. The composer resumes only after a reset or a Backspace
The composer gets a `resume_on_next_key: bool` field.
- `reset(Some(ctx))`: `set_output(ctx)`, then `resume_cluster()` straight away.
- `reset(None)` sets the flag, and so does `Composer::new` (typing has started, and nothing is known
  about the text before the caret).
- An unhandled Backspace resets and sets the flag.
- In `key()`: if the flag is set, nothing is pending, and a context is supplied, the composer calls
  `set_output(ctx)` and `resume_cluster()` before processing the key. The flag is cleared on every
  key, whether or not there was context.

As a result, supplying context for every key never resumes a cluster the engine ended itself
(`kom` → `কম`).

*Alternative:* resume whenever context ends in a consonant. Rejected: it breaks the silent `o` and
every cluster the engine deliberately ends.

### D5. The pending text always covers the whole buffer
After replaying actions, the held length is the engine buffer's length. If that is longer than the
replayed text (a resumed prefix that is still committed in the host, as when `m` inserts `্ম` after
a resumed `দ`), the composer:
1. prepends the missing units from the tail of the engine output;
2. adds their length to `replace_before`.

So the host swaps the committed `দ` for pending `দ্ম`, and "pending = buffer" still holds. The prefix
is taken only after a key (never after a Backspace, which leaves a resumed run as plain text), and
only while nothing was pending, which is also the only state in which the Mac applies
`replaceBefore`. That second condition is an explicit check in the code. The replay-and-split code shared by `key()` and
`backspace()` becomes one private method, `apply_actions`.

### D6. `Composer::backspace(text_before_caret: Option<&str>)`
- **Pending text exists:** if context is given, `set_output(ctx + pending)` first, as `key()` does.
  Then `process_backspace()` and `apply_actions`. Pending becomes the resumed buffer, and any other
  remainder is committed (`ওছ` → commit `ও`).
- **Nothing pending, and the context ends in a Bengali letter** (its last code point is in
  U+0980–U+09FF): `set_output(ctx)`, `process_backspace()`, and `apply_actions`. This yields
  `replace_before = n`, commits nothing, and handles the key. The engine buffer is now the resumed
  run, and D5 pulls it into pending on the next key.
- **Otherwise:** today's behaviour (`reset(None)`, not handled), plus setting the flag. The host's
  Backspace of a space, a newline or Latin text is left alone.

### D7. `key_reads_document` includes consonant keys
A new `pub(crate) fn is_consonant_key(key)` in `engine.rs` uses the same lookups as
`process_consonant` (direct, capital, and lowercase with aspiration). `key_reads_document` returns
true for it and for `^`, since a chandrabindu joins a resumed cluster. The Mac host then reads the document for consonants, but only while nothing is
pending. That is the only time D4 can use the text.

### D8. Bindings stay mirrored
- `druti-ffi`: `#[uniffi::method(default(text_before_caret = None))] pub fn backspace(&self,
  text_before_caret: Option<String>)`. The generated Swift is `backspace(textBeforeCaret: String? =
  nil)`, so `InputController` and the Swift tests compile unchanged. If UniFFI 0.32 rejects the
  default on a method, the fallback is a second method, `backspace_with_context`, in both bindings.
- `druti-wasm`: `backspace(textBeforeCaret?: string)`, which is an `Option<String>` parameter.
- Both parity tests (`same_updates_as_the_core_composer`) add a Backspace with context.

### D9. The playground passes context to Backspace
`editor.ts` calls `composer.backspace(this.text.slice(0, this.caret))`. An unhandled Backspace keeps
marking the model stale, and the next key's resync reset (with context) resumes the cluster (D4).

### D10. Fixture edits (intended behaviour changes)
- **`engine/random.json`:** every case containing a `bs` step is regenerated by a one-off program
  (not committed). It replays each case's operations (`k` + `c`, `bs`, `en`, `set`) on the new engine
  and rewrites `a`, `o` and `b` for every step. Cases without `bs` must come out byte-identical, and
  the program asserts that. The regeneration commit carries the diff.
- **`engine/unit.json`:** the three `backspace …` scenarios are rewritten by hand. New unit cases
  cover the engine spec scenarios (the conjunct, `ন্ত্র` via `set`, `korote`, the silent `o`, emoji,
  and resume). The replay harness learns a `resume` step (`{"resume":1}` → `resume_cluster()`), which
  is documented in the fixtures README.
- **`composer/backspace.json`:** rewritten from the ime-composer spec. The harness learns `ctx` on
  `backspace` steps.
- **`composer/context.json`:** gains the resume scenarios. The existing cases are unchanged: "reset
  after caret move" resets without context and types `h` without context, so still gets `হ`.
- The `words.json` and `transpile.json` fixtures, and the composer random-invariant test (keys only,
  no Backspace or reset), must not change. That proves normal typing is untouched.

## Risks / Trade-offs

- **[Risk] Backspace forgets how a letter was typed.** `kom`, Backspace, `m` gives `ক্ম`, because
  the silent `o` is invisible in the document. → Accepted; the document is the truth. Typing `o`
  again ends the cluster as usual.
- **[Risk] Backspace over punctuation resumes the consonant before it.** `k?`, Backspace, `h` gives
  `খ`. → Consistent with "after every Backspace", and the same as clicking after `ক`.
- **[Risk] A resumed cluster rewrites committed text in apps with partial text APIs.** → The Mac
  applies `replaceBefore` only when it can read the caret. If it can't read the text, no context is
  passed and nothing resumes, which is today's behaviour.
- **[Risk] The Mac leaves a dangling hasant when the app deletes a committed conjunct**, until the
  Swift follow-up lands. → The resume run then ends in a hasant, so nothing resumes. The next
  consonant appends after `দ্`, which renders as a conjunct anyway.
- **[Trade-off] A public API change.** `Composer::backspace` gains a parameter and
  `Engine::resume_cluster` is new. → Every in-repo caller is updated in the same commit. The bindings
  keep source compatibility through defaults.

## Migration Plan

This is a behaviour change with no stored data. Ship it in one PR: the core, the fixtures, the
bindings, the playground and the docs. Rollback is a revert. The Swift follow-up (passing context to
Backspace) is proposed separately after this change merges.
