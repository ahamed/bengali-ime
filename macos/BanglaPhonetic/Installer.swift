import Carbon
import Foundation

/// Command-line modes used by the Makefile. The input method itself runs with
/// no arguments.
enum Installer {
    /// An exit status when `arguments` asked for an install action; nil to run
    /// as the input method.
    static func run(_ arguments: [String]) -> Int32? {
        if arguments.contains("--register") {
            return register()
        }
        if arguments.contains("--disable") {
            return disable()
        }
        return nil
    }

    /// Makes the system notice this bundle without logging out, so it can be
    /// added in System Settings → Keyboard → Input Sources.
    private static func register() -> Int32 {
        let status = TISRegisterInputSource(Bundle.main.bundleURL as CFURL)
        guard status == 0 else {
            FileHandle.standardError.write(Data("TISRegisterInputSource failed: \(status)\n".utf8))
            return 1
        }
        print("Registered \(Bundle.main.bundlePath)")
        return 0
    }

    /// Removes Bangla Phonetic from the enabled input sources before uninstalling.
    private static func disable() -> Int32 {
        for source in installedSources() {
            _ = TISDisableInputSource(source)
        }
        return 0
    }

    private static func installedSources() -> [TISInputSource] {
        guard let bundleID = Bundle.main.bundleIdentifier else {
            return []
        }
        let filter = [kTISPropertyBundleID as String: bundleID] as CFDictionary
        guard let list = TISCreateInputSourceList(filter, true)?.takeRetainedValue() else {
            return []
        }
        return list as? [TISInputSource] ?? []
    }
}
