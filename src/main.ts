import { Notice, Plugin } from "obsidian";
import {
  MDBridgeSettings,
  DEFAULT_SETTINGS,
  ExportOptions,
  ExportResult,
  NotionImportOptions,
  ImportResult,
} from "./types";
import { MDBridgeSettingTab } from "./settings";
import { GfmRenderer } from "./renderer";
import { LatexProcessor } from "./latex";
import { LicenseManager } from "./license";
import { NotionImporter } from "./importer";
import { MarkdownExporter } from "./exporter";
import { NotionImportModal } from "./import-modal";
import { MarkdownExportModal } from "./export-modal";

export default class MDBridgePlugin extends Plugin {
  settings: MDBridgeSettings = DEFAULT_SETTINGS;
  renderer!: GfmRenderer;
  latex!: LatexProcessor;
  license!: LicenseManager;
  importer!: NotionImporter;
  exporter!: MarkdownExporter;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.license = new LicenseManager(this.app, this.settings);
    this.renderer = new GfmRenderer(this.app, this.settings);
    this.latex = new LatexProcessor(this.app, this.settings);
    this.importer = new NotionImporter(this.app, this.license);
    this.exporter = new MarkdownExporter(this.app, this.license);

    this.renderer.registerPostProcessors(this);
    this.latex.registerPostProcessors(this);

    this.addSettingTab(new MDBridgeSettingTab(this.app, this));

    this.addCommand({
      id: "import-notion",
      name: "Import from Notion export",
      callback: () => this.handleNotionImport(),
    });

    this.addCommand({
      id: "export-markdown",
      name: "Export to standard Markdown",
      callback: () => this.handleMarkdownExport(),
    });

    this.addCommand({
      id: "export-current-file",
      name: "Export current file to standard Markdown",
      callback: () => this.handleCurrentFileExport(),
    });

    this.addRibbonIcon(
      "arrow-left-right",
      "MDBridge: Import/Export",
      () => {
        new Notice("MDBridge: Use command palette for Import/Export");
      },
    );

  }

  onunload(): void {
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.license.updateSettings(this.settings);
    this.renderer.updateSettings(this.settings);
    this.latex.updateSettings(this.settings);
  }

  private async handleNotionImport(): Promise<void> {
    new NotionImportModal(this.app, this.license, async (options) => {
      const progressNotice = new Notice("Importing from Notion...", 0);
      const result = await this.importer.import(options, (current, total, fileName) => {
        progressNotice.setMessage(`Importing ${current}/${total}: ${fileName}`);
      });
      progressNotice.hide();

      const summary = `Imported ${result.filesProcessed} files, skipped ${result.filesSkipped}`;
      if (result.errors.length > 0) {
        new Notice(`${summary} (${result.errors.length} errors)`, 10000);
      } else {
        new Notice(summary, 5000);
      }
    }).open();
  }

  private async handleMarkdownExport(): Promise<void> {
    new MarkdownExportModal(this.app, this.license, async (options) => {
      const progressNotice = new Notice("Exporting to standard Markdown...", 0);
      const result = await this.exporter.exportVault(options, (current, total, fileName) => {
        progressNotice.setMessage(`Exporting ${current}/${total}: ${fileName}`);
      });
      progressNotice.hide();

      const summary = `Exported ${result.filesExported} files`;
      if (result.errors.length > 0) {
        new Notice(`${summary} (${result.errors.length} errors)`, 10000);
      } else {
        new Notice(summary, 5000);
      }
    }).open();
  }

  private async handleCurrentFileExport(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("No active file");
      return;
    }
    if (file.extension !== "md") {
      new Notice("Only Markdown files can be exported");
      return;
    }
    try {
      const result = await this.exporter.exportFile(file, "Exported");
      new Notice(`Exported: ${result}`, 5000);
    } catch (e) {
      new Notice(`Export failed: ${e.message}`, 10000);
    }
  }
}
