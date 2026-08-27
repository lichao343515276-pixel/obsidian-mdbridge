import { MarkdownExporter } from "../src/exporter";
import { NotionImporter } from "../src/importer";
import { LicenseManager } from "../src/license";
import { DEFAULT_SETTINGS } from "../src/types";
import type { ExportOptions, NotionImportOptions } from "../src/types";

describe("MarkdownExporter", () => {
  let exporter: MarkdownExporter;

  beforeEach(() => {
    const settings = { ...DEFAULT_SETTINGS };
    const license = new LicenseManager({} as never, settings);
    exporter = new MarkdownExporter({} as never, license);
  });

  const baseOptions: ExportOptions = {
    sourcePath: "",
    targetPath: "export",
    convertWikilinks: true,
    stripPluginMetadata: true,
    stripFrontmatter: false,
    normalizeTaskLists: true,
    inlineCss: false,
  };

  describe("processContent - wikilink conversion", () => {
    test("converts basic wikilink to mdlink", () => {
      const result = exporter.processContent("See [[Some Note]] for details", baseOptions);
      expect(result).toContain("[Some Note](Some Note.md)");
      expect(result).not.toContain("[[");
    });

    test("converts wikilink with alias", () => {
      const result = exporter.processContent("[[Some Note|Display Text]]", baseOptions);
      expect(result).toContain("[Display Text](Some Note.md)");
    });

    test("converts wikilink with .md extension in target", () => {
      const result = exporter.processContent("[[file.md]]", baseOptions);
      expect(result).toContain("[file](file.md)");
    });

    test("converts embedded image wikilinks", () => {
      const result = exporter.processContent("![[image.png]]", baseOptions);
      expect(result).toContain("![image](image.png)");
    });

    test("converts path-style wikilinks", () => {
      const result = exporter.processContent("[[Folder/Sub/Deep Note]]", baseOptions);
      expect(result).toContain("[Deep Note](Folder/Sub/Deep Note.md)");
    });

    test("converts path-style wikilink with alias", () => {
      const result = exporter.processContent("[[Projects/2024/Q1 Report|Q1]]", baseOptions);
      expect(result).toContain("[Q1](Projects/2024/Q1 Report.md)");
    });

    test("does not convert wikilinks when disabled", () => {
      const options = { ...baseOptions, convertWikilinks: false };
      const result = exporter.processContent("[[Some Note]]", options);
      expect(result).toContain("[[Some Note]]");
    });

    test("does not convert wikilinks inside code blocks", () => {
      const content = "Text [[Note1]]\n\n```\n[[Note2]] not converted\n```\n\nMore [[Note3]]";
      const result = exporter.processContent(content, baseOptions);
      expect(result).toContain("[Note1]");
      expect(result).toContain("[[Note2]] not converted");
      expect(result).toContain("[Note3]");
    });

    test("does not convert wikilinks inside inline code", () => {
      const content = "See `[[inline]]` code";
      const result = exporter.processContent(content, baseOptions);
      expect(result).toContain("[[inline]]");
    });
  });

  describe("processContent - metadata stripping", () => {
    test("strips MDBridge plugin metadata", () => {
      const options = { ...baseOptions, convertWikilinks: false };
      const result = exporter.processContent("%%MDBridge:some_data%%\nReal content", options);
      expect(result).not.toContain("MDBridge");
      expect(result).toContain("Real content");
    });

    test("strips dataview metadata", () => {
      const options = { ...baseOptions, convertWikilinks: false };
      const result = exporter.processContent("%%dataview:query%%\nContent", options);
      expect(result).not.toContain("dataview");
      expect(result).toContain("Content");
    });
  });

  describe("processContent - frontmatter", () => {
    test("preserves frontmatter when stripFrontmatter is false", () => {
      const options = { ...baseOptions, convertWikilinks: false };
      const content = "---\ntitle: My Note\ntags: [a, b]\n---\n\nBody text";
      const result = exporter.processContent(content, options);
      expect(result).toContain("title: My Note");
      expect(result).toContain("Body text");
    });

    test("strips frontmatter when stripFrontmatter is true", () => {
      const options = { ...baseOptions, convertWikilinks: false, stripFrontmatter: true };
      const content = "---\ntitle: My Note\ntags: [a, b]\n---\n\nBody text";
      const result = exporter.processContent(content, options);
      expect(result).not.toContain("title: My Note");
      expect(result).not.toContain("---");
      expect(result).toContain("Body text");
    });
  });

  describe("processContent - task list normalization", () => {
    const taskOptions: ExportOptions = {
      ...baseOptions,
      convertWikilinks: false,
      stripPluginMetadata: false,
      stripFrontmatter: false,
    };

    test("normalizes uppercase [X] to lowercase [x]", () => {
      const result = exporter.processContent("- [X] Done task", taskOptions);
      expect(result).toContain("- [x] Done task");
    });

    test("normalizes multiple uppercase task lists", () => {
      const content = "- [X] Task 1\n- [X] Task 2\n- [ ] Task 3";
      const result = exporter.processContent(content, taskOptions);
      expect(result).toContain("- [x] Task 1");
      expect(result).toContain("- [x] Task 2");
      expect(result).toContain("- [ ] Task 3");
    });

    test("strips completion date markers", () => {
      const content = "- [x] Task ✅ 2024-01-15";
      const result = exporter.processContent(content, taskOptions);
      expect(result).not.toContain("✅");
      expect(result).toContain("- [x] Task");
    });

    test("handles indented task lists", () => {
      const content = "Intro\n\n  - [X] Indented task";
      const result = exporter.processContent(content, taskOptions);
      expect(result).toContain("  - [x] Indented task");
    });
  });

  describe("processContent - format cleanup", () => {
    const cleanupOptions: ExportOptions = {
      ...baseOptions,
      convertWikilinks: false,
      stripPluginMetadata: false,
      stripFrontmatter: false,
    };

    test("normalizes line endings", () => {
      const result = exporter.processContent("Line1\r\nLine2\r\nLine3", cleanupOptions);
      expect(result).not.toContain("\r\n");
      expect(result).toContain("Line1\nLine2");
    });

    test("collapses excessive blank lines", () => {
      const result = exporter.processContent("Para 1\n\n\n\n\nPara 2", cleanupOptions);
      expect(result).not.toMatch(/\n{3,}/);
    });

    test("trims trailing whitespace", () => {
      const result = exporter.processContent("Line with spaces   \nAnother line", cleanupOptions);
      expect(result).not.toMatch(/ +$/m);
    });

    test("ensures file ends with newline", () => {
      const result = exporter.processContent("No newline at end", cleanupOptions);
      expect(result.endsWith("\n")).toBe(true);
    });
  });

  describe("processContent - edge cases", () => {
    const edgeOptions: ExportOptions = {
      ...baseOptions,
      convertWikilinks: true,
      stripPluginMetadata: true,
      stripFrontmatter: false,
      normalizeTaskLists: true,
    };

    test("handles empty content", () => {
      const result = exporter.processContent("", edgeOptions);
      expect(result).toBe("");
    });

    test("handles whitespace-only content", () => {
      const result = exporter.processContent("   \n\n  \n  ", edgeOptions);
      expect(result).toBe("");
    });

    test("handles content with no wikilinks", () => {
      const result = exporter.processContent("Just plain text\nNo links here", edgeOptions);
      expect(result).toContain("Just plain text");
      expect(result).toContain("No links here");
    });

    test("handles wikilinks with special characters", () => {
      const result = exporter.processContent("[[Note's Title]]", edgeOptions);
      expect(result).toContain("[Note's Title](Note's Title.md)");
    });

    test("handles multiple code blocks with wikilinks between them", () => {
      const content = "```js\nconst x = 1;\n```\n\n[[Note1]]\n\n```py\nx = 1\n```\n\n[[Note2]]";
      const result = exporter.processContent(content, edgeOptions);
      expect(result).toContain("[Note1]");
      expect(result).toContain("[Note2]");
      expect(result).not.toContain("[[Note1]]");
      expect(result).not.toContain("[[Note2]]");
    });

    test("handles content with only frontmatter", () => {
      const content = "---\ntitle: Test\n---";
      const result = exporter.processContent(content, { ...edgeOptions, stripFrontmatter: false });
      expect(result).toContain("title: Test");
    });

    test("strips frontmatter from content with only frontmatter", () => {
      const content = "---\ntitle: Test\n---";
      const result = exporter.processContent(content, { ...edgeOptions, stripFrontmatter: true });
      expect(result).not.toContain("title: Test");
    });

    test("handles unicode content in wikilinks", () => {
      const result = exporter.processContent("[[日本語ノート]]", edgeOptions);
      expect(result).toContain("[日本語ノート](日本語ノート.md)");
    });

    test("handles very long content", () => {
      const content = "Line\n".repeat(1000);
      const result = exporter.processContent(content, edgeOptions);
      expect(result.length).toBeGreaterThan(1000);
    });

    test("handles mixed line endings", () => {
      const content = "Line1\r\nLine2\nLine3\r\n";
      const result = exporter.processContent(content, edgeOptions);
      expect(result).not.toContain("\r");
    });
  });
});

