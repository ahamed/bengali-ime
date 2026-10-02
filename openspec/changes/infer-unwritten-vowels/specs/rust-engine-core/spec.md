# Spec Delta

## MODIFIED Requirements

### Requirement: Bulk transpilation
Bulk conversion of a roman document SHALL produce the Bengali text recorded in the committed transpile
fixtures for the same input, line-break option and settings, which is the text produced by feeding each character to the engine
as a keystroke (a newline as Enter when line breaks are kept). With smart hasant on, each Bengali word
of that text SHALL be resolved as the conjunct-resolution spec describes, and a backtick SHALL act as
the join key exactly as it does while typing.

#### Scenario: Multi-line document
- **WHEN** `ami banglay gan gai\nami banglar gan gai` is converted with line breaks preserved
- **THEN** the result equals the fixture's expected text, with the newline kept between the two sentences

#### Scenario: Smart hasant in bulk conversion
- **WHEN** `ami kaj korte cai, kortar kotha Suni` is converted with smart hasant on
- **THEN** the result is `আমি কাজ করতে চাই, কর্তার কথা শুনি`

#### Scenario: Join key in bulk conversion
- **WHEN** `` por`bo porbo `` is converted with smart hasant on
- **THEN** the result is `পর্ব পরব`

#### Scenario: Default settings are unchanged
- **WHEN** `korte` is converted with default settings
- **THEN** the result is `কর্তে`
