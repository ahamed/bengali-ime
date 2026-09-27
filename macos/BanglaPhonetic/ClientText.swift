import BengaliIMECore
import Foundation
import InputMethodKit

/// Reads text from the app's text field. Many apps (Terminal, some Electron and
/// Java apps) don't expose their text; every read then returns nil and the
/// composer falls back to the text it produced itself.
enum ClientText {
    /// The committed text before the caret, up to `DocumentText.window` UTF-16
    /// units and clipped at the paragraph start.
    static func beforeCaret(of client: IMKTextInput) -> String? {
        let selection = client.selectedRange()
        // At location 0 there is nothing to read, and apps without text access
        // often report 0; either way the composer's own text is the better guess.
        guard selection.location != NSNotFound, selection.location > 0, selection.length == 0 else {
            return nil
        }
        let range = DocumentText.rangeBeforeCaret(selection.location)
        guard let text = client.attributedSubstring(from: range)?.string, !text.isEmpty else {
            return nil
        }
        return DocumentText.clipToParagraph(text)
    }

    /// The selected range and its text, or nil when nothing is selected or the
    /// app doesn't expose it.
    static func selection(of client: IMKTextInput) -> (range: NSRange, text: String)? {
        let range = client.selectedRange()
        guard range.location != NSNotFound, range.length > 0,
              let text = client.attributedSubstring(from: range)?.string, !text.isEmpty
        else {
            return nil
        }
        return (range, text)
    }

    /// The caret position, or nil when unknown or when a range is selected.
    static func caret(of client: IMKTextInput) -> Int? {
        let selection = client.selectedRange()
        guard selection.location != NSNotFound, selection.length == 0 else {
            return nil
        }
        return selection.location
    }
}
