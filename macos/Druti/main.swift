import AppKit
import InputMethodKit

// `make install` / `make uninstall` run the binary with a flag. With no flag it
// runs as the input method when it's in an Input Methods folder, and installs
// itself from anywhere else, such as the mounted DMG.
if let status = Installer.run(CommandLine.arguments) {
    exit(status)
}
if !Installer.isInstalledCopy {
    InstallerUI.run()
}

// The server that connects Druti to every app's text fields. It
// creates one InputController per text-input session.
guard let connectionName = Bundle.main.object(forInfoDictionaryKey: "InputMethodConnectionName") as? String,
      let server = IMKServer(name: connectionName, bundleIdentifier: Bundle.main.bundleIdentifier)
else {
    Log.input.fault("Could not start the input method server")
    exit(1)
}

Log.input.info("Druti started")
withExtendedLifetime(server) {
    NSApplication.shared.run()
}
