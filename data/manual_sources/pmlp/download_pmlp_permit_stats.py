#!/usr/bin/env python3
"""Download PMLP residence-permit statistics pages and attachments for 2020-2025."""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
USER_AGENT = "Mozilla/5.0"
YEARS = [2020, 2021, 2022, 2023, 2024, 2025]
PAGE_URLS = {
    year: f"https://www.pmlp.gov.lv/lv/statistika-uzturesanas-atlaujas-{year}-gads"
    for year in YEARS
}


def slugify(value: str) -> str:
    value = value.lower().strip()
    replacements = {
        "ā": "a",
        "č": "c",
        "ē": "e",
        "ģ": "g",
        "ī": "i",
        "ķ": "k",
        "ļ": "l",
        "ņ": "n",
        "š": "s",
        "ū": "u",
        "ž": "z",
        ".": "",
        ",": "",
        ":": "",
        ";": "",
        "(": "",
        ")": "",
        "/": "-",
    }
    for src, dst in replacements.items():
        value = value.replace(src, dst)
    value = re.sub(r"\s+", "_", value)
    value = re.sub(r"[^a-z0-9_-]", "", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value


def wget_fetch(url: str, timeout: int = 60) -> bytes:
    result = subprocess.run(
        [
            "wget",
            "-qO-",
            f"--user-agent={USER_AGENT}",
            f"--timeout={timeout}",
            "--tries=1",
            url,
        ],
        check=True,
        capture_output=True,
    )
    return result.stdout


def wget_download(url: str, destination: Path, timeout: int = 120) -> None:
    subprocess.run(
        [
            "wget",
            "-q",
            f"--user-agent={USER_AGENT}",
            f"--timeout={timeout}",
            "--tries=1",
            "-O",
            str(destination),
            url,
        ],
        check=True,
        capture_output=True,
    )


def extract_page_meta(html_text: str) -> dict[str, Any]:
    published_match = re.search(r"Publicēts:\s*([0-9.]+)", html_text)
    updated_match = re.search(r"Atjaunināts:\s*([0-9.]+)", html_text)

    pattern = re.compile(
        r'<a href="([^"]+/media/\d+/download\?attachment)"[^>]*title="([^"]+)"[^>]*aria-label="[^"]* - ([^"]+)"',
        re.IGNORECASE,
    )

    links: list[dict[str, str]] = []
    for href, source_filename, label in pattern.findall(html_text):
        links.append(
            {
                "href": href,
                "title": html.unescape(label).strip(),
                "source_filename": html.unescape(source_filename).strip(),
            }
        )

    return {
        "published": published_match.group(1) if published_match else None,
        "updated": updated_match.group(1) if updated_match else None,
        "attachments": links,
    }


def guess_extension(source_filename: str) -> str:
    suffix = Path(source_filename).suffix.lower()
    return suffix if suffix else ".bin"


def download_year(year: int) -> dict[str, Any]:
    page_url = PAGE_URLS[year]
    year_dir = BASE_DIR / str(year)
    year_dir.mkdir(parents=True, exist_ok=True)

    page_html = wget_fetch(page_url, timeout=60).decode("utf-8", "ignore")
    (year_dir / "source_page.html").write_text(page_html, encoding="utf-8")

    meta = extract_page_meta(page_html)
    results: list[dict[str, Any]] = []

    for item in meta["attachments"]:
        href = urllib.parse.urljoin(page_url, item["href"])
        local_name = f"{slugify(item['title'])}{guess_extension(item['source_filename'])}"
        local_path = year_dir / local_name
        entry: dict[str, Any] = {
            "title": item["title"],
            "source_filename": item["source_filename"],
            "url": href,
            "local_path": str(local_path.relative_to(BASE_DIR)),
            "status": "pending",
            "error": None,
        }
        try:
            wget_download(href, local_path, timeout=120)
            entry["status"] = "downloaded"
        except Exception as exc:  # noqa: BLE001
            entry["status"] = "failed"
            entry["error"] = f"{type(exc).__name__}: {exc}"
        results.append(entry)

    return {
        "year": year,
        "page_url": page_url,
        "published": meta["published"],
        "updated": meta["updated"],
        "source_page": str((year_dir / "source_page.html").relative_to(BASE_DIR)),
        "attachments": results,
    }


def main() -> int:
    manifest: dict[str, Any] = {
        "source_name": "Pilsonības un migrācijas lietu pārvalde",
        "source_type": "manual_download",
        "description": "Residence permit statistics pages and attachments for 2020-2025.",
        "generated_at_unix": int(time.time()),
        "years": [],
    }

    for year in YEARS:
        print(f"Processing {year}...", file=sys.stderr)
        try:
            manifest["years"].append(download_year(year))
        except Exception as exc:  # noqa: BLE001
            manifest["years"].append(
                {
                    "year": year,
                    "page_url": PAGE_URLS[year],
                    "status": "failed",
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )

    manifest_path = BASE_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {manifest_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
