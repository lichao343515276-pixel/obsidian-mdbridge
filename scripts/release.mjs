import { readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const RELEASE_FILES = [
  "main.js",
  "manifest.json",
  "styles.css",
  "styles/katex.min.css",
];

function getVersion() {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
  return manifest.version;
}

function checkFiles() {
  const missing = RELEASE_FILES.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    console.error("Missing release files:", missing.join(", "));
    console.error("Run 'npm run build' first.");
    process.exit(1);
  }

  for (const f of RELEASE_FILES) {
    const stat = existsSync(f) ? readFileSync(f).length : 0;
    console.log(`  ${f.padEnd(30)} ${(stat / 1024).toFixed(1)} KB`);
  }
}

function createZip(version) {
  const releaseDir = "release";
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }

  const zipName = `mdbridge-v${version}.zip`;
  const zipPath = join(releaseDir, zipName);

  const fileArgs = RELEASE_FILES.map((f) => `"${f}"`).join(", ");
  execSync(
    `powershell -Command "Compress-Archive -Path ${fileArgs} -DestinationPath '${zipPath}' -Force"`,
    { stdio: "inherit" },
  );

  return zipPath;
}

function main() {
  console.log("=== MDBridge Release Packaging ===\n");

  const version = getVersion();
  console.log(`Version: ${version}\n`);

  checkFiles();

  console.log("\nCreating release zip...");
  const zipPath = createZip(version);

  console.log(`\nRelease created: ${zipPath}`);
  console.log("\nNext steps:");
  console.log("  1. Upload release zip to GitHub Releases");
  console.log("  2. Submit to Obsidian community plugins (manifest.json)");
  console.log("  3. Share RELEASE_NOTES.md with the release");
  console.log(`  4. Pro keys: use 'node scripts/keygen.mjs <count>' to generate`);
}

main();
