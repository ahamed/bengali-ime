// Renders the menu bar icon, "দ্রু" (the first syllable of Druti, দ্রুতি) cut out of a filled
// rounded badge, as a 22×16 pt template TIFF (1x and 2x). The badge and glyph size match the
// system's own Bangla and ABC input source badges. Run by the Makefile:
// swift Tools/make-icon.swift <out.tiff>
import AppKit

func fail(_ message: String, status: Int32 = 1) -> Never {
    FileHandle.standardError.write(Data("\(message)\n".utf8))
    exit(status)
}

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    fail("usage: swift make-icon.swift <out.tiff>", status: 2)
}

let canvas = NSSize(width: 22, height: 16)  // points
let badge = NSRect(origin: .zero, size: canvas)
let radius: CGFloat = 4.5
// The size at which the letter body (ক) is 8.5 pt tall, as in the system badges.
let fontSize: CGFloat = 13
// দ্রু, written with escapes so editors can't reorder the virama and vowel sign.
let glyph = "\u{09A6}\u{09CD}\u{09B0}\u{09C1}"

func representation(scale: CGFloat) -> NSBitmapImageRep {
    guard
        let rep = NSBitmapImageRep(
            bitmapDataPlanes: nil, pixelsWide: Int(canvas.width * scale),
            pixelsHigh: Int(canvas.height * scale),
            bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
            colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)
    else {
        fail("could not create a \(scale)x bitmap")
    }
    NSGraphicsContext.saveGraphicsState()
    guard let graphics = NSGraphicsContext(bitmapImageRep: rep) else {
        fail("could not draw into a \(scale)x bitmap")
    }
    NSGraphicsContext.current = graphics
    let context = graphics.cgContext
    context.scaleBy(x: scale, y: scale)

    // The filled badge.
    NSColor.black.setFill()
    NSBezierPath(roundedRect: badge, xRadius: radius, yRadius: radius).fill()

    // The glyph, centred on its ink rather than its advance box, since the conjunct's ু hangs
    // well below the baseline.
    let font =
        NSFont(name: "KohinoorBangla-Medium", size: fontSize)
        ?? NSFont(name: "Kohinoor Bangla", size: fontSize)
        ?? NSFont.systemFont(ofSize: fontSize, weight: .medium)
    let text = CTLineCreateWithAttributedString(
        NSAttributedString(string: glyph, attributes: [.font: font]))
    let ink = CTLineGetBoundsWithOptions(text, .useGlyphPathBounds)
    context.textPosition = CGPoint(x: badge.midX - ink.midX, y: badge.midY - ink.midY)

    // Punch the glyph out of the badge, so it shows whatever is behind the menu bar.
    context.setBlendMode(.destinationOut)
    CTLineDraw(text, context)
    NSGraphicsContext.restoreGraphicsState()
    rep.size = canvas
    return rep
}

let reps = [representation(scale: 1), representation(scale: 2)]
guard let data = NSBitmapImageRep.tiffRepresentationOfImageReps(in: reps, using: .lzw, factor: 0)
else {
    fail("could not encode the icon")
}
try data.write(to: URL(fileURLWithPath: arguments[1]))
