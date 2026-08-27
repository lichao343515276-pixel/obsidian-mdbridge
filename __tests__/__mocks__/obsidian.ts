export class Plugin {
  app: any;
  manifest: any;
  loadData(): Promise<any> { return Promise.resolve({}); }
  saveData(_data: any): Promise<void> { return Promise.resolve(); }
  registerMarkdownPostProcessor(_fn: any): void {}
  registerMarkdownCodeBlockProcessor(_lang: string, _fn: any): void {}
  addSettingTab(_tab: any): void {}
  addCommand(_cmd: any): void {}
  addRibbonIcon(_icon: string, _title: string, _fn: any): void {}
}

export class PluginSettingTab {
  app: any;
  containerEl: HTMLElement;
  constructor(app: any, _plugin: any) {
    this.app = app;
    this.containerEl = document.createElement("div");
  }
}

export class Setting {
  constructor(_containerEl: HTMLElement) {}
  setName(_name: string): this { return this; }
  setDesc(_desc: string): this { return this; }
  addToggle(_fn: any): this { return this; }
  addButton(_fn: any): this { return this; }
  addExtraButton(_fn: any): this { return this; }
}

export class Notice {
  constructor(_message: string) {}
}

export class Modal {
  contentEl: HTMLElement;
  constructor(_app: any) {
    this.contentEl = document.createElement("div");
  }
  onOpen(): void {}
  onClose(): void {}
  close(): void {}
  open(): void {}
}

export class TFile {
  path: string = "";
  name: string = "";
  extension: string = "md";
}

export class TFolder {
  path: string = "";
  children: any[] = [];
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export class Vault {
  adapter: any;
  getAbstractFileByPath(_path: string): any { return null; }
  read(_file: TFile): Promise<string> { return Promise.resolve(""); }
  modify(_file: TFile, _content: string): Promise<void> { return Promise.resolve(); }
  create(_path: string, _content: string): Promise<TFile> { return Promise.resolve(new TFile()); }
  createFolder(_path: string): Promise<void> { return Promise.resolve(); }
}

export class Editor {
  lineCount(): number { return 0; }
  getLine(_n: number): string { return ""; }
  setLine(_n: number, _s: string): void {}
}
