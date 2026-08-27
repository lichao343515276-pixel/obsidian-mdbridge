# MDBridge v0.9.0 Release Notes

**Release Date:** August 27, 2026  
**Status:** Beta

---

## Overview

MDBridge bridges the gap between Obsidian and the broader Markdown ecosystem. It enhances Obsidian's GFM rendering, enables Notion imports, adds LaTeX/KaTeX support, and exports to standard Markdown for cross-tool compatibility.

## Free Features

### GFM Rendering
- **Strikethrough** — `~~text~~` rendered in all contexts including tables
- **Task Lists** — Interactive checkboxes with click-to-toggle
- **Footnotes** — Enhanced rendering with hover preview and backlinks
- **Definition Lists** — `Term: definition` GFM syntax

### LaTeX & Chemistry
- **Inline Math** — `$E = mc^2$` rendered with KaTeX
- **Block Math** — `$$\int_0^1 x^2 dx$$` display formulas
- **Chemical Equations** — `\ce{2H2 + O2 -> 2H2O}` via mhchem
- **Code Block Processors** — ` ```math ` and ` ```chem ` blocks

## Pro Features

### Notion Import
- Convert Notion HTML exports to Obsidian Markdown
- Callout blocks with color-to-type mapping (gray→note, green→tip, blue→info, yellow→warning, red→danger)
- Toggle blocks → nested lists
- Database tables → Markdown tables
- Code blocks with language preservation
- UUID cleanup in filenames

### Standard Markdown Export
- Wikilinks → standard Markdown links
- Path-style wikilink support (`[[Folder/Note]]`)
- Code block protection (no conversion inside code)
- Plugin metadata stripping (MDBridge + Dataview)
- Frontmatter preservation/stripping option
- Task list normalization
- Format cleanup (line endings, whitespace)

### Batch Operations
- Import/export entire folders with progress tracking
- Unlimited file imports (Free tier: 5 files)

## Installation

### From Community Plugins (coming soon)
1. Settings → Community Plugins → Browse → Search "MDBridge"
2. Install → Enable

### Manual
1. Download `mdbridge-v0.9.0.zip`
2. Extract to `.obsidian/plugins/mdbridge/`
3. Enable in Community Plugins settings

## Pro Activation

1. Settings → MDBridge → "Buy Pro License"
2. Purchase at [mdbridge.dev/pricing](https://mdbridge.dev/pricing)
3. Enter license key in the activation dialog
4. Key format: `MDBR-XXXXXX-XXXXXX-XXXX`

## Technical Details

| Component | Technology |
|-----------|-----------|
| Language | TypeScript 5.x |
| Build | esbuild |
| Testing | Jest (118 tests, 5 suites) |
| Math | KaTeX 0.18 |
| HTML Conversion | turndown.js |
| Min Obsidian | 1.5.0 |

## Known Limitations

- Notion import requires HTML export format (not Notion API)
- Pro license uses format validation (no server-side verification in beta)
- KaTeX CSS loaded at runtime from plugin folder
- Batch export excludes the "Exported" folder

## Feedback

- Bug reports: [GitHub Issues](https://github.com/mdbridge/obsidian-mdbridge/issues)
- Feature requests: [GitHub Discussions](https://github.com/mdbridge/obsidian-mdbridge/discussions)
- Pro support: support@mdbridge.dev

---

*MDBridge is open source under the MIT license. Pro features are gated by a license key but the source code is fully open.*
