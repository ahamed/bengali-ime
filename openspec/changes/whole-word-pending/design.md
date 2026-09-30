## Context

The composer turns the engine's edit actions into what a host can show: text to commit and pending
(marked) text. Until now, the pending text was only the engine's consonant cluster, so most of a
word was committed while it was typed. Any later rewrite of it, by Backspace or a resumed cluster,
had to ask the host to replace committed text through `replace_before`.

Debug logs from the Mac input source, which log only lengths and positions, showed how hosts handle
such a replacement:

| Host | `insertText("", range)` | `setMarkedText(text, range)` | Caret reports |
|---|---|---|---|
| TextEdit (Cocoa) | honoured | honoured | exact |
| Claude app (Chromium contenteditable) | ignored; Backspace passed to the page | honoured | exact |
| Cursor (Chromium EditContext) | ignored | ignored (`পদ্মদ`) | late, in a small window around the caret |
| Terminal | no text access | no text access | none |

In the web playground, `ka`, Backspace, `k` gave `ক্ক`: after the Backspace, the remaining `ক` was
the cluster, and the next consonant joined it.

The user chose two behaviours for this change: the whole word being typed stays pending, and a
consonant after a Backspace or a caret move starts a new letter.

## Goals / Non-Goals

**Goals:**
- One algorithm, in Rust, with the same visible result in the playground, Cocoa apps,
  Chromium-based apps and terminals.
- Backspace inside the word being typed removes one letter, never leaving a hasant, in every host.
- No update depends on a host honouring a replacement range.
- Tests that fail when a host would diverge.

**Non-Goals:**
- Letter Backspace in text that is already committed. The app's own Backspace handles it, one code
  point at a time.
- Per-app lists or bundle-ID checks.
- Changing the engine or its fixtures: `Engine::process_backspace` and `resume_cluster` keep their
  behaviour, and the composer no longer uses them.

## Decisions

### D1. The word being typed stays pending
After every key, the pending text is the Bengali word that ends the composer's text: letters,
signs, kars, the hasant, the nukta and joiners (`letters::trailing_word_len_utf16`). The engine's
cluster is always inside it. Anything else ends the word and is committed with everything before it:
a space, a digit, punctuation, a symbol or a quote.

A held `-` or `।` stays pending on its own, as before. Flush and reset end the word as before.
Enter flushes, so the next word starts after it.

With the word pending, every rewrite while typing (aspiration, conjuncts, kars, Backspace) changes
only marked text. Every host supports that: it is the basic input-method contract.

*Alternative:* keep only the cluster pending and replace committed text where hosts allow it.
Rejected: it depends on the host, as the table shows.

### D2. The composer never changes committed text
`Update` has only `commit`, `pending` and `handled`. The type can't express a change to committed
text, so no host needs replacement ranges and none can diverge by ignoring them.

- **Backspace with nothing pending** is not handled. The app deletes by its own rules (one code
  point in Chromium), and the composer resets. `Composer::backspace` takes no text.
- **A rule that would rewrite committed text** is detected before its result is used. That covers
  `-` after a committed `-`, `.` after a committed `।`, and a kar before a committed `ঁ`: the replay
  would delete more than the pending text. The composer then restores the engine and replays the key
  with only the pending text as context, as if the word started at the caret (`ক-` + `-` → `ক--`).

*Trade-off:* a conjunct that is already committed takes two Backspaces (`দ্ম` → `দ্` → `দ`), as in
every app's own Backspace. Inside the word being typed, which is where corrections happen, one
Backspace removes the whole letter.

### D3. A consonant after a Backspace or a caret move starts a new letter
Backspace in the pending word removes the last letter from the engine's output and ends the cluster
(`Engine::pop`), so `কা`, Backspace, `k` gives `কক`, and `দ্ম`, Backspace, `h` gives `দহ`. A reset
(a caret move) never resumes the cluster before the caret. Vowels still read the document and attach
as kars (`i` after `র` → `করিতে`). Consonants and `^` no longer read the document:
`key_reads_document` is back to vowels, `-`, `.` and quotes. The existing coverage test proves that
no other key depends on it.

### D4. A caret move is confirmed by the text
The Mac input source compares the caret with the position its last update left. When they differ and
the app exposes its text, it asks `Composer::matches_text_before_caret`, which is true when the text
before the caret and the composer's output end the same way. If so, it doesn't reset. Cursor reports
the caret late, in a small window around it (caret 1 with text `প` after `po`, where 2 was
expected). Without this check, every such report ended the word. The check is in Rust and exposed
from both bindings.

### D5. The host's text is the composer's view
When a key comes with the text before the caret, the composer makes that text, followed by the
pending text, the engine's output. Later keys without context read it too. The Mac passes context
only while nothing is pending, so without this, a quote typed mid-word after a reset saw only the
text typed since the reset, and the Mac and the playground disagreed.

### D6. Hosts are tested as models
`crates/druti-core/tests/hosts.rs` types scripts into three modelled hosts:
- the playground, which passes context with every key;
- a Mac app with text access, which passes context only while nothing is marked and only for keys
  that read the document;
- a terminal, which never passes context.

An unhandled Backspace deletes one code point, as Chromium does. The tests check the reported cases
(`podmo`, `ekoTa podmo`, `korote` with Backspaces, `ka` + Backspace + `k`, caret moves). A property
test also requires the text-reading hosts to show identical text after every step of the seeded
random key and Backspace sequences.

## Risks / Trade-offs

- **[Trade-off] Longer marked text.** Apps that draw their own marked-text underline underline the
  whole word while it is typed. Input methods for many scripts do the same.
- **[Trade-off] Committed conjuncts take two Backspaces.** See D2. Keeping the word pending makes
  this rare: it happens only after the word was ended.
- **[Risk] An app commits marked text on its own**, for example on a timer or when it autosaves. The
  word then becomes committed text and Backspace goes to the app. That is no worse than before this
  change.
- **[Trade-off] Rules on committed text no longer apply** (`ক-` + `-` gives `ক--`, not `ক—`). They
  need the first character to have been committed by a caret move, which is rare.

## Migration Plan

- This change replaces the unmerged `letter-backspace-and-caret-cluster` behaviour on the same branch
  line: the resumed cluster and Backspace on committed text.
- Hosts update together with the bindings:
  - Swift: `backspace()` with no argument; no `replaceBefore`.
  - TypeScript: `backspace()`; no `replaceBefore`.
- Rollback is a revert of the change.
