import XCTest
import BengaliIMECore

final class ComposerBindingTests: XCTestCase {
    private func type(_ keys: String, into composer: Composer) -> String {
        var committed = ""
        for key in keys {
            let update = composer.key(key: String(key), textBeforeCaret: nil)
            XCTAssertTrue(update.handled, "key \(key)")
            committed += update.commit
        }
        return committed
    }

    // Task 4.3: k, h, u, b, space through the bindings commits খুব.
    func testTypingKhubCommitsTheWord() {
        let composer = Composer(config: defaultConfig())
        XCTAssertEqual(type("khub ", into: composer), "খুব ")
        XCTAssertEqual(composer.pending(), "")
    }

    func testPendingThenGraphemeBackspace() {
        let composer = Composer(config: defaultConfig())
        XCTAssertEqual(composer.key(key: "k", textBeforeCaret: nil).pending, "ক")
        XCTAssertEqual(composer.key(key: "h", textBeforeCaret: nil).pending, "খ")
        let update = composer.backspace()
        XCTAssertTrue(update.handled)
        XCTAssertEqual(update.pending, "")
        XCTAssertFalse(composer.backspace().handled)
    }

    func testKarAttachesToDocumentText() {
        let composer = Composer(config: defaultConfig())
        XCTAssertEqual(composer.key(key: "i", textBeforeCaret: "ক").commit, "\u{09BF}")
        XCTAssertEqual(Composer(config: defaultConfig()).key(key: "i", textBeforeCaret: nil).commit, "ই")
    }

    func testHyphenInDocumentBecomesEmDash() {
        let update = Composer(config: defaultConfig()).key(key: "-", textBeforeCaret: "a-")
        XCTAssertEqual(update.replaceBefore, 1)
        XCTAssertEqual(update.commit, "\u{2014}")
    }

    func testConfigToggles() {
        let composer = Composer(
            config: Config(bengaliDigits: false, dariForPeriod: true, smartQuotes: true))
        XCTAssertEqual(type("2", into: composer), "2")
    }

    func testKeyReadsDocument() {
        XCTAssertTrue(keyReadsDocument(key: "i"))
        XCTAssertTrue(keyReadsDocument(key: "\""))
        XCTAssertFalse(keyReadsDocument(key: "k"))
    }

    func testTranspileSelection() {
        // U+09DF is য় (written escaped so editors can't decompose it).
        XCTAssertEqual(
            transpileRomanDocument(
                document: "ami banglay gan gai", preserveLineBreaks: true, config: defaultConfig()),
            "আমি বাংলা\u{09DF} গান গাই")
    }
}

final class KeyRoutingTests: XCTestCase {
    func testPrintableKeysAreTyped() {
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 40, characters: "k")), .type("k"))
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 40, characters: "K")), .type("K"))
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 49, characters: " ")), .type(" "))
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 44, characters: "?")), .type("?"))
    }

    func testBackspace() {
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 51, characters: "\u{7F}")), .backspace)
        XCTAssertEqual(
            KeyRouting.route(KeyPress(keyCode: 51, characters: "\u{7F}", option: true)), .commitAndPass)
    }

    func testNavigationAndReturnCommitAndPass() {
        for code: UInt16 in [36, 76, 48, 53, 117, 115, 119, 116, 121, 123, 124, 125, 126] {
            XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: code, characters: "x")), .commitAndPass, "\(code)")
        }
    }

    func testShortcutsCommitAndPass() {
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 1, characters: "s", command: true)), .commitAndPass)
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 8, characters: "c", control: true)), .commitAndPass)
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 0, characters: "å", option: true)), .commitAndPass)
    }

    func testFunctionAndControlCharactersCommitAndPass() {
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 122, characters: "\u{F704}")), .commitAndPass)
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 0, characters: "\u{1B}")), .commitAndPass)
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 0, characters: nil)), .commitAndPass)
        XCTAssertEqual(KeyRouting.route(KeyPress(keyCode: 0, characters: "")), .commitAndPass)
    }
}

final class DocumentTextTests: XCTestCase {
    func testRangeIsBounded() {
        XCTAssertEqual(DocumentText.rangeBeforeCaret(10), NSRange(location: 0, length: 10))
        XCTAssertEqual(DocumentText.rangeBeforeCaret(5000), NSRange(location: 3976, length: 1024))
        XCTAssertEqual(DocumentText.rangeBeforeCaret(0), NSRange(location: 0, length: 0))
    }

    func testClipsAtParagraphStart() {
        XCTAssertEqual(DocumentText.clipToParagraph("“আমি\nক"), "ক")
        XCTAssertEqual(DocumentText.clipToParagraph("আমি\r\n"), "")
        XCTAssertEqual(DocumentText.clipToParagraph("a\u{2029}b"), "b")
        XCTAssertEqual(DocumentText.clipToParagraph("কখ"), "কখ")
    }
}
