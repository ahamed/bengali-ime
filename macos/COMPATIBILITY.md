# App compatibility

Pre-release verification for `openspec/changes/add-macos-distribution`. Type the test paragraph below in each app with
Druti selected, then record what happened. A pass means the output matches exactly, with
no stray roman letters and no duplicated or missing characters.

## Test paragraph

Type this, pressing Return where the line breaks:

```
ami banglay gan gai, ami banglar gan gai.
kkh, kSh, rri, Oi, Ou, 2024, "ki?" -- 'hya'
```

Expected:

```
আমি বাংলায় গান গাই, আমি বাংলার গান গাই।
ক্ষ, ক্ষ, ঋ, ঐ, ঔ, ২০২৪, “কি?” — ‘হ্যা’
```

Then also check:
1. **Click then vowel:** click right after an existing `ক` and type `i`. Expect `কি` in apps that
   expose their text, and `কই` elsewhere.
2. **Backspace in a conjunct:** type `kkh`, then Backspace. The whole `ক্ষ` disappears.
3. **Switch mid-word:** type `k`, then switch to ABC. The `ক` stays in the document.

## Results

Status: ✅ works, ⚠️ works with the documented degraded behaviour (write it in Notes), ❌ broken.

| App | Paragraph | Click + vowel | Backspace | Switch mid-word | Notes |
|---|---|---|---|---|---|
| TextEdit | | | | | |
| Notes | | | | | |
| Pages | | | | | |
| Safari | | | | | |
| Chrome | | | | | |
| VS Code | | | | | |
| Slack | | | | | |
| Terminal | | | | | |
| iTerm2 | | | | | |
| Spotlight | | | | | |
| Microsoft Word | | | | | |
