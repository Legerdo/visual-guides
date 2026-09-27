# Visual Guides

A public, topic-organized archive for visual guides, explainers, infographics, and reference images.

## Viewer

**https://legerdo.github.io/visual-guides/**

The GitHub Pages viewer provides:

- topic/category cards and search
- page thumbnails and previous/next navigation
- image zoom, fit-to-view, fullscreen, and original-file access
- keyboard navigation and mobile swipe
- automatic catalog generation from each topic's `metadata.json`

## Structure

```text
guides/<category>/<YYYY-MM-topic-slug>/
├─ README.md
├─ SOURCES.md
├─ metadata.json
└─ images/
   ├─ 01-*.png
   ├─ 02-*.png
   └─ ...
```

The viewer source lives in `site/`. `scripts/build_site.py` validates guide metadata, builds `catalog.json`, copies the public guide files into `_site/`, and the Pages workflow deploys that artifact.

## Categories

- `ai/` — AI models, workflows, agents, evaluation, research
- `development/` — software engineering, tooling, architecture
- `games/` — game systems, design, engines, pipelines
- `research/` — general research explainers and evidence summaries
- `other/` — material that does not yet justify a dedicated category

## Catalog

| Date | Category | Topic | Assets |
|---|---|---|---:|
| 2026-09-28 | AI | [Why AI evaluations diverge](guides/ai/2026-09-ai-evaluation-gap/) | 4 |

## Maintenance rule

When adding images, reuse an existing topic folder if the subject clearly matches. Otherwise create a new `YYYY-MM-topic-slug` folder. Use ordered, descriptive ASCII filenames and update the topic README, metadata, sources when applicable, and this catalog in the same commit.

Do not hand-edit a deployed `catalog.json`; it is generated from topic metadata during the Pages build.
