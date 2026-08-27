import { App, Modal, Setting, FuzzySuggestModal, TFolder } from "obsidian";
import type { NotionImportOptions } from "./types";
import type { LicenseManager } from "./license";

export class NotionImportModal extends Modal {
  private sourcePath = "";
  private targetFolder = "Imported/Notion";
  private cleanFileNames = true;
  private convertCallouts = true;
  private convertToggles = true;
  private convertDatabases = true;
  private license: LicenseManager;
  private onSubmit: (options: NotionImportOptions) => void;

  constructor(
    app: App,
    license: LicenseManager,
    onSubmit: (options: NotionImportOptions) => void,
  ) {
    super(app);
    this.license = license;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Import from Notion" });

    this.renderSourcePicker(contentEl);
    this.renderTargetPicker(contentEl);
    this.renderOptions(contentEl);
    this.renderTierInfo(contentEl);
    this.renderButtons(contentEl);
  }

  private renderSourcePicker(contentEl: HTMLElement): void {
    new Setting(contentEl)
      .setName("Source folder")
      .setDesc("Select the folder containing your Notion HTML export")
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
      });
  }

  private renderTargetPicker(contentEl: HTMLElement): void {
    new Setting(contentEl)
      .setName("Target folder")
      .setDesc("Where imported notes will be saved")
      .addText((text) =>
        text
          .setValue(this.targetFolder)
          .onChange((value) => {
            this.targetFolder = value.trim() || "Imported/Notion";
          }),
      );
  }

  private renderOptions(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "Conversion options" });

    new Setting(contentEl)
      .setName("Convert callouts")
      .setDesc("Notion callout blocks → Obsidian callouts")
      .addToggle((t) =>
        t.setValue(this.convertCallouts).onChange((v) => {
          this.convertCallouts = v;
        }),
      );

    new Setting(contentEl)
      .setName("Convert toggles")
      .setDesc("Notion toggle blocks → Obsidian nested lists")
      .addToggle((t) =>
        t.setValue(this.convertToggles).onChange((v) => {
          this.convertToggles = v;
        }),
      );

    new Setting(contentEl)
      .setName("Convert databases")
      .setDesc("Notion database tables → Markdown tables")
      .addToggle((t) =>
        t.setValue(this.convertDatabases).onChange((v) => {
          this.convertDatabases = v;
        }),
      );

    new Setting(contentEl)
      .setName("Clean file names")
      .setDesc("Remove Notion UUIDs and normalize whitespace")
      .addToggle((t) =>
        t.setValue(this.cleanFileNames).onChange((v) => {
          this.cleanFileNames = v;
        }),
      );
  }

  private renderTierInfo(contentEl: HTMLElement): void {
    const isPro = this.license.isProEnabled();
    const tierEl = contentEl.createDiv({ cls: "mdbridge-tier-info" });
    if (isPro) {
      tierEl.createEl("p", {
        text: "Pro tier: unlimited imports",
        cls: "mdbridge-pro-text",
      });
    } else {
      tierEl.createEl("p", {
        text: `Free tier: max ${5} files per import`,
        cls: "mdbridge-free-text",
      });
    }
  }

  private renderButtons(contentEl: HTMLElement): void {
    const btnContainer = contentEl.createDiv({ cls: "mdbridge-modal-buttons" });
    const importBtn = btnContainer.createEl("button", {
      text: "Import",
      cls: "mod-cta",
    });
    btnContainer.createEl("button", { text: "Cancel" });

    importBtn.addEventListener("click", () => {
      if (!this.sourcePath) {
        return;
      }
      this.close();
      this.onSubmit({
        sourcePath: this.sourcePath,
        targetFolder: this.targetFolder,
        cleanFileNames: this.cleanFileNames,
        convertCallouts: this.convertCallouts,
        convertToggles: this.convertToggles,
        convertDatabases: this.convertDatabases,
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
