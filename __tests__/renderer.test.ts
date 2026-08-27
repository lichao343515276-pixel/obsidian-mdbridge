/**
 * @jest-environment jsdom
 */
import { GfmRenderer } from "../src/renderer";
import { DEFAULT_SETTINGS } from "../src/types";
import type { MDBridgeSettings } from "../src/types";

describe("GfmRenderer", () => {
  let renderer: GfmRenderer;
  let settings: MDBridgeSettings;

  beforeEach(() => {
    settings = { ...DEFAULT_SETTINGS };
    renderer = new GfmRenderer({} as never, settings);
  });

  describe("convertStrikethrough", () => {
    test("converts ~~text~~ to <del> tag", () => {
      const result = renderer.convertStrikethrough("This is ~~deleted~~ text");
      expect(result).toContain('<del class="mdbridge-strikethrough">deleted</del>');
    });

    test("handles multiple strikethrough in one line", () => {
      const result = renderer.convertStrikethrough("~~one~~ and ~~two~~");
      expect(result).toContain('<del class="mdbridge-strikethrough">one</del>');
      expect(result).toContain('<del class="mdbridge-strikethrough">two</del>');
    });

    test("does not convert escaped ~~ (tilde)", () => {
      const result = renderer.convertStrikethrough("Not ~ ~ strikethrough");
      expect(result).not.toContain("<del");
    });

    test("escapes HTML in strikethrough content", () => {
      const result = renderer.convertStrikethrough("~~<script>alert(1)</script>~~");
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    test("handles empty strikethrough gracefully", () => {
      const result = renderer.convertStrikethrough("~~~~");
      expect(result).not.toContain("<del");
    });
  });

  describe("convertDefinitionLists", () => {
    test("converts Term + colon definition to <dl>", () => {
      const html = "<p>Apple\n: A fruit</p>";
      const result = renderer.convertDefinitionLists(html);
      expect(result).toContain("<dl");
      expect(result).toContain("<dt>Apple</dt>");
      expect(result).toContain("<dd>A fruit</dd>");
    });

    test("does not convert without colon pattern", () => {
      const html = "<p>Apple\nA fruit</p>";
      const result = renderer.convertDefinitionLists(html);
      expect(result).toBe(html);
    });
  });

  describe("settings integration", () => {
    test("updateSettings changes behavior", () => {
      renderer.updateSettings({ ...settings, enableStrikethrough: false });
      const el = document.createElement("div");
      el.innerHTML = "<del>test</del>";
      renderer["strikethroughProcessor"](el, {} as never);
      expect(el.querySelector("del")?.classList.contains("mdbridge-strikethrough")).toBeFalsy();
    });
  });
});
