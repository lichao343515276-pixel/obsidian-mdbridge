import { DEFAULT_SETTINGS } from "../src/types";
import type { MDBridgeSettings } from "../src/types";
import { LicenseManager } from "../src/license";

describe("Settings defaults and persistence", () => {
  describe("DEFAULT_SETTINGS", () => {
    test("has all required fields", () => {
      expect(DEFAULT_SETTINGS).toHaveProperty("enableStrikethrough");
      expect(DEFAULT_SETTINGS).toHaveProperty("enableFootnotes");
      expect(DEFAULT_SETTINGS).toHaveProperty("enableTaskLists");
      expect(DEFAULT_SETTINGS).toHaveProperty("enableLatex");
      expect(DEFAULT_SETTINGS).toHaveProperty("enableDefinitionLists");
      expect(DEFAULT_SETTINGS).toHaveProperty("footnotesHoverPreview");
      expect(DEFAULT_SETTINGS).toHaveProperty("taskListShowDates");
      expect(DEFAULT_SETTINGS).toHaveProperty("proLicenseKey");
      expect(DEFAULT_SETTINGS).toHaveProperty("proEnabled");
      expect(DEFAULT_SETTINGS).toHaveProperty("importFileLimit");
    });

    test("enables all core rendering features by default", () => {
      expect(DEFAULT_SETTINGS.enableStrikethrough).toBe(true);
      expect(DEFAULT_SETTINGS.enableFootnotes).toBe(true);
      expect(DEFAULT_SETTINGS.enableTaskLists).toBe(true);
      expect(DEFAULT_SETTINGS.enableLatex).toBe(true);
      expect(DEFAULT_SETTINGS.enableDefinitionLists).toBe(true);
    });

    test("disables Pro features by default", () => {
      expect(DEFAULT_SETTINGS.proEnabled).toBe(false);
      expect(DEFAULT_SETTINGS.proLicenseKey).toBe("");
    });

    test("sets reasonable defaults for optional features", () => {
      expect(DEFAULT_SETTINGS.footnotesHoverPreview).toBe(true);
      expect(DEFAULT_SETTINGS.taskListShowDates).toBe(false);
      expect(DEFAULT_SETTINGS.importFileLimit).toBe(5);
    });
  });

  describe("Settings merging (loadSettings simulation)", () => {
    test("preserves defaults when no saved data", () => {
      const merged = Object.assign({}, DEFAULT_SETTINGS, undefined);
      expect(merged).toEqual(DEFAULT_SETTINGS);
    });

    test("overrides only provided fields", () => {
      const saved = { enableStrikethrough: false, proEnabled: true };
      const merged = Object.assign({}, DEFAULT_SETTINGS, saved);
      expect(merged.enableStrikethrough).toBe(false);
      expect(merged.enableFootnotes).toBe(true);
      expect(merged.proEnabled).toBe(true);
      expect(merged.proLicenseKey).toBe("");
    });

    test("handles empty object", () => {
      const merged = Object.assign({}, DEFAULT_SETTINGS, {});
      expect(merged).toEqual(DEFAULT_SETTINGS);
    });

    test("preserves type safety after merge", () => {
      const saved = { enableLatex: false, importFileLimit: 10 };
      const merged: MDBridgeSettings = Object.assign({}, DEFAULT_SETTINGS, saved);
      expect(typeof merged.enableLatex).toBe("boolean");
      expect(typeof merged.importFileLimit).toBe("number");
    });
  });

  describe("License integration with settings", () => {
    test("free tier limit respects settings.importFileLimit", () => {
      const settings = { ...DEFAULT_SETTINGS, importFileLimit: 3 };
      const license = new LicenseManager({} as never, settings);
      expect(license.canImport(3)).toBe(true);
      expect(license.canImport(4)).toBe(false);
    });

    test("Pro activation updates settings state", async () => {
      const settings = { ...DEFAULT_SETTINGS };
      const license = new LicenseManager({} as never, settings);
      await license.activateLicense("MDBR-testtest-abcd");
      expect(settings.proEnabled).toBe(true);
      expect(settings.proLicenseKey).toBe("MDBR-testtest-abcd");
      expect(license.isProEnabled()).toBe(true);
    });

    test("Deactivation resets settings state", () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        proEnabled: true,
        proLicenseKey: "MDBR-testtest-abcd",
      };
      const license = new LicenseManager({} as never, settings);
      license.deactivateLicense();
      expect(settings.proEnabled).toBe(false);
      expect(settings.proLicenseKey).toBe("");
      expect(license.isProEnabled()).toBe(false);
    });

    test("updateSettings reflects changes in license checks", () => {
      const settings = { ...DEFAULT_SETTINGS };
      const license = new LicenseManager({} as never, settings);
      expect(license.isProEnabled()).toBe(false);

      settings.proEnabled = true;
      settings.proLicenseKey = "MDBR-testtest-abcd";
      license.updateSettings(settings);
      expect(license.isProEnabled()).toBe(true);
    });
  });
});
