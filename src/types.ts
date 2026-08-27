export interface MDBridgeSettings {
  enableStrikethrough: boolean;
  enableFootnotes: boolean;
  enableTaskLists: boolean;
  enableLatex: boolean;
  enableDefinitionLists: boolean;
  footnotesHoverPreview: boolean;
  taskListShowDates: boolean;
  proLicenseKey: string;
  proEnabled: boolean;
  importFileLimit: number;
}

export const DEFAULT_SETTINGS: MDBridgeSettings = {
  enableStrikethrough: true,
  enableFootnotes: true,
  enableTaskLists: true,
  enableLatex: true,
  enableDefinitionLists: true,
  footnotesHoverPreview: true,
  taskListShowDates: false,
  proLicenseKey: "",
  proEnabled: false,
  importFileLimit: 5,
};

export interface NotionImportOptions {
  sourcePath: string;
  targetFolder: string;
  cleanFileNames: boolean;
  convertCallouts: boolean;
  convertToggles: boolean;
  convertDatabases: boolean;
}

export interface ExportOptions {
  sourcePath: string;
  targetPath: string;
  convertWikilinks: boolean;
  stripPluginMetadata: boolean;
  stripFrontmatter: boolean;
  normalizeTaskLists: boolean;
  inlineCss: boolean;
}

export interface ImportResult {
  filesProcessed: number;
  filesSkipped: number;
  errors: string[];
}

export interface ExportResult {
  filesExported: number;
  errors: string[];
}
