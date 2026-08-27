import { App, Notice, normalizePath } from "obsidian";
import type { LicenseManager } from "./license";
import type { NotionImportOptions, ImportResult } from "./types";
import TurndownService from "turndown";

const CALLOUT_COLOR_MAP: Record<string, string> = {
  gray: "note",
  brown: "note",
  orange: "warning",
  yellow: "warning",
  green: "tip",
  blue: "info",
  purple: "example",
  pink: "abstract",
  red: "danger",
};

export class NotionImporter {
  private app: App;
  private license: LicenseManager;
  private turndown: TurndownService;

  constructor(app: App, license: LicenseManager) {
    this.app = app;
    this.license = license;
    this.turndown = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });
    this.configureTurndown();
  }

  async import(
    options: NotionImportOptions,
    onProgress?: (current: number, total: number, fileName: string) => void,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      filesProcessed: 0,
      filesSkipped: 0,
      errors: [],
    };

    if (!options.sourcePath) {
      result.errors.push("No source path specified");
      new Notice("Please select a Notion export folder first");
      return result;
    }

    const adapter = this.app.vault.adapter;
    if (!(await adapter.exists(options.sourcePath))) {
      result.errors.push(`Source path not found: ${options.sourcePath}`);
      new Notice("Source folder not found");
      return result;
    }

    const files = await this.collectHtmlFiles(options.sourcePath);
    if (files.length === 0) {
      result.errors.push("No HTML files found in source folder");
      new Notice("No Notion HTML export found");
      return result;
    }

    if (!this.license.canImport(files.length)) {
      const limit = this.license.getImportLimit();
      result.errors.push(
        `Free tier limit: max ${limit} files, found ${files.length}. Upgrade to Pro for unlimited imports.`,
      );
      new Notice(
        `Free tier: max ${limit} files. Found ${files.length}. Upgrade to Pro.`,
      );
      return result;
    }

    await this.ensureTargetFolder(options.targetFolder);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const htmlContent = await adapter.read(file);
        const md = this.convertHtmlToMarkdown(htmlContent, options);
        const fileName = this.cleanFileName(file, options.cleanFileNames);
        const targetPath = normalizePath(
          `${options.targetFolder}/${fileName}.md`,
        );
        await this.app.vault.create(targetPath, md);
        result.filesProcessed++;
        if (onProgress) {
          onProgress(i + 1, files.length, fileName);
        }
      } catch (e) {
        result.errors.push(`Failed to import ${file}: ${e.message}`);
        result.filesSkipped++;
        if (onProgress) {
          onProgress(i + 1, files.length, file);
        }
      }
    }

    return result;
  }

  convertHtmlToMarkdown(html: string, options: NotionImportOptions): string {
    if (!html || html.trim().length === 0) {
      return this.addFrontmatter("");
    }

    let md = this.turndown.turndown(html);

    if (options.convertCallouts) {
      md = this.convertNotionCallouts(md);
    }
    if (options.convertToggles) {
      md = this.convertNotionToggles(md);
    }
    if (options.convertDatabases) {
      md = this.convertNotionDatabases(md);
    }

    md = this.cleanupNotionArtifacts(md);
    md = this.addFrontmatter(md);

    return md;
  }

  private convertNotionCallouts(md: string): string {
    return md.replace(
      /<figure class="block-color-([a-z0-9_]+)">\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/figure>/g,
      (_match, colorHash, content) => {
        const calloutType = this.mapCalloutColor(colorHash);
        const cleaned = content.replace(/<[^>]+>/g, "").trim();
        const lines = cleaned.split("\n").map((l: string) => `> ${l}`);
        return `> [!${calloutType}]\n${lines.join("\n")}`;
      },
    );
  }

  private mapCalloutColor(hashOrName: string): string {
    const lower = hashOrName.toLowerCase();
    for (const [color, calloutType] of Object.entries(CALLOUT_COLOR_MAP)) {
      if (lower.includes(color)) {
        return calloutType;
      }
    }
    return "note";
  }

  private convertNotionToggles(md: string): string {
    return md.replace(
      /<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/g,
      (_match, summary, content) => {
        const cleanSummary = summary.replace(/<[^>]+>/g, "").trim();
        const cleanContent = content
          .replace(/<[^>]+>/g, "")
          .trim()
          .split("\n")
          .map((l: string) => `\t- ${l}`)
          .join("\n");
        return `- ${cleanSummary}\n${cleanContent}`;
      },
    );
  }

  private convertNotionDatabases(md: string): string {
    return md.replace(
      /<table class="collection-content">([\s\S]*?)<\/table>/g,
      (_match, tableHtml) => {
        return this.tableToMarkdown(tableHtml);
      },
    );
  }

  private tableToMarkdown(html: string): string {
    const headerCells: string[] = [];
    const dataRows: string[][] = [];

    const headerMatches = html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g);
    for (const m of headerMatches) {
      headerCells.push(m[1].replace(/<[^>]+>/g, "").trim());
    }

    const rowMatches = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];
      if (rowHtml.includes("<th")) continue;
      const cells: string[] = [];
      const cellMatches = rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g);
      for (const cm of cellMatches) {
        cells.push(cm[1].replace(/<[^>]+>/g, "").trim());
      }
      if (cells.length > 0) {
        dataRows.push(cells);
      }
    }

    if (headerCells.length === 0 && dataRows.length === 0) return "";

    const colCount = headerCells.length || (dataRows[0]?.length ?? 0);
    if (colCount === 0) return "";

    const header = headerCells.length > 0
      ? `| ${headerCells.join(" | ")} |`
      : `| ${Array(colCount).fill("").join(" | ")} |`;

    const separator = `| ${Array(colCount).fill("---").join(" | ")} |`;

    const rows = dataRows.map((row) => {
      const padded = [...row];
      while (padded.length < colCount) padded.push("");
      return `| ${padded.join(" | ")} |`;
    });

    return [header, separator, ...rows].join("\n");
  }

  private cleanupNotionArtifacts(md: string): string {
    return md
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+$/gm, "")
      .replace(/\n{2,}(> \[!)/g, "\n\n$1")
      .trim();
  }

  private addFrontmatter(md: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `---\nsource: notion\nimported: ${date}\n---\n\n${md}`;
  }

  cleanFileName(filePath: string, cleanNames: boolean): string {
    const parts = filePath.replace(/\\/g, "/").split("/");
    let name = parts[parts.length - 1] || "untitled";

    name = name.replace(/\.(html?|md)$/i, "");

    if (cleanNames) {
      name = name.replace(/\s*[a-f0-9]{32}\s*/g, "");
      name = name.replace(/\s+/g, " ").trim();
    }

    return name || "untitled";
  }

  private configureTurndown(): void {
    this.turndown.addRule("strikethrough", {
      filter: ["del", "s"] as never,
      replacement: (content: string) => `~~${content}~~`,
    });

    this.turndown.addRule("taskListItem", {
      filter: (node: HTMLElement) => {
        if (node.nodeName !== "LI") return false;
        const cls = node.getAttribute("class") || "";
        return cls.includes("to-do") || cls.includes("done") ||
          node.getAttribute("data-type") === "todo";
      },
      replacement: (content: string, node: HTMLElement) => {
        const classAttr = node.getAttribute("class") || "";
        const isChecked = classAttr.includes("done") ||
          (node.querySelector("input") as HTMLInputElement)?.checked;
        return `- [${isChecked ? "x" : " "}] ${content.trim()}`;
      },
    } as never);

    this.turndown.addRule("notionCallout", {
      filter: (node: HTMLElement) =>
        node.nodeName === "FIGURE" && node.className.includes("block-color-"),
      replacement: (_content: string, node: HTMLElement) => {
        const colorMatch = node.className.match(/block-color-([a-z0-9_]+)/);
        const colorHash = colorMatch ? colorMatch[1] : "";
        const calloutType = this.mapCalloutColor(colorHash);
        const div = node.querySelector("div");
        const text = div?.textContent?.trim() || node.textContent?.trim() || "";
        const lines = text.split("\n").map((l) => `> ${l}`);
        return `> [!${calloutType}]\n${lines.join("\n")}`;
      },
    } as never);

    this.turndown.addRule("notionToggle", {
      filter: (node: HTMLElement) => node.nodeName === "DETAILS",
      replacement: (_content: string, node: HTMLElement) => {
        const summary = node.querySelector("summary");
        const summaryText = summary?.textContent?.trim() || "";
        const fullText = node.textContent?.trim() || "";
        const bodyText = fullText.replace(summaryText, "").trim();
        return `- ${summaryText}\n\t- ${bodyText}`;
      },
    } as never);

    this.turndown.addRule("notionCode", {
      filter: (node: HTMLElement) =>
        node.nodeName === "PRE" &&
        node.querySelector("code") !== null,
      replacement: (_content: string, node: HTMLElement) => {
        const codeEl = node.querySelector("code");
        const langMatch = codeEl?.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : "";
        const code = codeEl?.textContent || "";
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      },
    } as never);

    this.turndown.addRule("notionBookmark", {
      filter: (node: HTMLElement) =>
        node.nodeName === "A" &&
        node.classList.contains("bookmark") &&
        node.getAttribute("href") !== null,
      replacement: (_content: string, node: HTMLElement) => {
        const href = node.getAttribute("href") || "";
        const titleEl = node.querySelector(".bookmark-title");
        const title = titleEl?.textContent?.trim() || href;
        return `[${title}](${href})`;
      },
    } as never);

    this.turndown.addRule("notionDatabase", {
      filter: (node: HTMLElement) =>
        node.nodeName === "TABLE" && node.className.includes("collection-content"),
      replacement: (_content: string, node: HTMLElement) => {
        return "\n" + this.tableElementToMarkdown(node) + "\n";
      },
    } as never);
  }

  private tableElementToMarkdown(table: HTMLElement): string {
    const headerCells: string[] = [];
    const dataRows: string[][] = [];

    const ths = Array.from(table.querySelectorAll("th")) as HTMLElement[];
    for (const th of ths) {
      headerCells.push(th.textContent?.trim() || "");
    }

    const trs = Array.from(table.querySelectorAll("tr")) as HTMLElement[];
    for (const tr of trs) {
      if (tr.querySelector("th")) continue;
      const cells: string[] = [];
      const tds = Array.from(tr.querySelectorAll("td")) as HTMLElement[];
      for (const td of tds) {
        cells.push(td.textContent?.trim() || "");
      }
      if (cells.length > 0) dataRows.push(cells);
    }

    if (headerCells.length === 0 && dataRows.length === 0) return "";

    const colCount = headerCells.length || (dataRows[0]?.length ?? 0);
    if (colCount === 0) return "";

    const header = headerCells.length > 0
      ? `| ${headerCells.join(" | ")} |`
      : `| ${Array(colCount).fill("").join(" | ")} |`;

    const separator = `| ${Array(colCount).fill("---").join(" | ")} |`;

    const rows = dataRows.map((row) => {
      const padded = [...row];
      while (padded.length < colCount) padded.push("");
      return `| ${padded.join(" | ")} |`;
    });

    return [header, separator, ...rows].join("\n");
  }

  private async collectHtmlFiles(dirPath: string): Promise<string[]> {
    const adapter = this.app.vault.adapter;
    const results: string[] = [];
    await this.walkDir(adapter, dirPath, results);
    return results;
  }

  private async walkDir(
    adapter: { read: (p: string) => Promise<string>; list: (p: string) => Promise<[string[], string[]]> },
    dirPath: string,
    results: string[],
  ): Promise<void> {
    const [folders, files] = await adapter.list(dirPath);
    for (const file of files) {
      if (file.match(/\.html?$/i)) {
        results.push(normalizePath(`${dirPath}/${file}`));
      }
    }
    for (const folder of folders) {
      await this.walkDir(adapter, normalizePath(`${dirPath}/${folder}`), results);
    }
  }

  private async ensureTargetFolder(folderPath: string): Promise<void> {
    const parts = folderPath.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}