describe("End-to-end: Import → Export pipeline", () => {
  let importer: NotionImporter;
  let exporter: MarkdownExporter;

  beforeEach(() => {
    const settings = {
      ...DEFAULT_SETTINGS,
      proEnabled: true,
      proLicenseKey: "MDBR-testtest-abcd",
    };
    const license = new LicenseManager({} as never, settings);
    importer = new NotionImporter({} as never, license);
    exporter = new MarkdownExporter({} as never, license);
  });

  const importOptions: NotionImportOptions = {
    sourcePath: "",
    targetFolder: "Imported/Notion",
    cleanFileNames: true,
    convertCallouts: true,
    convertToggles: true,
    convertDatabases: true,
  };

  const exportOptions: ExportOptions = {
    sourcePath: "",
    targetPath: "Exported",
    convertWikilinks: true,
    stripPluginMetadata: true,
    stripFrontmatter: false,
    normalizeTaskLists: true,
    inlineCss: false,
  };

  test("Notion callout survives import → export round-trip", () => {
    const notionHtml = '<figure class="block-color-green"><div>Important tip</div></figure>';
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("> [!tip]");
    expect(md).toContain("Important tip");

    const exported = exporter.processContent(md, exportOptions);
    expect(exported).toContain("> [!tip]");
    expect(exported).toContain("Important tip");
  });

  test("Notion task list survives import → export round-trip", () => {
    const notionHtml = '<ul><li class="to-do"><label><input type="checkbox">Pending</label></li><li class="done"><label><input type="checkbox" checked>Done</label></li></ul>';
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("[ ] Pending");
    expect(md).toContain("[x] Done");

    const exported = exporter.processContent(md, exportOptions);
    expect(exported).toContain("[ ] Pending");
    expect(exported).toContain("[x] Done");
  });

  test("Notion code block survives import → export round-trip", () => {
    const notionHtml = '<pre><code class="language-python">print("hello")</code></pre>';
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("```python");

    const exported = exporter.processContent(md, exportOptions);
    expect(exported).toContain("```python");
    expect(exported).toContain('print("hello")');
  });

  test("Notion database table survives import → export round-trip", () => {
    const notionHtml = `<table class="collection-content">
      <tr><th>Name</th><th>Value</th></tr>
      <tr><td>Item1</td><td>100</td></tr>
    </table>`;
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("| Name | Value |");
    expect(md).toContain("| Item1 | 100 |");

    const exported = exporter.processContent(md, exportOptions);
    expect(exported).toContain("| Name | Value |");
    expect(exported).toContain("| Item1 | 100 |");
  });

  test("Import frontmatter is preserved through export", () => {
    const notionHtml = "<p>Simple content</p>";
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("source: notion");

    const exported = exporter.processContent(md, { ...exportOptions, stripFrontmatter: false });
    expect(exported).toContain("source: notion");
    expect(exported).toContain("Simple content");
  });

  test("Import frontmatter can be stripped during export", () => {
    const notionHtml = "<p>Simple content</p>";
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    expect(md).toContain("source: notion");

    const exported = exporter.processContent(md, { ...exportOptions, stripFrontmatter: true });
    expect(exported).not.toContain("source: notion");
    expect(exported).toContain("Simple content");
  });

  test("Full Notion page round-trip preserves all content", () => {
    const notionHtml = `
      <h1>Project Plan</h1>
      <p>Project description</p>
      <h2>Tasks</h2>
      <ul>
        <li class="to-do"><label><input type="checkbox">Design phase</label></li>
        <li class="done"><label><input type="checkbox" checked>Research</label></li>
      </ul>
      <figure class="block-color-blue"><div>Key insight</div></figure>
      <pre><code class="language-javascript">const x = 1;</code></pre>
    `;
    const md = importer.convertHtmlToMarkdown(notionHtml, importOptions);
    const exported = exporter.processContent(md, exportOptions);

    expect(exported).toContain("# Project Plan");
    expect(exported).toContain("Project description");
    expect(exported).toContain("## Tasks");
    expect(exported).toContain("[ ] Design phase");
    expect(exported).toContain("[x] Research");
    expect(exported).toContain("> [!info]");
    expect(exported).toContain("Key insight");
    expect(exported).toContain("```javascript");
    expect(exported).toContain("const x = 1;");
  });
});
