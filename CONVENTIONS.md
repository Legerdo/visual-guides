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

## Updating

If the same guide is regenerated, overwrite the stable image path when the semantic page is the same. If the meaning changes materially, create a new topic or a clearly versioned page rather than silently changing historical context.
