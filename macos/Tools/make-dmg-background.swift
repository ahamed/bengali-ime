// Renders the DMG window background: the install steps next to where Finder draws Druti.app, as a
// 1x + 2x TIFF (add-macos-distribution design D8). The icon positions in Packaging/dmg-settings.py
// must match the layout here. Run by the Makefile:
// swift Tools/make-dmg-background.swift <out.tiff>
import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    FileHandle.standardError.write(Data("usage: make-dmg-background.swift <out.tiff>\n".utf8))
    exit(2)
}

// Points. Keep in sync with window_rect and icon_locations in dmg-settings.py.
let canvas = NSSize(width: 640, height: 420)
let appIconCentre = NSPoint(x: 140, y: 190) // from the top left, as Finder counts
let bandHeight: CGFloat = 112 // Read Me and Licenses sit on it, centred 60 pt from the bottom

// Light, so the steps read well; the icon labels sit on a mid-tone band that both
// Finder's dark and light label colours stay legible on.
let background = NSColor(calibratedWhite: 0.97, alpha: 1)
let band = NSColor(calibratedWhite: 0.80, alpha: 1)
let ink = NSColor(calibratedWhite: 0.12, alpha: 1)
let muted = NSColor(calibratedWhite: 0.38, alpha: 1)
let accent = NSColor(calibratedRed: 0.0, green: 0.42, blue: 0.36, alpha: 1)

let steps: [(title: String, detail: String)] = [
    ("Double-click Druti to install it.",
     "It copies itself into your Input Methods folder and turns itself on."),
    ("Blocked? Allow it in Privacy & Security.",
     "Open System Settings → Privacy & Security, scroll down, click “Open Anyway” next to Druti, then open Druti again. macOS asks once, because Druti isn’t notarized by Apple."),
    ("Start typing Bengali.",
     "Choose Druti in the input menu in the menu bar, or press Control-Space (or the 🌐 key)."),
]

func font(_ size: CGFloat, _ weight: NSFont.Weight) -> NSFont {
    NSFont.systemFont(ofSize: size, weight: weight)
}

/// Draws `text` in a box whose top edge is `top` points from the top of the canvas.
@discardableResult
func draw(_ text: String, _ attributes: [NSAttributedString.Key: Any], x: CGFloat, top: CGFloat, width: CGFloat) -> CGFloat {
    let string = NSAttributedString(string: text, attributes: attributes)
    // A little slack: the measured height can clip the last line's descenders.
    let height = ceil(string.boundingRect(
        with: NSSize(width: width, height: 1000), options: [.usesLineFragmentOrigin, .usesFontLeading]).height) + 4
    string.draw(with: NSRect(x: x, y: canvas.height - top - height, width: width, height: height),
                options: [.usesLineFragmentOrigin, .usesFontLeading])
    return height
}

func representation(scale: CGFloat) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: Int(canvas.width * scale), pixelsHigh: Int(canvas.height * scale),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = canvas
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

    background.setFill()
    NSRect(origin: .zero, size: canvas).fill()

    // A band behind the icon labels along the bottom (Read Me, Licenses).
    band.setFill()
    NSRect(x: 0, y: 0, width: canvas.width, height: bandHeight).fill()
    // And a rounded tile behind Druti.app and its label.
    NSBezierPath(roundedRect: NSRect(x: appIconCentre.x - 80, y: canvas.height - appIconCentre.y - 92, width: 160, height: 170),
                 xRadius: 14, yRadius: 14).fill()

    let paragraph = NSMutableParagraphStyle()
    paragraph.lineSpacing = 2
    let heading: [NSAttributedString.Key: Any] = [.font: font(22, .semibold), .foregroundColor: ink]
    let number: [NSAttributedString.Key: Any] = [.font: font(15, .bold), .foregroundColor: accent]
    let title: [NSAttributedString.Key: Any] = [.font: font(13.5, .semibold), .foregroundColor: ink, .paragraphStyle: paragraph]
    let detail: [NSAttributedString.Key: Any] = [.font: font(11.5, .regular), .foregroundColor: muted, .paragraphStyle: paragraph]

    draw("Install Druti", heading, x: 260, top: 36, width: 350)
    var top: CGFloat = 84
    for (index, step) in steps.enumerated() {
        draw("\(index + 1)", number, x: 260, top: top, width: 20)
        top += draw(step.title, title, x: 284, top: top, width: 330) + 3
        top += draw(step.detail, detail, x: 284, top: top, width: 330) + 16
    }
    draw("To uninstall, choose “Uninstall Druti…” from Druti’s input menu.", detail, x: 24, top: canvas.height - bandHeight + 20, width: 280)

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let reps = [representation(scale: 1), representation(scale: 2)]
guard let data = NSBitmapImageRep.tiffRepresentationOfImageReps(in: reps, using: .lzw, factor: 0) else {
    FileHandle.standardError.write(Data("could not encode the background\n".utf8))
    exit(1)
}
try data.write(to: URL(fileURLWithPath: arguments[1]))
