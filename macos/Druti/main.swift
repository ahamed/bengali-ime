import AppKit
import InputMethodKit

// `make install` / `make uninstall` run the binary with a flag to register or
// disable the input source; with no flag it runs as the input method.
if let status = Installer.run(CommandLine.arguments) {
    exit(status)
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
