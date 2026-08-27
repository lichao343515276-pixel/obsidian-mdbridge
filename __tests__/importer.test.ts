import { NotionImporter } from "../src/importer";
import { LicenseManager } from "../src/license";
import { DEFAULT_SETTINGS } from "../src/types";
import type { NotionImportOptions } from "../src/types";

describe("NotionImporter", () => {
  let importer: NotionImporter;
  let options: NotionImportOptions;

  beforeEach(() => {
    const settings = { ...DEFAULT_SETTINGS, proEnabled: true, proLicenseKey: "MDBR-test1234-abcd" };
    const license = new LicenseManager({} as never, settings);
    importer = new NotionImporter({} as never, license);
    options = {
      sourcePath: "",
      targetFolder: "Imported/Notion",
      cleanFileNames: true,
      convertCallouts: true,
      convertToggles: true,
      convertDatabases: true,
    };
  });

  describe("cleanFileName", () => {
    test("removes Notion UUID from filename", () => {
      const result = importer.cleanFileName("My Note 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.html", true);
      expect(result).toBe("My Note");
    });

    test("preserves filename without UUID", () => {
      const result = importer.cleanFileName("Simple Note.html", true);
      expect(result).toBe("Simple Note");
    });

    test("handles .md extension", () => {
      const result = importer.cleanFileName("Exported Note.md", true);
      expect(result).toBe("Exported Note");
    });

    test("handles path separators", () => {
      const result = importer.cleanFileName("folder/sub/Deep Note.html", true);
      expect(result).toBe("Deep Note");
    });

    test("handles empty/edge cases", () => {
      const result = importer.cleanFileName("", true);
      expect(result).toBe("untitled");
    });
  });

  describe("convertHtmlToMarkdown - callouts", () => {
    test("converts Notion callout block to Obsidian callout", () => {
      const html = '<figure class="block-color-abc123"><div>This is a callout</div></figure>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!note]");
      expect(result).toContain("This is a callout");
    });

    test("maps green callout to tip type", () => {
      const html = '<figure class="block-color-green"><div>Helpful tip</div></figure>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!tip]");
      expect(result).toContain("Helpful tip");
    });

    test("maps blue callout to info type", () => {
      const html = '<figure class="block-color-blue"><div>Information</div></figure>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!info]");
    });

    test("maps yellow callout to warning type", () => {
      const html = '<figure class="block-color-yellow"><div>Be careful</div></figure>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!warning]");
    });

    test("maps red callout to danger type", () => {
      const html = '<figure class="block-color-red"><div>Danger!</div></figure>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!danger]");
    });

    test("converts multiple callouts in one page", () => {
      const html = `
        <figure class="block-color-gray"><div>First callout</div></figure>
        <p>Some text between</p>
        <figure class="block-color-green"><div>Second callout</div></figure>
      `;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!note]");
      expect(result).toContain("First callout");
      expect(result).toContain("> [!tip]");
      expect(result).toContain("Second callout");
    });
  });

  describe("convertHtmlToMarkdown - toggles", () => {
    test("converts Notion toggle to nested list", () => {
      const html = "<details><summary>Toggle Title</summary>Hidden content</details>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("- Toggle Title");
      expect(result).toContain("Hidden content");
    });

    test("converts toggle with multi-line content", () => {
      const html = "<details><summary>FAQ</summary>Line 1<br>Line 2</details>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("- FAQ");
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });
  });

  describe("convertHtmlToMarkdown - database tables", () => {
    test("converts table with header and multiple rows", () => {
      const html = `<table class="collection-content">
        <tr><th>Name</th><th>Age</th><th>Role</th></tr>
        <tr><td>Alice</td><td>30</td><td>Engineer</td></tr>
        <tr><td>Bob</td><td>25</td><td>Designer</td></tr>
      </table>`;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("| Name | Age | Role |");
      expect(result).toContain("| --- | --- | --- |");
      expect(result).toContain("| Alice | 30 | Engineer |");
      expect(result).toContain("| Bob | 25 | Designer |");
    });

    test("handles table with no data rows", () => {
      const html = `<table class="collection-content">
        <tr><th>Col1</th><th>Col2</th></tr>
      </table>`;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("| Col1 | Col2 |");
      expect(result).toContain("| --- | --- |");
    });
  });

  describe("convertHtmlToMarkdown - headings", () => {
    test("preserves heading hierarchy", () => {
      const html = "<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("# Title");
      expect(result).toContain("## Section");
      expect(result).toContain("### Subsection");
    });
  });

  describe("convertHtmlToMarkdown - code blocks", () => {
    test("converts code block with language hint", () => {
      const html = '<pre><code class="language-python">def hello():\n    print("hi")</code></pre>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("```python");
      expect(result).toContain("def hello()");
      expect(result).toContain('print("hi")');
    });

    test("converts code block without language", () => {
      const html = "<pre><code>plain text code</code></pre>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("```");
      expect(result).toContain("plain text code");
    });
  });

  describe("convertHtmlToMarkdown - nested content", () => {
    test("preserves nested list structure", () => {
      const html = "<ul><li>Top level<ul><li>Nested item</li></ul></li></ul>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("Top level");
      expect(result).toContain("Nested item");
    });

    test("preserves blockquote content", () => {
      const html = "<blockquote><p>This is a quote</p></blockquote>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("This is a quote");
    });
  });

  describe("convertHtmlToMarkdown - full page", () => {
    test("converts complete Notion-like page", () => {
      const html = `
        <h1>My Project</h1>
        <p>Introduction paragraph</p>
        <h2>Tasks</h2>
        <ul>
          <li class="to-do"><label><input type="checkbox">Pending task</label></li>
          <li class="done"><label><input type="checkbox" checked>Completed task</label></li>
        </ul>
        <figure class="block-color-green"><div>Important note here</div></figure>
        <pre><code class="language-javascript">console.log("hello");</code></pre>
      `;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("source: notion");
      expect(result).toContain("# My Project");
      expect(result).toContain("Introduction paragraph");
      expect(result).toContain("## Tasks");
      expect(result).toContain("[ ] Pending task");
      expect(result).toContain("[x] Completed task");
      expect(result).toContain("> [!tip]");
      expect(result).toContain("```javascript");
    });
  });

  describe("convertHtmlToMarkdown - frontmatter", () => {
    test("adds source and import date frontmatter", () => {
      const html = "<p>Simple content</p>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("source: notion");
      expect(result).toContain("imported:");
      expect(result.startsWith("---")).toBe(true);
    });
  });

  describe("convertHtmlToMarkdown - edge cases", () => {
    test("handles empty HTML gracefully", () => {
      const result = importer.convertHtmlToMarkdown("", options);
      expect(result).toContain("source: notion");
      expect(result).toContain("imported:");
    });

    test("handles whitespace-only HTML", () => {
      const result = importer.convertHtmlToMarkdown("   \n\n  \n  ", options);
      expect(result).toContain("source: notion");
    });

    test("preserves unicode content", () => {
      const html = "<p>日本語のテスト 한국어 테스트</p>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("日本語のテスト");
      expect(result).toContain("한국어 테스트");
    });

    test("preserves emoji in content", () => {
      const html = "<p>Task list 📋 with emojis ✅</p>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("📋");
      expect(result).toContain("✅");
    });

    test("handles special HTML entities", () => {
      const html = "<p>&amp; &lt; &gt; &quot; &#39;</p>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("&");
    });

    test("handles deeply nested lists", () => {
      const html = "<ul><li>L1<ul><li>L2<ul><li>L3</li></ul></li></ul></li></ul>";
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("L1");
      expect(result).toContain("L2");
      expect(result).toContain("L3");
    });

    test("handles multiple callouts with different colors", () => {
      const html = `
        <figure class="block-color-gray"><div>Note 1</div></figure>
        <figure class="block-color-green"><div>Tip 1</div></figure>
        <figure class="block-color-red"><div>Danger 1</div></figure>
        <figure class="block-color-blue"><div>Info 1</div></figure>
      `;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("> [!note]");
      expect(result).toContain("> [!tip]");
      expect(result).toContain("> [!danger]");
      expect(result).toContain("> [!info]");
    });

    test("preserves links with special characters in URL", () => {
      const html = '<p><a href="https://example.com/path?q=1&p=2">Link</a></p>';
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("https://example.com/path?q=1&p=2");
    });

    test("handles very long content without truncation", () => {
      const longText = "A".repeat(10000);
      const html = `<p>${longText}</p>`;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result.length).toBeGreaterThan(10000);
    });

    test("handles mixed content types in sequence", () => {
      const html = `
        <h1>Title</h1>
        <p>Paragraph</p>
        <ul><li>Item</li></ul>
        <blockquote><p>Quote</p></blockquote>
        <pre><code>code</code></pre>
        <figure class="block-color-gray"><div>Callout</div></figure>
      `;
      const result = importer.convertHtmlToMarkdown(html, options);
      expect(result).toContain("# Title");
      expect(result).toContain("Paragraph");
      expect(result).toContain("Item");
      expect(result).toContain("Quote");
      expect(result).toContain("code");
      expect(result).toContain("> [!note]");
    });
  });

  describe("cleanFileName", () => {
    test("removes UUID suffix", () => {
      const result = importer.cleanFileName(
        "My Note abc123def456789abc123def456789abcd.html",
        true,
      );
      expect(result).not.toMatch(/[a-f0-9]{32}/);
    });

    test("removes .html extension", () => {
      const result = importer.cleanFileName("test.html", true);
      expect(result).not.toContain(".html");
    });

    test("preserves name when cleanNames is false", () => {
      const result = importer.cleanFileName("test file.html", false);
      expect(result).toBe("test file");
    });

    test("normalizes whitespace", () => {
      const result = importer.cleanFileName("test   file  name.html", true);
      expect(result).not.toMatch(/ {2,}/);
    });

    test("handles empty filename", () => {
      const result = importer.cleanFileName("", true);
      expect(result).toBe("untitled");
    });
  });
});

