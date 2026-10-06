# Visual Guides

A public, topic-organized archive for visual guides, explainers, infographics, and reference images.

## Viewer

**https://legerdo.github.io/visual-guides/**

The GitHub Pages viewer provides:

- topic/category cards and search
- a viewport-sized reader that fits the entire image without page scrolling
- previous/next buttons, arrow-key navigation, and mobile swipe
- on-demand page thumbnails and guide details
- separate screen-fit and width-fit modes, image zoom, drag-to-pan, and fullscreen
- original-file access from the guide details
- automatic catalog generation from each topic's `metadata.json`

Open any guide to read one complete image at a time. The reader uses the available
width **and height**, including after resizing, rotating a phone, or entering
fullscreen. Each new page starts in screen-fit mode. Choose **너비 맞춤** or zoom in
when you want to read small text more closely; only the enlarged image area scrolls.

| Control | Action |
|---|---|
| Previous/next buttons | Turn pages at any zoom level |
| `←` / `→`, horizontal swipe | Turn pages while the complete image fits |
| `+` / `−` | Zoom in/out |
| `0` / **화면 맞춤** | Show the complete image |
| `W` / **너비 맞춤** | Fit the image to the available width |
| Double-click | Enlarge the image / return to screen fit |
| Drag or arrow keys while enlarged | Pan within the image |
| `Page Up` / `Page Down`, `Home` / `End` | Previous/next page, first/last page |
| **페이지**, **설명** | Open thumbnails or guide details without leaving the reader |
| `F` | Enter/exit fullscreen where supported |
| `Esc` | Close the current dialog, exit fullscreen, or return to the guide list |

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
| 2026-09-28 | AI | [설명할 수 없는 실패의 일상화](guides/ai/2026-09-inexplicable-ai-failures/) | 1 |
| 2026-09-28 | AI | [Why AI evaluations diverge](guides/ai/2026-09-ai-evaluation-gap/) | 4 |

## Maintenance rule

When adding images, reuse an existing topic folder if the subject clearly matches. Otherwise create a new `YYYY-MM-topic-slug` folder. Use ordered, descriptive ASCII filenames and update the topic README, metadata, sources when applicable, and this catalog in the same commit.

Do not hand-edit a deployed `catalog.json`; it is generated from topic metadata during the Pages build.

## Reader regression checks

`scripts/test_viewer.cjs` uses Playwright to check the actual guide images at desktop,
phone, and landscape sizes. It verifies viewport and image bounds, page navigation,
zoom/pan, native touch swipes, dialogs, fullscreen, and history. It starts a temporary
server on `127.0.0.1`, closes it after the run, and writes screenshots plus a JSON
report to a temporary directory printed in the output.

Example with installed Microsoft Edge on Windows (PowerShell):

```powershell
python scripts/build_site.py
npm install --prefix "$env:TEMP\visual-guides-test-tools" --no-save playwright
$env:PLAYWRIGHT_MODULE = "$env:TEMP\visual-guides-test-tools\node_modules\playwright"
$env:QA_BROWSER_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node scripts/test_viewer.cjs
```

An existing Playwright installation can also be used. Set `QA_BASE_URL` to test an
already running preview, `QA_SITE_DIR` to serve a different build directory, or
`QA_OUTPUT_DIR` to keep the report in a chosen location. Playwright is used for
development checks; the deployed viewer loads only the files in `site/`.
