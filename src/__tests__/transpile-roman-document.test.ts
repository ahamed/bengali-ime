import { describe, it, expect } from "vitest";
import { transpileRomanDocument } from "../transpile-roman-document";

describe("transpileRomanDocument", () => {
  it("defaults preserveLineBreaks to true and inserts newlines at paragraph breaks", () => {
    expect(transpileRomanDocument("a\nb")).toBe("আ\nব");
  });

  it("honors double newline at same output length", () => {
    expect(transpileRomanDocument("a\n\nb")).toBe("আ\n\nব");
  });

  it("with preserveLineBreaks false passes raw newlines through as plain characters", () => {
    expect(transpileRomanDocument("a\nb", { preserveLineBreaks: false })).toBe("আ\nব");
  });
});
