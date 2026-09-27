# Conventions

## Topic path

`guides/<category>/<YYYY-MM-topic-slug>/`

## Asset names

- Ordered guides: `01-short-description.png`
- Standalone diagrams: `diagram-short-description.png`
- Screenshots: `screenshot-short-description.png`
- Comparison images: `comparison-a-vs-b.png`

Use lowercase ASCII kebab-case. Keep Korean titles and descriptions inside Markdown metadata rather than filenames so raw URLs remain stable and portable.

## Topic README

Each topic README should contain:

- one-sentence scope
- ordered image gallery
- brief description per page
- status/date
- caveats if charts are conceptual rather than literal measurements

## Viewer metadata

Each `metadata.json` should provide:

- `slug`, `title`, `category`, `created`, `language`, and `status`
- `summary` for the guide card/detail header
- `tags` for search
- `pages[]` entries mapping each image path to a human-readable title and short description
- `assets[]` with the stable repository path and integrity/dimension metadata

The site catalog is generated from these files. Do not maintain a second hand-written web catalog.

## Viewer build

Run:

```powershell
python scripts/build_site.py
```

This validates referenced image paths and emits `_site/` for local inspection. GitHub Actions performs the same build for GitHub Pages.

## Updating

If the same guide is regenerated, overwrite the stable image path when the semantic page is the same. If the meaning changes materially, create a new topic or a clearly versioned page rather than silently changing historical context.
