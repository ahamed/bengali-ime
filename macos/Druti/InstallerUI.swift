import AppKit

/// What the app does when opened from the DMG (or anywhere outside Input
/// Methods): install itself and explain how to start typing. Druti is a
/// background-only app, so it becomes an accessory app just long enough to
/// show its dialogs (add-macos-distribution design D4).
enum InstallerUI {
    static func run() -> Never {
        let app = NSApplication.shared
        bringToFront(app)

        do {
            let result = try Installer.install(from: Bundle.main.bundleURL)
            if result.enabled {
                showInstalled(upgraded: result.upgraded)
            } else {
                showEnableFailed(upgraded: result.upgraded)
            }
        } catch {
            Log.input.error("Install failed: \(error.localizedDescription, privacy: .public)")
            let alert = NSAlert()
            alert.alertStyle = .critical
            alert.messageText = "Druti couldn’t be installed"
            alert.informativeText = "\(error.localizedDescription)\n\nNothing was changed. Try again, or report the problem on GitHub."
            alert.runModal()
            exit(1)
        }
        exit(0)
    }

    /// Makes a background-only app able to show a frontmost alert.
    static func bringToFront(_ app: NSApplication) {
        app.setActivationPolicy(.accessory)
        app.activate()
    }

    private static var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
    }

    private static func showInstalled(upgraded: Bool) {
        let alert = NSAlert()
        alert.messageText = upgraded ? "Druti was updated to \(version)" : "Druti \(version) is installed"
        alert.informativeText = """
            Druti is now in the input menu in the menu bar. Choose it there, or press \
            Control-Space (or the 🌐 key) to switch between input sources.

            Keep ABC or U.S. enabled too: macOS types passwords with it, and you can \
            switch to it if Druti ever misbehaves.

            You can eject the Druti disk image now.
            """
        alert.runModal()
    }

    private static func showEnableFailed(upgraded: Bool) {
        let alert = NSAlert()
        alert.messageText = upgraded ? "Druti was updated to \(version)" : "Druti \(version) is installed"
        alert.informativeText = """
            macOS didn’t let Druti turn itself on. To add it, open System Settings → \
            Keyboard → Text Input → Input Sources → Edit…, click +, choose Bengali → Druti \
            and click Add. If Druti isn’t listed, log out and back in once.
            """
        alert.addButton(withTitle: "Open Keyboard Settings")
        alert.addButton(withTitle: "Done")
        if alert.runModal() == .alertFirstButtonReturn,
           let url = URL(string: "x-apple.systempreferences:com.apple.Keyboard-Settings.extension") {
            NSWorkspace.shared.open(url)
        }
    }
}
