# Changelog

## [0.9.0] - 2026-08-27 (Beta)

### Added

- GFM strikethrough rendering (`~~text~~`)
- GFM task list rendering with interactive checkboxes
- GFM footnote rendering with hover preview
- GFM definition list rendering
- LaTeX/KaTeX formula rendering (inline `$...$` and block `$$...$$`)
- Chemical equation support via mhchem syntax (`\ce{H2O}`)
- `math` and `chem` code block processors
- Notion HTML import with callout, toggle, database, and code block conversion
- Callout color-to-type mapping (gray→note, green→tip, blue→info, yellow→warning, red→danger)
- Standard Markdown export with wikilink conversion and metadata stripping
- Code block protection during wikilink conversion
- Path-style wikilink support (`[[Folder/Sub/Note]]`)
- Frontmatter preservation/stripping option
- Dataview metadata stripping
- Import modal with folder selection and conversion options
- Export modal with folder selection and format options
- Pro license activation system with feature gating
- Progress notifications for batch import/export
- Comprehensive test suite (91 tests across 5 suites)
- README documentation with installation and usage guide

### Fixed

- Image wikilink conversion order (process images before text links)
- TurndownService import method (default export)
- License key validation logic (format-based verification)
- jsdom test environment for renderer tests
- Callout color regex to match color names (not just hex hashes)
- Database table multi-row support via DOM traversal
- Task list `done` class detection in turndown rules
- NodeList.forEach compatibility with turndown DOM
- Free tier limit error message

### Known Limitations

- Notion import requires HTML export format (not Notion API)
- Pro license is format-validated only (no server-side verification in beta)
- KaTeX CSS is loaded at runtime from plugin folder
- Batch export excludes the "Exported" folder to prevent recursive export