describe("LicenseManager", () => {
  let license: LicenseManager;

  beforeEach(() => {
    const settings = { ...DEFAULT_SETTINGS };
    license = new LicenseManager({} as never, settings);
  });

  test("isProEnabled returns false by default", () => {
    expect(license.isProEnabled()).toBe(false);
  });

  test("rejects invalid license key format", async () => {
    const result = await license.activateLicense("invalid");
    expect(result).toBe(false);
  });

  test("rejects key without MDBR prefix", async () => {
    const result = await license.activateLicense("XXXX-test1234-abcd");
    expect(result).toBe(false);
  });

  test("accepts valid license key format", async () => {
    const result = await license.activateLicense("MDBR-testtest-abcd");
    expect(result).toBe(true);
    expect(license.isProEnabled()).toBe(true);
  });

  test("deactivateLicense clears pro status", async () => {
    await license.activateLicense("MDBR-testtest-abcd");
    expect(license.isProEnabled()).toBe(true);
    license.deactivateLicense();
    expect(license.isProEnabled()).toBe(false);
  });

  test("canImport respects free tier limit", () => {
    expect(license.canImport(5)).toBe(true);
    expect(license.canImport(6)).toBe(false);
  });

  test("getImportLimit returns free tier limit", () => {
    expect(license.getImportLimit()).toBe(5);
  });

  test("getImportLimit returns Infinity when pro enabled", async () => {
    await license.activateLicense("MDBR-testtest-abcd");
    expect(license.getImportLimit()).toBe(Infinity);
  });

  test("canImport unlimited when pro enabled", async () => {
    await license.activateLicense("MDBR-testtest-abcd");
    expect(license.canImport(9999)).toBe(true);
  });
});
