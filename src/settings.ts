import { App, Notice, PluginSettingTab, Setting, Modal } from "obsidian";
import type MDBridgePlugin from "./main";
import type { MDBridgeSettings } from "./types";

export class MDBridgeSettingTab extends PluginSettingTab {
  plugin: MDBridgePlugin;

  constructor(app: App, plugin: MDBridgePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "MDBridge Settings" });

    this.renderRenderingSection(containerEl);
    this.renderTaskListSection(containerEl);
    this.renderFootnoteSection(containerEl);
    this.renderProSection(containerEl);
    this.renderAboutSection(containerEl);
  }

  getSettingDefinitions() {
    return [
      { key: "enableStrikethrough", label: "Strikethrough rendering" },
      { key: "enableFootnotes", label: "Footnote enhancements" },
      { key: "enableTaskLists", label: "Interactive task lists" },
      { key: "taskListShowDates", label: "Task completion dates" },
      { key: "enableDefinitionLists", label: "Definition lists" },
      { key: "enableLatex", label: "LaTeX/KaTeX formulas" },
    ];
  }

  private renderRenderingSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "GFM Rendering" });

    new Setting(containerEl)
      .setName("Strikethrough")
      .setDesc("Render ~~strikethrough~~ in all contexts including tables")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableStrikethrough)
          .onChange(async (value) => {
            this.plugin.settings.enableStrikethrough = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Definition lists")
      .setDesc("Render GFM definition lists (Term: definition)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableDefinitionLists)
          .onChange(async (value) => {
            this.plugin.settings.enableDefinitionLists = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("LaTeX formula enhancement")
      .setDesc("Enhanced block/inline formula rendering with KaTeX")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableLatex)
          .onChange(async (value) => {
            this.plugin.settings.enableLatex = value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private renderTaskListSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "Task Lists" });

    new Setting(containerEl)
      .setName("Interactive task lists")
      .setDesc("Click checkboxes to toggle task state and write back to file")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableTaskLists)
          .onChange(async (value) => {
            this.plugin.settings.enableTaskLists = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Show completion dates")
      .setDesc('Append completion date when task is checked (uses "YYYY-MM-DD" format)')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.taskListShowDates)
          .onChange(async (value) => {
            this.plugin.settings.taskListShowDates = value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private renderFootnoteSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "Footnotes" });

    new Setting(containerEl)
      .setName("Footnote enhancement")
      .setDesc("Improved footnote rendering with backlinks and styling")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableFootnotes)
          .onChange(async (value) => {
            this.plugin.settings.enableFootnotes = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Hover preview")
      .setDesc("Show footnote content in a tooltip on hover")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.footnotesHoverPreview)
          .onChange(async (value) => {
            this.plugin.settings.footnotesHoverPreview = value;
            await this.plugin.saveSettings();
          }),
      );
  }

  private renderProSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "MDBridge Pro" });

    const statusText = this.plugin.license.isProEnabled()
      ? "Pro activated — all features unlocked"
      : "Free tier — upgrade for full access";

    new Setting(containerEl)
      .setName("License status")
      .setDesc(statusText)
      .addButton((btn) =>
        btn
          .setButtonText(this.plugin.license.isProEnabled() ? "Deactivate" : "Activate Key")
          .onClick(() => {
            if (this.plugin.license.isProEnabled()) {
              this.plugin.license.deactivateLicense();
              this.plugin.saveSettings();
              this.display();
            } else {
              new LicenseKeyModal(this.app, async (key) => {
                const success = await this.plugin.license.activateLicense(key);
                if (success) {
                  await this.plugin.saveSettings();
                }
                this.display();
              }).open();
            }
          }),
      );

    this.renderFeatureComparison(containerEl);

    if (this.plugin.license.isProEnabled()) {
      new Setting(containerEl)
        .setName("Pro features")
        .setDesc("Notion import — Advanced export — Batch operations — Unlimited files")
        .addExtraButton((btn) =>
          btn.setIcon("checkmark").setTooltip("All Pro features unlocked"),
        );
    } else {
      new Setting(containerEl)
        .setName("Upgrade to Pro")
        .setDesc(`Free tier limit: ${this.plugin.settings.importFileLimit} files per import`)
        .addButton((btn) =>
          btn
            .setButtonText("Buy Pro License")
            .setClass("mod-cta")
            .onClick(() => {
              window.open("https://mdbridge.dev/pricing", "_blank");
            }),
        )
        .addButton((btn) =>
          btn
            .setButtonText("Enter Key")
            .onClick(() => {
              new LicenseKeyModal(this.app, async (key) => {
                const success = await this.plugin.license.activateLicense(key);
                if (success) {
                  await this.plugin.saveSettings();
                }
                this.display();
              }).open();
            }),
        );
    }
  }

  private renderFeatureComparison(containerEl: HTMLElement): void {
    const features = [
      { name: "GFM Strikethrough", free: true, pro: true },
      { name: "GFM Task Lists", free: true, pro: true },
      { name: "GFM Footnotes", free: true, pro: true },
      { name: "GFM Definition Lists", free: true, pro: true },
      { name: "LaTeX/KaTeX Formulas", free: true, pro: true },
      { name: "Chemical Equations", free: true, pro: true },
      { name: "Notion Import", free: false, pro: true },
      { name: "Standard Markdown Export", free: false, pro: true },
      { name: "Batch Import/Export", free: false, pro: true },
      { name: "Unlimited File Imports", free: false, pro: true },
      { name: "Priority Support", free: false, pro: true },
    ];

    const tableEl = containerEl.createDiv({ cls: "mdbridge-comparison-table" });

    const headerRow = tableEl.createDiv({ cls: "mdbridge-comparison-header" });
    headerRow.createDiv({ text: "Feature" });
    headerRow.createDiv({ text: "Free" });
    headerRow.createDiv({ text: "Pro" });

    for (const f of features) {
      const row = tableEl.createDiv({ cls: "mdbridge-comparison-row" });
      row.createDiv({ text: f.name, cls: "mdbridge-comparison-feature" });

      const freeCell = row.createDiv({ cls: f.free ? "mdbridge-check" : "mdbridge-cross" });
      freeCell.setText(f.free ? "✓" : "—");

      const proCell = row.createDiv({ cls: f.pro ? "mdbridge-check mdbridge-pro-check" : "mdbridge-cross" });
      proCell.setText(f.pro ? "✓" : "—");
    }
  }

  private renderAboutSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "About" });

    new Setting(containerEl)
      .setName("Version")
      .setDesc("MDBridge v0.9.0")
      .addExtraButton((btn) =>
        btn.setIcon("info").setTooltip("Check for updates"),
      );

    new Setting(containerEl)
      .setName("Documentation")
      .setDesc("View full documentation and migration guides")
      .addButton((btn) =>
        btn.setButtonText("Open").onClick(() => {
          window.open("https://mdbridge.dev/docs", "_blank");
        }),
      );
  }
}

class LicenseKeyModal extends Modal {
  private keyInput: HTMLInputElement;
  private onSubmit: (key: string) => void;

  constructor(app: App, onSubmit: (key: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Activate MDBridge Pro" });
    contentEl.createEl("p", {
      text: "Enter your license key to unlock Pro features.",
      cls: "mdbridge-modal-desc",
    });

    this.keyInput = contentEl.createEl("input", {
      type: "text",
      attr: { placeholder: "MDBR-XXXX-XXXX-XXXX" },
    });
    this.keyInput.addClass("mdbridge-license-input");

    const btnContainer = contentEl.createDiv({ cls: "mdbridge-modal-buttons" });
    const submitBtn = btnContainer.createEl("button", {
      text: "Activate",
      cls: "mod-cta",
    });
    btnContainer.createEl("button", { text: "Cancel" });

    submitBtn.addEventListener("click", () => {
      this.onSubmit(this.keyInput.value.trim());
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
