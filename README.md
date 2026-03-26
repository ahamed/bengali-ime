# @ahamed/bengali-ime

Phonetic **roman-to-Bengali** transliteration: this is not English-to-Bengali machine translation. You type roman letters (e.g. Avro-style) and get Bengali Unicode text.

Canonical source and releases: [github.com/ahamed/bengali-ime](https://github.com/ahamed/bengali-ime). This directory may also appear inside the [deterministic-bengali-typewriter](https://github.com/ahamed/deterministic-bengali-typewriter) app monorepo as a workspace copy; npm installs should use the package name below, not the app repo.

## Developer guide

### How integration works

`BengaliIME` holds **state** (`output`, `buffer`, English mode, and related flags). On each physical key you care about, you call `process` or `processBackspace`. The IME updates its own state and returns an **`IMEAction[]`**: a small program your editor runs so the **document** matches what the IME computed.

- Apply actions **in order** at the **caret** (or sequentially at the end of the composed span, if that is how your editor is modeled).
- A single call can return **more than one** action (for example a delete of several code units followed by one insert).
- After you apply all actions, the slice of the document that the IME “owns” should align with `ime.output` (for the simple case where the caret stays at the end of that slice, your text field value before the caret should match `ime.output`).

If the user **pastes**, moves the caret, or edits without going through the IME, your prefix may no longer match `ime.output`. In that situation you either resync (for example set `ime.output` to the text before the caret and clear `ime.buffer`) or accept inconsistent clusters until the user corrects them. A minimal textarea demo lives under `examples/playground/` (`yarn example`).

### `IMEAction` types

These describe **what changed** at the caret—not the full document. All “back” counts are in **JavaScript string code units** (UTF-16), same as `String.length`, so they match what you splice in a browser or Node string.

| Action | Fields | Purpose |
|--------|--------|---------|
| **`insert`** | `text` | Append `text` at the caret. Used for new letters, symbols, spaces, and most keystrokes. |
| **`replace`** | `charsBack`, `text` | Delete `charsBack` code units **immediately before** the caret, then insert `text` in their place. Used when the IME refines the last cluster (aspiration `kh`, juktakkhar fixes, some vowel rewrites, `--` from `-`, etc.). |
| **`delete`** | `charsBack` | Remove `charsBack` code units before the caret, then insert nothing. Used by **Backspace** (`processBackspace`) and by some transforms that strip multiple units before a new insert (often paired with a following `insert` in the same array). |
| **`splitBlock`** | _(none)_ | **Paragraph break**: same logical event as **Enter** in the IME. The IME does not insert a character for this; your layer should add a newline or split blocks the way your editor expects. Bulk `transpileRomanDocument` turns these into `\n` at the right offsets. |

**`splitBlock` vs a literal newline:** Treat `splitBlock` as “user pressed Enter in Bengali mode,” not as “insert U+000A from the raw stream.” That keeps paragraph handling consistent with `transpileRomanDocument` when `preserveLineBreaks` is `true`.

### `process` and options

```ts
import { BengaliIME } from "@ahamed/bengali-ime";

const ime = new BengaliIME();
const actions = ime.process("k", { textBeforeCaret: peekDocTextBeforeCaret() });
```

- **First argument** — The character or logical key the IME should consume: consonants and vowels as single-character strings, space as `" "`, Enter as `"Enter"` (the IME maps this from its internal symbol table; see tests and `transpileRomanDocument` for line breaks).
- **`textBeforeCaret`** — Full **document text before the caret** in the editor (including Bengali already in the field). When the trailing cluster has an empty buffer, the IME uses this so vowel keys can attach a **kar** to the previous Bengali consonant. It also affects punctuation like smart quotes and doubled hyphen. If you omit it, the IME falls back to its internal `output`, which is correct when your field is only ever driven by the IME at the end of the string.

### `processBackspace`

Returns actions (usually a `delete`) that undo the IME’s last composed step relative to its internal `output`. Wire it to the Backspace key when the caret is in the “IME-owned” region; if the prefix and `ime.output` have diverged, resync first or handle Backspace in your own layer.

### English mode

`toggleEnglishMode()` flips `isEnglishMode`. While on, keystrokes pass through as Latin (and space/Enter still map through the same paths you use in Bengali mode). Use this for mixed Bangla/English typing in one field.

### `transpileRomanDocument`

Bulk conversion of a roman string (optionally with line breaks). By default, `\n` is treated like the editor’s Enter key for paragraph boundaries.

```ts
import { transpileRomanDocument } from "@ahamed/bengali-ime";

const bengali = transpileRomanDocument("ami banglay gan gai\nami banglar gan gai");
```

Options:

- `preserveLineBreaks` (default `true`): map `\n` to the same logical key as Enter in the IME and insert newlines in the output at paragraph breaks. If `false`, raw `\n` characters are passed through; the core engine does not treat U+000A as Enter, so line breaks will not match editor semantics.

## Examples in this repo

- **`yarn example`** — Vite app demonstrating live `BengaliIME` and bulk transliteration (`examples/playground/`).
- **`yarn example:build`** — Production build of that demo (used in CI).

## Publishing

From this package root, run `npm run build` and point `main`, `types`, and `exports` in `package.json` at `dist` for npm releases.
