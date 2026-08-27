# MDBridge

GFM rendering, Notion import, LaTeX enhancement, and standard Markdown export for Obsidian.

## Features

### Free Features

- **GFM Strikethrough** — Render `~~strikethrough~~` syntax in all contexts including tables
- **GFM Task Lists** — Interactive checkboxes with click-to-toggle state persistence
- **GFM Footnotes** — Enhanced footnote rendering with hover preview and styled backlinks
- **GFM Definition Lists** — Render `Term: definition` syntax as styled `<dl>` elements
- **LaTeX Enhancement** — Block (`$$...$$`) and inline (`$...$`) formula rendering powered by KaTeX
- **Chemical Equations** — mhchem syntax support for chemistry formulas (e.g., `\ce{H2O}`)

### Pro Features

- **Notion Import** — Convert Notion HTML exports to Obsidian-compatible Markdown
  - Callout blocks → Obsidian callouts
  - Toggle blocks → Nested lists
  - Database tables → Markdown tables
  - Automatic UUID cleanup in filenames
- **Standard Markdown Export** — Export Obsidian notes to standard Markdown
  - Wikilinks → Standard Markdown links
  - Plugin metadata stripping
  - Task list normalization
  - Format cleanup (line endings, whitespace, trailing newlines)
- **Batch Operations** — Import/export entire folders or vaults

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings → Community Plugins
2. Click "Browse" and search for "MDBridge"
3. Click "Install" then "Enable"

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/mdbridge/obsidian-mdbridge/releases)
2. Extract `main.js`, `manifest.json`, `styles.css`, and `styles/` into your vault's `.obsidian/plugins/mdbridge/` folder
3. Enable the plugin in Obsidian Settings → Community Plugins

## Usage

### GFM Rendering

All GFM features are enabled by default. Toggle them in Settings → MDBridge:

- **Strikethrough**: `~~deleted text~~`
- **Task Lists**: `- [ ] Todo` / `- [x] Done`
- **Footnotes**: `[^1]` references with `[^1]: definition`
- **Definition Lists**: `Term\n: Definition`
- **LaTeX**: `$E = mc^2$` (inline) or `$$\int_0^1 x^2 dx$$` (block)
- **Chemistry**: Use ` ```chem ` code blocks with `\ce{2H2 + O2 -> 2H2O}`

### Notion Import (Pro)

1. Export your Notion pages as HTML
2. Run the command "MDBridge: Import from Notion export"
3. Select the exported folder
4. Notes are converted and saved to your specified target folder

### Markdown Export (Pro)

- **Export current file**: "MDBridge: Export current file to standard Markdown"
- **Export entire vault**: "MDBridge: Export to standard Markdown"

Exports convert Obsidian-specific syntax to standard Markdown for cross-tool compatibility.

## Configuration

Access settings via Settings → MDBridge:

| Setting | Description | Default |
|---------|-------------|---------|
| Strikethrough | Render `~~text~~` in all contexts | On |
| Definition lists | Render GFM definition lists | On |
| LaTeX formula enhancement | KaTeX rendering for math | On |
| Interactive task lists | Click checkboxes to toggle | On |
| Show completion dates | Append date when task checked | Off |
| Footnote enhancement | Improved footnote rendering | On |
| Hover preview | Show footnote content on hover | On |

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build    # Production build
npm run dev      # Development build with watch mode
```

### Test

```bash
npm test             # Run all tests
npx jest --verbose   # Run with verbose output
```

### Project Structure

```
mdbridge/
├── src/
│   ├── main.ts          # Plugin entry, lifecycle, commands
│   ├── renderer.ts      # GFM rendering (strikethrough, footnotes, task lists, def lists)
│   ├── latex.ts         # LaTeX/KaTeX rendering (block/inline math, chemistry)
│   ├── importer.ts      # Notion HTML → Markdown conversion
│   ├── exporter.ts      # Obsidian → Standard Markdown export
│   ├── settings.ts      # Settings panel UI
│   ├── license.ts       # Pro feature gating
│   ├── import-modal.ts  # Import folder selection modal
│   ├── export-modal.ts  # Export folder selection modal
│   └── types.ts         # Shared types and defaults
├── __tests__/
│   ├── renderer.test.ts    # GFM rendering tests
│   ├── latex.test.ts       # LaTeX/KaTeX tests
│   ├── importer.test.ts    # Notion import + edge cases + license tests
│   ├── exporter.test.ts    # Markdown export + edge cases + E2E pipeline
│   └── settings.test.ts    # Settings and license integration tests
├── styles/             # KaTeX CSS (auto-copied on build)
├── styles.css          # Plugin styles
├── manifest.json       # Obsidian plugin manifest
├── esbuild.config.mjs  # Build configuration
├── CHANGELOG.md        # Version history
├── LICENSE             # MIT license
└── package.json
```

## Troubleshooting

### LaTeX formulas not rendering

- Ensure "LaTeX formula enhancement" is enabled in Settings → MDBridge
- Check that the `styles/katex.min.css` file exists in your plugin folder
- Try reloading the plugin (disable then re-enable)
- Use `$...$` for inline and `$$...$$` for block formulas

### Notion import shows "No HTML files found"

- Export your Notion pages as HTML (not Markdown or CSV)
- The source folder must contain `.html` files
- Nested folders are searched recursively

### Wikilinks not converted during export

- Enable "Convert wikilinks" in the export modal
- Wikilinks inside code blocks are intentionally preserved
- Path-style wikilinks (`[[Folder/Note]]`) are supported

### Free tier import limit

- Free tier allows up to 5 files per import
- Upgrade to Pro for unlimited imports
- Pro activation: Settings → MDBridge → License → Enter key

### Plugin not loading after install

- Check that `main.js`, `manifest.json`, and `styles.css` are all present
- Verify `minAppVersion` in manifest matches your Obsidian version
- Check the developer console (Ctrl+Shift+I) for error messages

## Tech Stack

- **TypeScript 5.x** — Primary language
- **Obsidian Plugin API** — Plugin framework
- **KaTeX** — LaTeX/chemistry rendering
- **turndown.js** — HTML → Markdown conversion (import)
- **esbuild** — Build tooling
- **Jest** — Unit testing (118 tests across 5 suites)

## License

MIT — See [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
