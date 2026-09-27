#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "site"
GUIDES_DIR = ROOT / "guides"
REPO_URL = "https://github.com/Legerdo/visual-guides"


class BuildError(RuntimeError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise BuildError(f"Failed to read {path.relative_to(ROOT)}: {exc}") from exc
    if not isinstance(value, dict):
        raise BuildError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def require_text(metadata: dict[str, Any], key: str, metadata_path: Path) -> str:
    value = metadata.get(key)
    if not isinstance(value, str) or not value.strip():
        raise BuildError(f"{metadata_path.relative_to(ROOT)}: '{key}' must be a non-empty string")
    return value.strip()


def validate_repo_relative_path(raw: str, metadata_path: Path) -> Path:
    candidate = (ROOT / raw).resolve()
    root = ROOT.resolve()
    if candidate != root and root not in candidate.parents:
        raise BuildError(f"{metadata_path.relative_to(ROOT)}: path escapes repository: {raw}")
    return candidate


def collect_guides() -> list[dict[str, Any]]:
    if not GUIDES_DIR.exists():
        return []

    guides: list[dict[str, Any]] = []
    seen_slugs: set[str] = set()
    metadata_files = sorted(GUIDES_DIR.glob("*/*/metadata.json"))

    for metadata_path in metadata_files:
        metadata = load_json(metadata_path)
        slug = require_text(metadata, "slug", metadata_path)
        title = require_text(metadata, "title", metadata_path)
        category = require_text(metadata, "category", metadata_path)
        created = require_text(metadata, "created", metadata_path)
        language = require_text(metadata, "language", metadata_path)

        if slug in seen_slugs:
            raise BuildError(f"Duplicate guide slug: {slug}")
        seen_slugs.add(slug)

        assets = metadata.get("assets")
        if not isinstance(assets, list) or not assets:
            raise BuildError(f"{metadata_path.relative_to(ROOT)}: 'assets' must be a non-empty array")

        page_metadata: dict[str, dict[str, Any]] = {}
        pages = metadata.get("pages", [])
        if pages is not None and not isinstance(pages, list):
            raise BuildError(f"{metadata_path.relative_to(ROOT)}: 'pages' must be an array")
        for page in pages or []:
            if not isinstance(page, dict):
                raise BuildError(f"{metadata_path.relative_to(ROOT)}: every page must be an object")
            page_path = page.get("path")
            if isinstance(page_path, str) and page_path:
                page_metadata[page_path] = page

        normalized_assets: list[dict[str, Any]] = []
        for index, asset in enumerate(assets, start=1):
            if not isinstance(asset, dict):
                raise BuildError(f"{metadata_path.relative_to(ROOT)}: asset #{index} must be an object")
            raw_path = asset.get("path")
            if not isinstance(raw_path, str) or not raw_path:
                raise BuildError(f"{metadata_path.relative_to(ROOT)}: asset #{index} is missing 'path'")

            file_path = validate_repo_relative_path(raw_path, metadata_path)
            if not file_path.is_file():
                raise BuildError(f"{metadata_path.relative_to(ROOT)}: missing asset: {raw_path}")
            if file_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
                raise BuildError(f"{metadata_path.relative_to(ROOT)}: unsupported image asset: {raw_path}")

            extra = page_metadata.get(raw_path, {})
            normalized_assets.append(
                {
                    "path": raw_path.replace("\\", "/"),
                    "title": str(extra.get("title") or f"Page {index}"),
                    "description": str(extra.get("description") or ""),
                    "width": asset.get("width"),
                    "height": asset.get("height"),
                    "bytes": asset.get("bytes"),
                    "mime": asset.get("mime"),
                }
            )

        topic_dir = metadata_path.parent
        topic_rel = topic_dir.relative_to(ROOT).as_posix()
        sources_path = topic_dir / "SOURCES.md"
        tags = metadata.get("tags", [])
        if tags is None:
            tags = []
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            raise BuildError(f"{metadata_path.relative_to(ROOT)}: 'tags' must be an array of strings")

        guide = {
            "slug": slug,
            "title": title,
            "summary": str(metadata.get("summary") or ""),
            "category": category,
            "created": created,
            "language": language,
            "status": str(metadata.get("status") or ""),
            "tags": tags,
            "path": topic_rel,
            "cover": normalized_assets[0]["path"],
            "assets": normalized_assets,
            "source_url": f"{REPO_URL}/tree/main/{topic_rel}",
            "sources_url": f"{REPO_URL}/blob/main/{topic_rel}/SOURCES.md" if sources_path.is_file() else None,
        }
        guides.append(guide)

    guides.sort(key=lambda item: (item["created"], item["title"]), reverse=True)
    return guides


def copy_tree_contents(source: Path, destination: Path) -> None:
    if not source.is_dir():
        raise BuildError(f"Missing directory: {source.relative_to(ROOT)}")
    destination.mkdir(parents=True, exist_ok=True)
    for child in source.iterdir():
        target = destination / child.name
        if child.is_dir():
            shutil.copytree(child, target, dirs_exist_ok=True)
        else:
            shutil.copy2(child, target)


def build(output_dir: Path) -> dict[str, Any]:
    guides = collect_guides()
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    copy_tree_contents(SITE_DIR, output_dir)
    if GUIDES_DIR.exists():
        shutil.copytree(GUIDES_DIR, output_dir / "guides", dirs_exist_ok=True)

    catalog = {
        "generated_from": "guides/*/*/metadata.json",
        "guide_count": len(guides),
        "page_count": sum(len(guide["assets"]) for guide in guides),
        "categories": sorted({guide["category"] for guide in guides}),
        "guides": guides,
    }
    with (output_dir / "catalog.json").open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    index_path = output_dir / "index.html"
    if not index_path.is_file():
        raise BuildError("site/index.html was not copied to the output directory")
    shutil.copy2(index_path, output_dir / "404.html")
    (output_dir / ".nojekyll").write_text("", encoding="utf-8")
    return catalog


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the static Visual Guides GitHub Pages site")
    parser.add_argument(
        "--output",
        default=str(ROOT / "_site"),
        help="Output directory (default: repository _site directory)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output).resolve()
    try:
        catalog = build(output_dir)
    except BuildError as exc:
        print(f"build error: {exc}", file=sys.stderr)
        return 1

    print(
        f"Built {catalog['guide_count']} guide(s), "
        f"{catalog['page_count']} page(s) -> {output_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
