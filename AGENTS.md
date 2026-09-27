# Repository instructions

This repository is a public visual-reference archive, not a generic dump folder.

When adding new images:

1. Classify the material into the narrowest sensible category under `guides/`.
2. Reuse an existing topic folder when the new asset belongs to the same guide or subject.
3. Otherwise create `guides/<category>/<YYYY-MM-topic-slug>/`.
4. Name ordered guide pages `01-...`, `02-...`, etc. Use lowercase ASCII kebab-case for filenames.
5. Keep the original image binary; do not recompress or resize unless explicitly requested.
6. Update the topic `README.md`, `metadata.json`, and `SOURCES.md` when factual claims or external sources are involved.
7. Update the root `README.md` catalog in the same commit.
8. Never publish secrets, private screenshots, personal identifiers, access tokens, or private-project material without explicit instruction.
9. Prefer one coherent commit per upload/update request.
10. If replacing an existing image, preserve its stable path unless there is a strong reason to version it separately.
11. The GitHub Pages viewer is generated from topic `metadata.json`; keep `summary`, `tags`, and page-level title/description metadata useful for browsing.
12. Do not manually create or commit a generated `catalog.json` or `_site/` output.
13. When viewer code, guide metadata, or asset paths change, run `python scripts/build_site.py` and validate the generated catalog before committing.
14. Keep the viewer dependency-free unless a concrete requirement justifies adding a build framework or package manager.
