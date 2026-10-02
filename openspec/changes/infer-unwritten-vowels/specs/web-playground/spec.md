# Spec Delta

## MODIFIED Requirements

### Requirement: WASM bindings expose the composer
The WebAssembly package SHALL expose the composer to JavaScript. It SHALL support:
- creating a composer with a settings object;
- a key with optional text before the caret;
- backspace;
- flush;
- reset with optional text before the caret;
- checking a text before the caret against the composer;
- reading the pending text;
- reading and changing the settings.

Each key, backspace, flush or reset SHALL return an update with the same three fields as the native
composer (`commit`, `pending`, `handled`). The values SHALL be identical to what the native composer
returns for the same inputs.

#### Scenario: Aspiration in the browser
- **WHEN** JavaScript creates a composer with default settings and sends `k`, then `h`
- **THEN** the first update has pending `ক` and commits nothing, and the second has pending `খ` and commits nothing

#### Scenario: Commit on a word break
- **WHEN** JavaScript sends `a`, `m`, `i`, then a space
- **THEN** the commits of the four updates join to `আমি ` and the last update leaves no pending text

#### Scenario: Default settings
- **WHEN** JavaScript asks for the default settings
- **THEN** Bengali digits, দাঁড়ি for `.` and smart quotes are all on, and smart hasant is off

#### Scenario: Smart hasant in the browser
- **WHEN** JavaScript creates a composer with smart hasant on and sends `k`, `o`, `r`, `t`, `e`
- **THEN** the last update has pending `করতে`, identical to the native composer

### Requirement: Playground settings toggles
The playground SHALL offer toggles for Bengali digits, দাঁড়ি for `.` and smart quotes, all on by
default, and for smart hasant, off by default. Changing a toggle SHALL apply from the next key in the
editor and to the next bulk conversion.

#### Scenario: ASCII digits
- **WHEN** the user turns Bengali digits off and types `2`
- **THEN** the editor shows `2`

#### Scenario: Smart hasant
- **WHEN** the user turns smart hasant on and types `korte`
- **THEN** the editor shows `করতে`
