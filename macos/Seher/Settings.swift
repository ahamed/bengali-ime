import BengaliIMECore
import Foundation

/// The input menu toggles, stored in UserDefaults (the input method's own
/// preferences domain), so they survive restarts. All on by default.
final class Settings {
    static let shared = Settings()

    enum Option: String, CaseIterable {
        case bengaliDigits
        case dariForPeriod
        case smartQuotes
    }

    private let defaults = UserDefaults.standard

    /// Increases on every change, so each input controller knows when to push
    /// a new `Config` to its composer.
    private(set) var generation = 0

    private init() {
        defaults.register(defaults: Dictionary(uniqueKeysWithValues: Option.allCases.map { ($0.rawValue, true) }))
    }

    func isOn(_ option: Option) -> Bool {
        defaults.bool(forKey: option.rawValue)
    }

    func toggle(_ option: Option) {
        defaults.set(!isOn(option), forKey: option.rawValue)
        generation += 1
    }

    var config: Config {
        Config(
            bengaliDigits: isOn(.bengaliDigits),
            dariForPeriod: isOn(.dariForPeriod),
            smartQuotes: isOn(.smartQuotes))
    }
}
