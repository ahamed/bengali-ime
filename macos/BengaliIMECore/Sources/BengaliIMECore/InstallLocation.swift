import Foundation

/// Where input methods live, and whether a bundle is running from there
/// (add-macos-distribution design D1). Opened from anywhere else, such as the
/// mounted DMG or a translocated copy of it, the app installs itself instead of
/// running as the input method.
public enum InstallLocation {
    /// The per-user folder that the installer copies into.
    public static func userFolder(home: URL) -> URL {
        home.appendingPathComponent("Library/Input Methods", isDirectory: true)
    }

    /// The system-wide folder. The installer never writes there, but a copy
    /// someone placed there still runs as the input method.
    public static let systemFolder = URL(
        fileURLWithPath: "/Library/Input Methods", isDirectory: true)

    /// True when `bundle` sits directly inside either Input Methods folder.
    /// Symlinks and `..` are resolved first, so an odd path to the same place
    /// still counts.
    public static func isInstalled(bundle: URL, home: URL) -> Bool {
        let parent = canonical(bundle).deletingLastPathComponent().path
        return [userFolder(home: home), systemFolder].contains { canonical($0).path == parent }
    }

    private static func canonical(_ url: URL) -> URL {
        url.standardizedFileURL.resolvingSymlinksInPath()
    }
}
