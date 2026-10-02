# Spec Delta

## MODIFIED Requirements

### Requirement: Input menu
The input menu SHALL offer checkable toggles for Bengali digits, দাঁড়ি for `.`, and typographic
quotes, all on by default, and for smart hasant, off by default. Choices SHALL persist across
restarts and apply to the next key typed. The menu SHALL also offer "Convert selection to Bengali".

#### Scenario: Turning off Bengali digits
- **WHEN** the author unchecks Bengali digits and types `2024`
- **THEN** `2024` is inserted, and the setting is still off after logging out and back in

#### Scenario: Turning on smart hasant
- **WHEN** the author checks smart hasant and types `korte` and a space
- **THEN** `করতে ` is inserted, and the setting is still on after logging out and back in

#### Scenario: Upgrading keeps smart hasant off
- **WHEN** a user upgrades from a version without the smart hasant item
- **THEN** the item is unchecked and `korte` still gives `কর্তে`
