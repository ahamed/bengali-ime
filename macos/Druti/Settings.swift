import BengaliIMECore
import Foundation

/// The input menu toggles, stored in UserDefaults (the input method's own
/// preferences domain), so they survive restarts. All on by default.
///
/// UserDefaults is the only copy: nothing is cached here, so a toggle made in
/// one text field reaches every other input controller on its next key.
enum Settings {
    /// One toggle; the raw value is its UserDefaults key.
    enum Option: String {
        case bengaliDigits
        case dariForPeriod
        case smartQuotes
    }

    private static var defaults: UserDefaults { .standard }

    static func isOn(_ option: Option) -> Bool {
        defaults.object(forKey: option.rawValue) as? Bool ?? true
    }

    static func toggle(_ option: Option) {
        defaults.set(!isOn(option), forKey: option.rawValue)
    }

    static var config: Config {
        Config(
            bengaliDigits: isOn(.bengaliDigits),
            dariForPeriod: isOn(.dariForPeriod),
            smartQuotes: isOn(.smartQuotes))
    }
}
