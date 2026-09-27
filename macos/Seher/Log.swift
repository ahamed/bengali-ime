import os

/// View with: log stream --predicate 'subsystem == "com.ahamed.inputmethod.Seher"'
enum Log {
    static let input = Logger(subsystem: "com.ahamed.inputmethod.Seher", category: "input")
}
