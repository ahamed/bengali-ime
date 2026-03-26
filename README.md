# @ahamed/bengali-ime

Phonetic **roman-to-Bengali** transliteration: this is not English-to-Bengali machine translation. You type roman letters (e.g. Avro-style) and get Bengali Unicode text.

Canonical source and releases: [github.com/ahamed/bengali-ime](https://github.com/ahamed/bengali-ime). This directory may also appear inside the [deterministic-bengali-typewriter](https://github.com/ahamed/deterministic-bengali-typewriter) app monorepo as a workspace copy; npm installs should use the package name below, not the app repo.

## `BengaliIME`

Use for live typing: call `process` for each keystroke and apply the returned `IMEAction[]` (insert / replace / delete / splitBlock) in your editor layer.

```ts
import { BengaliIME } from "@ahamed/bengali-ime";

const ime = new BengaliIME();
const actions = ime.process("k", { textBeforeCaret: peekDocTextBeforeCaret() });
```

## `transpileRomanDocument`

Bulk conversion of a roman string (optionally with line breaks). By default, `\n` is treated like the editor’s Enter key for paragraph boundaries.

```ts
import { transpileRomanDocument } from "@ahamed/bengali-ime";

const bengali = transpileRomanDocument("ami banglay gan gai\nami banglar gan gai");
```

Options:

- `preserveLineBreaks` (default `true`): map `\n` to the same logical key as Enter in the IME and insert newlines in the output at paragraph breaks. If `false`, raw `\n` characters are passed through; the core engine does not treat U+000A as Enter, so line breaks will not match editor semantics.

## Publishing

From this package root, run `npm run build` and point `main`, `types`, and `exports` in `package.json` at `dist` for npm releases.
