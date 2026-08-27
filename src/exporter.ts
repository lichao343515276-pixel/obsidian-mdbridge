import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import type { LicenseManager } from "./license";
import type { ExportOptions, ExportResult } from "./types";

export class MarkdownExporter {
  private app: App;
  private license: LicenseManager;

  constructor(app: App, license: LicenseManager) {
    this.app = app;
    this.license = license;
  }

  async exportVault(
    options: ExportOptions,
    onProgress?: (current: number, total: number, fileName: string) => void,
  ): Promise<ExportResult> {
    const result: ExportResult = { filesExported: 0, errors: [] };
    const sourceFolder = options.sourcePath || "/";
    const folder = this.app.vault.getAbstractFileByPath(sourceFolder);

    if (sourceFolder !== "/" && !(folder instanceof TFolder)) {
      result.errors.push(`Source folder not found: ${sourceFolder}`);
      new Notice("Export source folder not found");
      return result;
    }

    await this.ensureTargetFolder(options.targetPath);

    const files = sourceFolder === "/"
      ? this.collectAllMarkdownFiles()
      : this.collectMarkdownFiles(folder as TFolder);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await this.exportSingleFile(file, options);
        result.filesExported++;
        if (onProgress) {
          onProgress(i + 1, files.length, file.name);
        }
      } catch (e) {
        result.errors.push(`Failed to export ${file.path}: ${e.message}`);
        if (onProgress) {
          onProgress(i + 1, files.length, file.name);
        }
      }
    }

    return result;
  }

  async exportFile(file: TFile, targetFolder: string): Promise<string> {
    const options: ExportOptions = {
      sourcePath: file.path,
      targetPath: targetFolder,
      convertWikilinks: true,
      stripPluginMetadata: true,
      stripFrontmatter: false,
      normalizeTaskLists: true,
      inlineCss: false,
    };
    await this.ensureTargetFolder(targetFolder);
    await this.exportSingleFile(file, options);
    return normalizePath(`${targetFolder}/${file.name}`);
  }

  async exportSingleFile(file: TFile, options: ExportOptions): Promise<void> {
    const content = await this.app.vault.read(file);
    const exported = this.processContent(content, options);
    const targetPath = normalizePath(
      `${options.targetPath}/${file.name}`,
    );
    const existing = this.app.vault.getAbstractFileByPath(targetPath);
    if (existing && existing instanceof TFile) {
      await this.app.vault.modify(existing, exported);
    } else {
      await this.app.vault.create(targetPath, exported);
    }
  }

  processContent(content: string, options: ExportOptions): string {
    if (!content || content.trim().length === 0) {
      return "";
    }

    const segments = this.splitCodeBlocks(content);
    let result = segments
      .map((seg) => {
        if (seg.isCode) return seg.content;
        return this.processTextSegment(seg.content, options);
      })
      .join("");

    if (options.stripFrontmatter) {
      result = this.stripFrontmatter(result);
    }

    return result;
  }

  private processTextSegment(text: string, options: ExportOptions): string {
    let result = text;

    if (options.stripPluginMetadata) {
      result = this.stripPluginMetadata(result);
    }

    if (options.convertWikilinks) {
      result = this.convertWikilinks(result);
    }

    result = this.normalizeFootnotes(result);

    if (options.normalizeTaskLists) {
      result = this.normalizeTaskLists(result);
    }

    result = this.cleanupFormat(result);

    return result;
  }

  private splitCodeBlocks(content: string): { content: string; isCode: boolean }[] {
    const segments: { content: string; isCode: boolean }[] = [];
    const regex = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ content: content.slice(lastIndex, match.index), isCode: false });
      }
      segments.push({ content: match[0], isCode: true });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push({ content: content.slice(lastIndex), isCode: false });
    }

    if (segments.length === 0) {
      segments.push({ content, isCode: false });
    }

    return segments;
  }

  private stripPluginMetadata(content: string): string {
    return content
      .replace(/%%\s*MDBridge:.*?%%\n?/gs, "")
      .replace(/%%\s*dataview:.*?%%\n?/gs, "");
  }

  private stripFrontmatter(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
  }

  private convertWikilinks(content: string): string {
    return content
      .replace(
        /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (match, target, alias) => {
          const alt = alias ? alias.trim() : target.trim().replace(/\.\w+$/, "");
          return `![${alt}](${target.trim()})`;
        },
      )
      .replace(
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        (match, target, alias) => {
          const trimmedTarget = target.trim();
          const link = trimmedTarget.replace(/\.md$/, "");
          const lastSegment = link.split("/").pop() || link;
          const text = alias ? alias.trim() : lastSegment;
          return `[${text}](${link}.md)`;
        },
      );
  }

  private normalizeFootnotes(content: string): string {
    return content
      .replace(/\[\^([^\]]+)\]\[\]/g, "[^$1]")
      .replace(/<a[^>]*id="fnref:[^"]*"[^>]*>([^<]*)<\/a>/g, "[$1]")
      .replace(/<sup class="fnref"[^>]*>.*?<\/sup>/g, "");
  }

  private normalizeTaskLists(content: string): string {
    return content
      .replace(/^(\s*)- \[X\] /gm, "$1- [x] ")
      .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/^(\s*)- \[ \] (.+)$/gm, "$1- [ ] $2");
  }

  private cleanupFormat(content: string): string {
    return content
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/ +$/gm, "")
      .replace(/\t+/g, "  ")
      .trim() + "\n";
  }

  private collectMarkdownFiles(folder: TFolder): TFile[] {
    const files: TFile[] = [];
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === "md") {
        files.push(child);
      } else if (child instanceof TFolder) {
        files.push(...this.collectMarkdownFiles(child));
      }
    }
    return files;
  }

  private collectAllMarkdownFiles(): TFile[] {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => !f.path.startsWith("Exported"));
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
