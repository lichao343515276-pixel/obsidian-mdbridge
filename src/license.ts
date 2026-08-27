import { App, Notice } from "obsidian";
import { MDBridgeSettings } from "./types";

const PRO_FEATURES = {
  notionImport: "notion_import",
  advancedExport: "advanced_export",
  batchOperations: "batch_operations",
} as const;

export class LicenseManager {
  private app: App;
  private settings: MDBridgeSettings;

  constructor(app: App, settings: MDBridgeSettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: MDBridgeSettings): void {
    this.settings = settings;
  }

  isProEnabled(): boolean {
    return this.settings.proEnabled && this.settings.proLicenseKey.length > 0;
  }

  isProFeature(feature: string): boolean {
    if (!this.isProEnabled()) return false;
    return Object.values(PRO_FEATURES).includes(feature as never);
  }

  async activateLicense(key: string): Promise<boolean> {
    if (!key || key.trim().length < 10) {
      new Notice("Invalid license key format");
      return false;
    }

    const result = await this.verifyKey(key);
    if (result) {
      this.settings.proLicenseKey = key;
      this.settings.proEnabled = true;
      new Notice("MDBridge Pro activated successfully!");
    } else {
      new Notice("License verification failed. Please check your key.");
    }
    return result;
  }

  deactivateLicense(): void {
    this.settings.proLicenseKey = "";
    this.settings.proEnabled = false;
    new Notice("MDBridge Pro deactivated");
  }

  canImport(count: number): boolean {
    if (this.isProEnabled()) return true;
    return count <= this.settings.importFileLimit;
  }

  getImportLimit(): number {
    return this.isProEnabled() ? Infinity : this.settings.importFileLimit;
  }

  private async verifyKey(key: string): Promise<boolean> {
    const prefix = "MDBR-";
    if (!key.startsWith(prefix)) return false;

    const body = key.slice(prefix.length);
    if (body.length < 8) return false;

    const parts = body.split("-");
    if (parts.length < 2) return false;

    for (const part of parts) {
      if (part.length < 3) return false;
    }

    return true;
  }

  getFeatureGateMessage(feature: string): string {
    const featureNames: Record<string, string> = {
      [PRO_FEATURES.notionImport]: "Notion Import",
      [PRO_FEATURES.advancedExport]: "Advanced Export",
      [PRO_FEATURES.batchOperations]: "Batch Operations",
    };
    return `${featureNames[feature] || feature} is a MDBridge Pro feature. Upgrade to unlock.`;
  }
}

export { PRO_FEATURES };
