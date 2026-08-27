import { App, Modal, Setting, FuzzySuggestModal, TFolder } from "obsidian";
import type { ExportOptions } from "./types";
import type { LicenseManager } from "./license";

export class MarkdownExportModal extends Modal {
  private sourcePath = "";
  private targetPath = "Exported";
  private convertWikilinks = true;
  private stripPluginMetadata = true;
  private stripFrontmatter = false;
  private normalizeTaskLists = true;
  private license: LicenseManager;
  private onSubmit: (options: ExportOptions) => void;

  constructor(
    app: App,
    license: LicenseManager,
    onSubmit: (options: ExportOptions) => void,
  ) {
    super(app);
    this.license = license;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Export to Standard Markdown" });

    this.renderSourcePicker(contentEl);
    this.renderTargetPicker(contentEl);
    this.renderOptions(contentEl);
    this.renderTierInfo(contentEl);
    this.renderButtons(contentEl);
  }

  private renderSourcePicker(contentEl: HTMLElement): void {
    new Setting(contentEl)
      .setName("Source folder")
      .setDesc("Select the folder to export (leave empty for entire vault)")
      .addButton((btn) => {
        btn.setButtonText("Browse...").onClick(() => {
          new FolderSuggestModal(
            this.app,
            (folder: TFolder) => {
              this.sourcePath = folder.path;
              btn.setButtonText(folder.path);
            },
          ).open();
        });
      })
      .addExtraButton((btn) => {
        btn.setIcon("reset")
          .setTooltip("Export entire vault")
          .onClick(() => {
            this.sourcePath = "";
            btn.setButtonText("");
          });
      });
  }

  private renderTargetPicker(contentEl: HTMLElement): void {
    new Setting(contentEl)
      .setName("Target folder")
      .setDesc("Where exported files will be saved")
      .addText((text) =>
        text
          .setValue(this.targetPath)
          .onChange((value) => {
            this.targetPath = value.trim() || "Exported";
          }),
      );
  }

  private renderOptions(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Export options" });

    new Setting(contentEl)
      .setName("Convert wikilinks")
      .setDesc("[[note]] → [note](note.md), ![[image]] → ![image](image)")
      .addToggle((t) =>
        t.setValue(this.convertWikilinks).onChange((v) => {
          this.convertWikilinks = v;
        }),
      );

    new Setting(contentEl)
      .setName("Strip plugin metadata")
      .setDesc("Remove %%MDBridge:...%% markers")
      .addToggle((t) =>
        t.setValue(this.stripPluginMetadata).onChange((v) => {
          this.stripPluginMetadata = v;
        }),
      );

    new Setting(contentEl)
      .setName("Strip frontmatter")
      .setDesc("Remove YAML frontmatter (---) from exported files")
      .addToggle((t) =>
        t.setValue(this.stripFrontmatter).onChange((v) => {
          this.stripFrontmatter = v;
        }),
      );

    new Setting(contentEl)
      .setName("Normalize task lists")
      .setDesc("Lowercase [X] → [x], remove completion dates")
      .addToggle((t) =>
        t.setValue(this.normalizeTaskLists).onChange((v) => {
          this.normalizeTaskLists = v;
        }),
      );
  }

  private renderTierInfo(contentEl: HTMLElement): void {
    const isPro = this.license.isProEnabled();
    const tierEl = contentEl.createDiv({ cls: "mdbridge-tier-info" });
    if (isPro) {
      tierEl.createEl("p", {
        text: "Pro tier: unlimited exports",
        cls: "mdbridge-pro-text",
      });
    } else {
      tierEl.createEl("p", {
        text: "Free tier: unlimited single-file export, batch export limited",
        cls: "mdbridge-free-text",
      });
    }
  }

  private renderButtons(contentEl: HTMLElement): void {
    const btnContainer = contentEl.createDiv({ cls: "mdbridge-modal-buttons" });
    const exportBtn = btnContainer.createEl("button", {
      text: "Export",
      cls: "mod-cta",
    });
    btnContainer.createEl("button", { text: "Cancel" });

    exportBtn.addEventListener("click", () => {
      this.close();
      this.onSubmit({
        sourcePath: this.sourcePath,
        targetPath: this.targetPath,
        convertWikilinks: this.convertWikilinks,
        stripPluginMetadata: this.stripPluginMetadata,
        stripFrontmatter: this.stripFrontmatter,
        normalizeTaskLists: this.normalizeTaskLists,
        inlineCss: false,
      });
    });

    btnContainer.querySelectorAll("button").forEach((btn) => {
      if (btn.textContent === "Cancel") {
        btn.addEventListener("click", () => this.close());
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  private onSelect: (folder: TFolder) => void;

  constructor(app: App, onSelect: (folder: TFolder) => void) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder("Select source folder...");
  }

  getItems(): TFolder[] {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder);
  }

  getItemText(folder: TFolder): string {
    return folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.onSelect(folder);
  }
}
