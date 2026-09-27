# Visual Guides

A public, topic-organized archive for visual guides, explainers, infographics, and reference images.

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
