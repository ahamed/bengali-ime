import Foundation

/// How much document text the input method reads before the caret
/// (macos-input-source spec, "Reading the text before the caret").
public enum DocumentText {
    /// At most this many UTF-16 units are read.
    public static let window = 1024

    /// The range to read for a caret at `caret` (UTF-16 offset).
    public static func rangeBeforeCaret(_ caret: Int) -> NSRange {
        let start = max(0, caret - window)
        return NSRange(location: start, length: caret - start)
    }

    /// Keeps only the text after the last line or paragraph break, so quote
    /// balancing and kar attachment never look into an earlier paragraph.
    public static func clipToParagraph(_ text: String) -> String {
        guard let lastBreak = text.lastIndex(where: \.isNewline) else {
            return text
        }
        return String(text[text.index(after: lastBreak)...])
    }
}
