from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"
SPEC_PATH = ROOT / "model" / "spec.yaml"
STAGE_REPORT_PATH = REPORTS_DIR / "stage_isolation_report.json"

REPORT_JSON = REPORTS_DIR / "stage4_foreign_freeze_analysis.json"
REPORT_MD = DOCS_DIR / "stage4_foreign_freezes.md"

STAGE3_SLUG = "stage3_add_closures"
STAGE4_SLUG = "stage4_add_foreign_freezes"


def _load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return data


def _parse_spec_section(section_name: str) -> list[dict[str, str]]:
    text = SPEC_PATH.read_text(encoding="utf-8")
    match = re.search(rf"^{section_name}:\n(.*?)(?=^\S|\Z)", text, re.S | re.M)
    if not match:
        return []

    items: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for raw_line in match.group(1).splitlines():
        id_match = re.match(r"^\s+- id: (.+)$", raw_line)
        if id_match:
            current = {"id": id_match.group(1).strip()}
            items.append(current)
            continue
        if current is None:
            continue
        for key in ("name", "raw", "source", "notes"):
            field_match = re.match(rf"^\s+{key}: ?(.+)$", raw_line)
            if field_match:
                current[key] = field_match.group(1).strip().strip('"')
                break
    return items


def _lhs_symbol(raw_expr: str | None) -> str | None:
    if not raw_expr:
        return None
    if "=" not in raw_expr:
        return None
    lhs = raw_expr.split("=", 1)[0].strip()
    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)$", lhs)
    return match.group(1) if match else lhs


def build_report() -> dict[str, Any]:
    if not STAGE_REPORT_PATH.exists():
        raise FileNotFoundError(
            f"Missing stage isolation report: {STAGE_REPORT_PATH}. Run lv_fiscal_dsge.stage_isolation first."
        )

    stage_report = _load_json(STAGE_REPORT_PATH)
    stages = {stage["slug"]: stage for stage in stage_report.get("stages", []) if isinstance(stage, dict)}
    if STAGE3_SLUG not in stages or STAGE4_SLUG not in stages:
        raise RuntimeError("Stage isolation report is missing Stage 3 or Stage 4 entries.")

    stage3 = stages[STAGE3_SLUG]
    stage4 = stages[STAGE4_SLUG]
    freeze_entries = _parse_spec_section("foreign_freeze_equations")

    stage3_ids = set(stage3.get("catalog_equation_ids", []))
    stage4_ids = set(stage4.get("catalog_equation_ids", []))
    added_equations = sorted(stage4_ids - stage3_ids)

    freeze_details = []
    for entry in freeze_entries:
        if entry["id"] not in added_equations:
            continue
        freeze_details.append(
            {
                "id": entry["id"],
                "name": entry.get("name"),
                "raw": entry.get("raw"),
                "lhs_symbol": _lhs_symbol(entry.get("raw")),
                "source": entry.get("source"),
                "notes": entry.get("notes"),
            }
        )

    interpretation = {
        "stage3_catalog_equation_count": stage3.get("catalog_equation_count"),
        "stage4_catalog_equation_count": stage4.get("catalog_equation_count"),
        "delta_equation_count": len(added_equations),
        "meaning": (
            "Stage 4 differs from Stage 3 only by the foreign freeze equations. "
            "If a configured environment reaches Stage 3 successfully and fails first at Stage 4, "
            "the freeze set is the immediate suspect set before broader foreign-block debugging."
        ),
    }

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "stage3": {
            "slug": stage3["slug"],
            "title": stage3["title"],
            "sections": stage3["sections"],
            "ok": stage3["ok"],
            "catalog_equation_count": stage3.get("catalog_equation_count"),
        },
        "stage4": {
            "slug": stage4["slug"],
            "title": stage4["title"],
            "sections": stage4["sections"],
            "ok": stage4["ok"],
            "catalog_equation_count": stage4.get("catalog_equation_count"),
        },
        "added_equation_ids": added_equations,
        "freeze_equations": freeze_details,
        "interpretation": interpretation,
    }


def _write_markdown(report: dict[str, Any]) -> None:
    lines = [
        "# Stage 4 Foreign Freeze Analysis",
        "",
        f"- Generated: `{report['generated_at_utc']}`",
        "",
        "## Stage 3 to Stage 4 Delta",
        "",
        f"- Stage 3 count: `{report['stage3']['catalog_equation_count']}` equations",
        f"- Stage 4 count: `{report['stage4']['catalog_equation_count']}` equations",
        f"- Delta: `{report['interpretation']['delta_equation_count']}` equations",
        "",
        report["interpretation"]["meaning"],
        "",
        "## Added Freeze Equations",
        "",
    ]

    for entry in report["freeze_equations"]:
        lines.append(f"- `{entry['id']}`: `{entry['raw']}`")
        lines.append(f"  pins: `{entry['lhs_symbol']}`")
        if entry.get("notes"):
            lines.append(f"  notes: {entry['notes']}")

    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    report = build_report()
    REPORT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _write_markdown(report)
    print(f"Wrote Stage 4 foreign freeze analysis: {REPORT_JSON.relative_to(ROOT)}")
    print(f"Wrote Stage 4 foreign freeze analysis: {REPORT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
