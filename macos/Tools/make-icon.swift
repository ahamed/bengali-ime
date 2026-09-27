// Renders the menu bar icon, "অ" in the system Bengali font, as a 16×16 pt
// template TIFF (1x and 2x). Run by the Makefile: swift Tools/make-icon.swift <out.tiff>
import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 2 else {
    FileHandle.standardError.write(Data("usage: swift make-icon.swift <out.tiff>\n".utf8))
    exit(2)
}

let points: CGFloat = 16
let glyph = "\u{0985}" as NSString // অ

func representation(scale: CGFloat) -> NSBitmapImageRep {
    let pixels = Int(points * scale)
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let size = 15 * scale
    let font = NSFont(name: "KohinoorBangla-Semibold", size: size)
        ?? NSFont(name: "Kohinoor Bangla", size: size)
        ?? NSFont.systemFont(ofSize: size, weight: .semibold)
    let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.black]
    let bounds = glyph.boundingRect(
        with: NSSize(width: 1000, height: 1000), options: [.usesLineFragmentOrigin], attributes: attributes)
    let canvas = points * scale
    glyph.draw(
        at: NSPoint(x: (canvas - bounds.width) / 2, y: (canvas - bounds.height) / 2),
        withAttributes: attributes)
    NSGraphicsContext.restoreGraphicsState()
    rep.size = NSSize(width: points, height: points)
    return rep
}

let reps = [representation(scale: 1), representation(scale: 2)]
guard let data = NSBitmapImageRep.tiffRepresentationOfImageReps(in: reps, using: .lzw, factor: 0) else {
    FileHandle.standardError.write(Data("could not encode the icon\n".utf8))
    exit(1)
}
try data.write(to: URL(fileURLWithPath: arguments[1]))
