import { describe, it, expect } from "vitest";
import { transpileRomanDocument } from "../transpile-roman-document";
import { transpileCases } from "./cases";

describe("transpileRomanDocument", () => {
  it.each(transpileCases)("%s", (_name, document, options, expected) => {
    expect(transpileRomanDocument(document, options)).toBe(expected);
  });
});
