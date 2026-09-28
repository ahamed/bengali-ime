import AppKit
import BengaliIMECore
import Carbon
import Foundation

/// Installing, registering and uninstalling Druti (add-macos-distribution
/// design D2, D3 and D5). One implementation serves the DMG installer
/// (`InstallerUI`), the input menu's Uninstall item and the Makefile, which
/// runs the binary with a flag.
enum Installer {
    /// The input mode that System Settings lists and the input menu shows.
    static let inputModeID = "com.ahamed.inputmethod.Druti.Bengali"

    static let bundleID = Bundle.main.bundleIdentifier ?? "com.ahamed.inputmethod.Druti"

    static var installedURL: URL {
        InstallLocation.userFolder(home: FileManager.default.homeDirectoryForCurrentUser)
            .appendingPathComponent(Bundle.main.bundleURL.lastPathComponent, isDirectory: true)
    }

    /// True when this process runs from an Input Methods folder, i.e. as the
    /// input method rather than as the installer.
    static var isInstalledCopy: Bool {
        InstallLocation.isInstalled(
            bundle: Bundle.main.bundleURL, home: FileManager.default.homeDirectoryForCurrentUser)
    }

    struct Result {
        /// Another copy was installed before and has been replaced.
        var upgraded: Bool
        /// Druti is enabled in the input menu. False when the system refused.
        var enabled: Bool
    }

    struct Failure: LocalizedError {
        var errorDescription: String?
        init(_ message: String) { errorDescription = message }
    }

    // MARK: - Command line

    /// An exit status when `arguments` asked for an install action; nil to run
    /// as the input method (or as the installer, see main.swift).
    static func run(_ arguments: [String]) -> Int32? {
        do {
            if arguments.contains("--install") {
                let result = try install(from: Bundle.main.bundleURL)
                print("\(result.upgraded ? "Updated" : "Installed") \(installedURL.path)")
                if !result.enabled {
                    print("Could not enable it: add it in System Settings > Keyboard > Input Sources > Edit > + > Bengali > Druti.")
                }
                return 0
            }
            if arguments.contains("--uninstall") {
                try uninstall(moveToTrash: false)
                print("Removed \(installedURL.path). It may stay listed in Input Sources until you log out.")
                return 0
            }
            if arguments.contains("--register") {
                try register(Bundle.main.bundleURL)
                print("Registered \(Bundle.main.bundlePath)")
                return 0
            }
            if arguments.contains("--disable") {
                disable()
                return 0
            }
        } catch {
            FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
            return 1
        }
        return nil
    }

    // MARK: - Install

    /// Copies `source` into ~/Library/Input Methods without the quarantine
    /// flag, replacing any earlier copy, then registers and enables it.
    static func install(from source: URL) throws -> Result {
        let fileManager = FileManager.default
        let destination = installedURL
        let upgraded = fileManager.fileExists(atPath: destination.path)

        if source.standardizedFileURL.resolvingSymlinksInPath() != destination.standardizedFileURL.resolvingSymlinksInPath() {
            let folder = destination.deletingLastPathComponent()
            try fileManager.createDirectory(at: folder, withIntermediateDirectories: true)
            let partial = folder.appendingPathComponent(".\(destination.lastPathComponent).partial", isDirectory: true)
            try? fileManager.removeItem(at: partial)
            defer { try? fileManager.removeItem(at: partial) }

            try runTool("/usr/bin/ditto", ["--noqtn", source.path, partial.path], "Copying Druti failed")
            // The user approved this app to open it. The installed copy must
            // start on demand, and a quarantined one would be blocked silently.
            // (ditto --noqtn keeps an existing flag, so remove it explicitly.)
            try removeQuarantine(partial)

            stopRunningCopies()
            if upgraded {
                _ = try fileManager.replaceItemAt(destination, withItemAt: partial)
            } else {
                try fileManager.moveItem(at: partial, to: destination)
            }
        }

        try register(destination)
        let enabled = enable()
        restartInputMenu()
        return Result(upgraded: upgraded, enabled: enabled)
    }

    /// Refreshes Launch Services' cached bundle info (name, icon, input
    /// modes) and makes the system notice the input source without logging out.
    static func register(_ bundle: URL) throws {
        LSRegisterURL(bundle as CFURL, true)
        let status = TISRegisterInputSource(bundle as CFURL)
        guard status == noErr else {
            throw Failure("macOS did not register the input source (error \(status)).")
        }
    }

