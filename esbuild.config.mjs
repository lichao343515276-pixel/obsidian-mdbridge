import esbuild from "esbuild";
import process from "process";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

function copyKatexAssets() {
  const stylesDir = path.join(process.cwd(), "styles");
  if (!existsSync(stylesDir)) {
    mkdirSync(stylesDir, { recursive: true });
  }
  const katexCssSrc = path.join(process.cwd(), "node_modules", "katex", "dist", "katex.min.css");
  if (existsSync(katexCssSrc)) {
    copyFileSync(katexCssSrc, path.join(stylesDir, "katex.min.css"));
    console.log("Copied katex.min.css to styles/");
  }
}

if (prod) {
  await context.rebuild();
  copyKatexAssets();
  process.exit(0);
} else {
  await context.watch();
  copyKatexAssets();
}
