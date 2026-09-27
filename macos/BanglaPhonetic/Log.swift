import os

/// View with: log stream --predicate 'subsystem == "com.ahamed.inputmethod.BanglaPhonetic"'
enum Log {
    static let input = Logger(subsystem: "com.ahamed.inputmethod.BanglaPhonetic", category: "input")
}
