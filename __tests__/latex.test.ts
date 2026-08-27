/**
 * @jest-environment jsdom
 */
import { LatexProcessor } from "../src/latex";
import { DEFAULT_SETTINGS } from "../src/types";
import type { MDBridgeSettings } from "../src/types";

describe("LatexProcessor", () => {
  let processor: LatexProcessor;
  let settings: MDBridgeSettings;

  beforeEach(() => {
    settings = { ...DEFAULT_SETTINGS };
    processor = new LatexProcessor({} as never, settings);
  });

  describe("renderToString", () => {
    test("renders inline math to KaTeX HTML", () => {
      const result = processor.renderToString("a^2 + b^2 = c^2", false);
      expect(result).toContain("katex");
      expect(result).toContain("a");
      expect(result).not.toContain("mdbridge-math-error");
    });

    test("renders block math in display mode", () => {
      const result = processor.renderToString("\\frac{1}{2}", true);
      expect(result).toContain("katex-display");
    });

    test("renders inline math without display class", () => {
      const result = processor.renderToString("x + 1", false);
      expect(result).not.toContain("katex-display");
    });

    test("handles invalid LaTeX gracefully", () => {
      const result = processor.renderToString("\\undefinedcommand{x", false);
      expect(result).toContain("mdbridge-math-error");
    });

    test("escapes HTML in error output", () => {
      const result = processor.renderToString("\\undefined<command>", false);
      expect(result).toContain("mdbridge-math-error");
      expect(result).not.toContain("<command>");
    });
  });

  describe("convertInlineToHtml", () => {
    test("converts $...$ to inline math", () => {
      const result = processor.convertInlineToHtml("The value of $x$ is known");
      expect(result).toContain("mdbridge-math-inline");
      expect(result).toContain("katex");
      expect(result).toContain("The value of");
      expect(result).toContain("is known");
    });

    test("converts multiple inline math expressions", () => {
      const result = processor.convertInlineToHtml("$a$ and $b$");
      expect(result).toContain("mdbridge-math-inline");
      expect(result.match(/mdbridge-math-inline/g)?.length).toBe(2);
    });

    test("does not convert escaped dollar signs", () => {
      const result = processor.convertInlineToHtml("Price: \\$5.00");
      expect(result).not.toContain("mdbridge-math-inline");
    });
  });

  describe("convertBlockToHtml", () => {
    test("converts $$...$$ to block math", () => {
      const result = processor.convertBlockToHtml("Intro\n\n$$E = mc^2$$\n\nEnd");
      expect(result).toContain("mdbridge-math-block");
      expect(result).toContain("katex");
      expect(result).toContain("Intro");
      expect(result).toContain("End");
    });

    test("converts multiple block math expressions", () => {
      const result = processor.convertBlockToHtml("$$a$$\ntext\n$$b$$");
      expect(result.match(/mdbridge-math-block/g)?.length).toBe(2);
    });
  });

  describe("convertChemToHtml", () => {
    test("renders chemical equation with mhchem", () => {
      const result = processor.convertChemToHtml("\\ce{H2O}", true);
      expect(result).toContain("katex");
      expect(result).not.toContain("mdbridge-math-error");
    });

    test("renders chemical reaction equation", () => {
      const result = processor.convertChemToHtml("\\ce{2H2 + O2 -> 2H2O}", true);
      expect(result).toContain("katex");
      expect(result).not.toContain("mdbridge-math-error");
    });
  });

  describe("settings integration", () => {
    test("renderToString works when LaTeX is enabled", () => {
      processor.updateSettings({ ...settings, enableLatex: true });
      const result = processor.renderToString("x^2", false);
      expect(result).toContain("katex");
    });

    test("still renders when LaTeX disabled (renderToString is direct)", () => {
      processor.updateSettings({ ...settings, enableLatex: false });
      const result = processor.renderToString("x^2", false);
      expect(result).toContain("katex");
    });
  });
});