    /// Enables the input mode so it appears in the input menu, without
    /// selecting it. The system can take a moment to list a newly registered
    /// source, so this retries for about two seconds.
    static func enable() -> Bool {
        for attempt in 0..<10 {
            if attempt > 0 {
                Thread.sleep(forTimeInterval: 0.2)
            }
            guard let mode = sources([kTISPropertyInputSourceID as String: inputModeID]).first else {
                continue
            }
            if isEnabled(mode) || (TISEnableInputSource(mode) == noErr && isEnabled(mode)) {
                return true
            }
        }
        Log.input.error("Could not enable \(inputModeID, privacy: .public)")
        return false
    }

    // MARK: - Uninstall

    /// Disables Druti, removes the installed copy (to the Trash, or deleted
    /// outright for `make uninstall`) and its settings.
    static func uninstall(moveToTrash: Bool) throws {
        disable()
        stopRunningCopies()
        let installed = installedURL
        if FileManager.default.fileExists(atPath: installed.path) {
            _ = try? runTool(lsregister, ["-u", installed.path], "")
            if moveToTrash {
                try FileManager.default.trashItem(at: installed, resultingItemURL: nil)
            } else {
                try FileManager.default.removeItem(at: installed)
            }
        }
        UserDefaults.standard.removePersistentDomain(forName: bundleID)
        restartInputMenu()
    }

    /// Removes Druti from the enabled input sources. The input mode has to be
    /// disabled by its own ID: a bundle ID lookup only finds the parent source.
    static func disable() {
        let all = sources([kTISPropertyBundleID as String: bundleID])
            + sources([kTISPropertyInputSourceID as String: inputModeID])
        for source in all {
            _ = TISDisableInputSource(source)
        }
    }

    // MARK: - Helpers

    private static let lsregister =
        "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

    private static func sources(_ properties: [String: Any]) -> [TISInputSource] {
        guard let list = TISCreateInputSourceList(properties as CFDictionary, true)?.takeRetainedValue() else {
            return []
        }
        return list as? [TISInputSource] ?? []
    }

    private static func isEnabled(_ source: TISInputSource) -> Bool {
        guard let value = TISGetInputSourceProperty(source, kTISPropertyInputSourceIsEnabled) else {
            return false
        }
        return CFBooleanGetValue(Unmanaged<CFBoolean>.fromOpaque(value).takeUnretainedValue())
    }

    /// Removes the download quarantine flag from `bundle` and everything in it.
    private static func removeQuarantine(_ bundle: URL) throws {
        let name = "com.apple.quarantine"
        var paths = [bundle.path]
        if let files = FileManager.default.enumerator(atPath: bundle.path) {
            paths += files.compactMap { $0 as? String }.map { bundle.appendingPathComponent($0).path }
        }
        for path in paths where removexattr(path, name, XATTR_NOFOLLOW) != 0 && errno != ENOATTR {
            throw Failure("Could not clear the download flag on \(path) (\(String(cString: strerror(errno)))).")
        }
    }

    /// Stops other running copies, so the next key press starts the installed
    /// one. The installer runs while the user is in its dialog, so no text
    /// field is composing.
    private static func stopRunningCopies() {
        let others = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
            .filter { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }
        others.forEach { $0.terminate() }
        let deadline = Date().addingTimeInterval(2)
        while others.contains(where: { !$0.isTerminated }) && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.1)
        }
        others.filter { !$0.isTerminated }.forEach { $0.forceTerminate() }
    }

    /// The menu bar's input menu caches names and icons; it relaunches by itself.
    private static func restartInputMenu() {
        _ = try? runTool("/usr/bin/killall", ["TextInputMenuAgent"], "")
    }

    @discardableResult
    private static func runTool(_ path: String, _ arguments: [String], _ failure: String) throws -> Int32 {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: path)
        process.arguments = arguments
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        try process.run()
        process.waitUntilExit()
        if process.terminationStatus != 0 && !failure.isEmpty {
            throw Failure("\(failure) (\(URL(fileURLWithPath: path).lastPathComponent) exited with \(process.terminationStatus)).")
        }
        return process.terminationStatus
    }
}
