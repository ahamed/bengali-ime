import os

/// View with: log stream --predicate 'subsystem == "com.ahamed.inputmethod.Druti"'
enum Log {
    static let input = Logger(subsystem: "com.ahamed.inputmethod.Druti", category: "input")
}
