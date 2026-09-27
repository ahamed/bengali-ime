import Foundation

/// A key press, reduced to what routing needs. Built from an `NSEvent` by the
/// input method; kept free of AppKit so the routing rules can be unit-tested.
public struct KeyPress: Equatable {
    /// The layout-independent virtual key code (Carbon `kVK_*`).
    public var keyCode: UInt16
    /// The characters the key produces with Shift applied (`NSEvent.characters`).
    public var characters: String?
    public var command: Bool
    public var control: Bool
    public var option: Bool

    public init(
        keyCode: UInt16, characters: String?,
        command: Bool = false, control: Bool = false, option: Bool = false
    ) {
        self.keyCode = keyCode
        self.characters = characters
        self.command = command
        self.control = control
        self.option = option
    }
}

/// What the input method does with a key press.
public enum KeyAction: Equatable {
    /// Send this character to `Composer.key` (space included).
    case type(String)
    /// Send to `Composer.backspace`; if not handled, the app deletes.
    case backspace
    /// Commit any pending text, then let the app handle the key.
    case commitAndPass
}

/// Key routing from the macos-input-source spec ("Key routing").
public enum KeyRouting {
    public static let deleteKeyCode: UInt16 = 51 // kVK_Delete (Backspace)

    /// Return, Enter, Tab, Escape, Forward Delete, Help, Home, End, Page Up,
    /// Page Down and the arrow keys: commit, then the app handles them.
    public static let commitAndPassKeyCodes: Set<UInt16> = [
        36, 76, 48, 53, 117, 114, 115, 119, 116, 121, 123, 124, 125, 126,
    ]

    public static func route(_ key: KeyPress) -> KeyAction {
        if key.command || key.control || key.option {
            return .commitAndPass
        }
        if key.keyCode == deleteKeyCode {
            return .backspace
        }
        if commitAndPassKeyCodes.contains(key.keyCode) {
            return .commitAndPass
        }
        guard let text = key.characters,
              text.unicodeScalars.count == 1,
              let scalar = text.unicodeScalars.first,
              isTypeable(scalar)
        else {
            return .commitAndPass
        }
        return .type(text)
    }

    /// Printable characters. Excludes control characters and the private-use
    /// range AppKit uses for function keys (F1, F2, ... `NSF1FunctionKey`).
    static func isTypeable(_ scalar: Unicode.Scalar) -> Bool {
        let value = scalar.value
        return value >= 0x20 && value != 0x7F && !(0xF700...0xF8FF).contains(value)
    }
}
