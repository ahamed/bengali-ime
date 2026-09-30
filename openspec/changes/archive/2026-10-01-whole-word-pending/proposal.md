## Why

Druti's composer asked hosts to replace committed text in three places:
- a Backspace on committed Bengali text (`দ্ম` → `দ`);
- a consonant that resumed the cluster before the caret (`প` + `d` → `প্দ`);
- `-` or `.` after a committed `-` or `।`.

Hosts don't all support that. Debug logs from the Mac input source showed:
- the Claude app and other Chromium-based apps ignore an empty `insertText` over a range, then
  pass the Backspace to the page, which deletes one code point (`পদ্ম` → `পদ্`);
- Cursor's editor, which is built on EditContext, also ignores a range on marked text
  (`পদ্ম` + Backspace → `পদ্মদ`, `ekoTa podmo` → `একটা পপ্দ্ম`);
- a terminal exposes no text at all.

In the web playground, a consonant after a Backspace silently joined the letter before it:
`ka`, Backspace, `k` gave `ক্ক` instead of `কক`.

The algorithm must behave the same in every host, with the decision made in Rust. The only edits
that every host supports are replacing the input method's own marked text and inserting text at the
caret, so the composer must use only those.

## What Changes

- **BREAKING** The word being typed stays pending (marked) text until a word break: a space,
  punctuation, a digit, Enter, or a caret move. Backspace inside that word edits only pending text,
  so `podmo` + Backspace gives `পদ` in every app.
- **BREAKING** The composer never changes committed text. `Update` loses `replace_before`
  (`replaceBefore` in JavaScript), and `Composer::backspace` no longer takes the text before the
  caret. With nothing pending, Backspace is not handled and the app deletes. A rule that would
  rewrite committed text (`-` after a committed `-`, `.` after a committed `।`, a kar before a
  committed `ঁ`) applies as if the word started at the caret.
- **BREAKING** A consonant after a Backspace or a caret move starts a new letter (`কা`, Backspace,
  `k` → `কক`; `করতে`, Backspace, `h` → `করতহ`). Vowels still attach as kars (`i` after `র` in
  `করতে` → `করিতে`). Consonants and `^` no longer read the document.
- When a host passes the text before the caret with a key, that text becomes the composer's view
  of the document, so later keys without context agree with it.
- The Mac input source drops replacement ranges. It keeps the caret-move check confirmed by the text
  before the caret (`Composer::matches_text_before_caret`), which stops Cursor's late caret reports
  from resetting the composer.
- New Rust tests type scripts into models of the playground, a Mac app with text access, and a
  terminal, and require the same text in each (`tests/hosts.rs`).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `ime-composer`: the pending text is the word being typed; committed text is never changed;
  Backspace edits only the pending word; a consonant after Backspace or a caret move starts a new
  letter; the host's text becomes the composer's view; checking the text before the caret; the same
  result in every host. Removes "Resuming the cluster before the caret", "Rewriting text outside the
  composer" and the exceptions in "Committed text is never rewritten during normal typing".
- `macos-input-source`: the whole word being typed is marked text; Backspace edits it, and otherwise
  goes to the app; caret-move detection is confirmed by the text before the caret.
- `web-playground`: the bindings' update has three fields and `backspace` takes no text; the editor
  underlines the word being typed; a consonant after a caret move starts a new letter.

## Impact

- **Rust**:
  - `druti-core` `Composer`, `Update` and `letters` (the new `trailing_word_len_utf16`);
  - the removal of the now-unused `is_consonant_key`;
  - the composer fixtures and `tests/composer.rs`;
  - the new `tests/hosts.rs`.
- **Bindings**: `druti-ffi` and `druti-wasm` drop `replace_before` and the `backspace` argument, with
  their parity tests. Swift and TypeScript callers change with them.
- **Swift**: `InputController` (no replacement ranges, no temporary debug logging) and
  `BengaliIMECoreTests`.
- **Playground**: `examples/playground/src/editor.ts`.
- **Docs**: `README.md`, `crates/druti-core/README.md`, `macos/README.md`,
  `docs/macos-input-source.md`.
- **Behaviour**:
  - Backspace in committed text now deletes one code point, as the app does. A committed conjunct
    takes two presses (`দ্ম` → `দ্` → `দ`).
  - The word being typed is underlined in apps that draw their own marked-text underline.
