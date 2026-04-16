from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "model"
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"

REPORT_JSON = REPORTS_DIR / "core_system_reconciliation.json"
REPORT_MD = DOCS_DIR / "core_system_reconciliation.md"

AUTHORITATIVE_CATALOG = MODEL_DIR / "catalogs" / "equations_catalog.yaml"
LEGACY_CATALOG = MODEL_DIR / "catalogs" / "equations_catalog_kk.yaml"
LEGACY_VARIABLES = MODEL_DIR / "endogenous_variables.yaml"
THEORY_VARIABLES = MODEL_DIR / "endogenous_variables_theory.yaml"
STEADY_STATE_ALLOWLIST = MODEL_DIR / "steady_state_allowlist.yaml"
SPEC_PATH = MODEL_DIR / "spec.yaml"
LINEAR_REPORT_PATH = DOCS_DIR / "linear_system_report.json"


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def _parse_catalog(path: Path) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        id_match = re.match(r"^\s*- id: (.+)$", line)
        if id_match:
            current = {"id": id_match.group(1).strip()}
            entries.append(current)
            continue
        if current is None:
            continue
        section_match = re.match(r"^\s+section: (.+)$", line)
        if section_match:
            current["section"] = section_match.group(1).strip()
            continue
        kind_match = re.match(r"^\s+(?:kind|category): (.+)$", line)
        if kind_match:
            current["kind"] = kind_match.group(1).strip()
            continue
    return entries


def _parse_variable_list(path: Path) -> list[str]:
    variables: list[str] = []
    in_variables = False

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if stripped == "variables:":
            in_variables = True
            continue
        if not in_variables:
            continue
        match = re.match(r"^\s*-\s+(.+)$", raw_line)
        if match:
            variables.append(match.group(1).strip())
            continue
        if stripped and not raw_line.startswith(" "):
            break
    return variables


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
        for key in ("name", "source", "notes", "raw"):
            field_match = re.match(rf"^\s+{key}: ?(.+)$", raw_line)
            if field_match:
                current[key] = field_match.group(1).strip().strip('"')
                break
    return items


def _parse_allowlist_status() -> dict[str, Any]:
    text = STEADY_STATE_ALLOWLIST.read_text(encoding="utf-8")
    exempted = bool(re.search(r"^\s*-\s+resource_wedge\s*$", text, re.M))
    notes_match = re.search(r'^\s*resource_wedge:\s+"(.+)"\s*$', text, re.M)
    return {
        "allowlist_path": str(STEADY_STATE_ALLOWLIST.relative_to(ROOT)),
        "exempted": exempted,
        "note": notes_match.group(1) if notes_match else None,
        "required_resolution": [
            "eliminate via corrected goods-market or aggregation accounting",
            "or document as a deliberate aggregation residual",
        ],
    }


def build_report() -> dict[str, Any]:
    authoritative_entries = _parse_catalog(AUTHORITATIVE_CATALOG)
    legacy_entries = _parse_catalog(LEGACY_CATALOG)
    theory_variables = _parse_variable_list(THEORY_VARIABLES)
    legacy_variables = _parse_variable_list(LEGACY_VARIABLES)
    linear_report = _load_json(LINEAR_REPORT_PATH)

    authoritative_section_counts = Counter(entry.get("section", "unknown") for entry in authoritative_entries)
    authoritative_kind_counts = Counter(entry.get("kind", "unknown") for entry in authoritative_entries)
    legacy_section_counts = Counter(entry.get("section", "unknown") for entry in legacy_entries)
    legacy_kind_counts = Counter(entry.get("kind", "unknown") for entry in legacy_entries)

    theory_set = set(theory_variables)
    legacy_set = set(legacy_variables)
    only_legacy = sorted(legacy_set - theory_set)
    only_theory = sorted(theory_set - legacy_set)

    freeze_equations = _parse_spec_section("foreign_freeze_equations")
    close_equations = _parse_spec_section("closure_equations")

    discrepancy = {
        "historical_linear_system_report": {
            "path": str(LINEAR_REPORT_PATH.relative_to(ROOT)),
            "equation_count": linear_report.get("equation_count") if linear_report else None,
            "variable_count": linear_report.get("variable_count") if linear_report else None,
            "selection_note": linear_report.get("selection_note") if linear_report else None,
            "allowlist_note": linear_report.get("endogenous_allowlist") if linear_report else None,
            "used_section": linear_report.get("used_section") if linear_report else None,
        },
        "legacy_variable_list": {
            "path": str(LEGACY_VARIABLES.relative_to(ROOT)),
            "count": len(legacy_variables),
            "source_note": "legacy QR-pivot snapshot; not theory-authoritative",
        },
        "theory_variable_list": {
            "path": str(THEORY_VARIABLES.relative_to(ROOT)),
            "count": len(theory_variables),
            "source_note": "current theory-driven allowlist preferred by build_linear_system.py",
        },
        "delta": {
            "only_in_legacy_variable_list": only_legacy,
            "only_in_theory_variable_list": only_theory,
        },
        "explanation": (
            "The 116-variable historical core comes from the older QR-pivot allowlist and a reduced "
            "Phase 1 linearization report. The 167-variable theory list is the newer theory-driven "
            "allowlist consumed by build_linear_system.py. These represent different system definitions, "
            "not a single consistent core."
        ),
    }

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "authoritative_catalog": {
            "path": str(AUTHORITATIVE_CATALOG.relative_to(ROOT)),
            "status": "canonical",
            "entry_count": len(authoritative_entries),
            "section_counts": dict(sorted(authoritative_section_counts.items())),
            "kind_counts": dict(sorted(authoritative_kind_counts.items())),
            "reason": (
                "This catalog is already consumed by build_linear_system.py and tools/lead_term_coverage_report.py "
                "and contains the current closure, freeze, and measurement section structure."
            ),
        },
        "legacy_catalog": {
            "path": str(LEGACY_CATALOG.relative_to(ROOT)),
            "status": "legacy_reference_only",
            "entry_count": len(legacy_entries),
            "section_counts": dict(sorted(legacy_section_counts.items())),
            "kind_counts": dict(sorted(legacy_kind_counts.items())),
            "reason": (
                "This catalog is a narrower scratch/reference catalog using an older schema and should not "
                "compete with the canonical catalog during recovery work."
            ),
        },
        "system_size_reconciliation": discrepancy,
        "staging_sections": {
            "recommended_order": [
                "appendix_c_normalized_model",
                "fiscal_rule_equations",
                "closure_equations",
                "foreign_freeze_equations",
                "shock_processes",
            ],
            "authoritative_section_counts": {
                key: authoritative_section_counts[key]
                for key in (
                    "appendix_c_normalized_model",
                    "fiscal_rule_equations",
                    "closure_equations",
                    "foreign_freeze_equations",
                    "shock_processes",
                )
                if key in authoritative_section_counts
            },
        },
        "closure_inventory": {
            "freeze_equations": freeze_equations,
            "close_equations": close_equations,
            "note": (
                "These equations should be treated as the primary over-determination suspects in staged "
                "Phase 3 solving because they pin foreign or residual processes by construction."
            ),
        },
        "resource_wedge_status": _parse_allowlist_status(),
    }


def _write_markdown(report: dict[str, Any]) -> None:
    system = report["system_size_reconciliation"]
    legacy_catalog = report["legacy_catalog"]
    authoritative = report["authoritative_catalog"]
    closure = report["closure_inventory"]
    resource = report["resource_wedge_status"]

    lines = [
        "# Core System Reconciliation",
        "",
        f"- Generated: `{report['generated_at_utc']}`",
        "",
        "## Catalog Authority",
        "",
        f"- Canonical catalog: `{authoritative['path']}`",
        f"- Canonical entry count: `{authoritative['entry_count']}`",
        f"- Legacy catalog: `{legacy_catalog['path']}`",
        f"- Legacy entry count: `{legacy_catalog['entry_count']}`",
        f"- Decision: `{authoritative['path']}` is authoritative for recovery work.",
        "",
        "## 116 vs 167 Core Drift",
        "",
        f"- Historical linear-system report: `{system['historical_linear_system_report']['variable_count']}` variables / "
        f"`{system['historical_linear_system_report']['equation_count']}` equations",
        f"- Historical selection note: `{system['historical_linear_system_report']['selection_note']}`",
        f"- Legacy QR variable list: `{system['legacy_variable_list']['count']}` variables",
        f"- Theory variable list: `{system['theory_variable_list']['count']}` variables",
        f"- Variables only in legacy list: `{len(system['delta']['only_in_legacy_variable_list'])}`",
        f"- Variables only in theory list: `{len(system['delta']['only_in_theory_variable_list'])}`",
        "",
        system["explanation"],
        "",
        "## Freeze / Close Inventory",
        "",
        f"- `freeze_*` equations: `{len(closure['freeze_equations'])}`",
        f"- `close_*` equations: `{len(closure['close_equations'])}`",
    ]

    for item in closure["freeze_equations"] + closure["close_equations"]:
        lines.append(
            f"- `{item['id']}`: {item.get('source', 'unknown source')} "
            f"({item.get('notes', 'no notes')})"
        )

    lines.extend(
        [
            "",
            "## Resource Wedge",
            "",
            f"- Allowlist path: `{resource['allowlist_path']}`",
            f"- Exempted: `{resource['exempted']}`",
            f"- Current note: `{resource['note']}`",
            "- Resolution target: eliminate it through corrected accounting or document it explicitly as a deliberate aggregation residual.",
        ]
    )
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    report = build_report()
    REPORT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _write_markdown(report)

    print(f"Wrote core reconciliation report: {REPORT_JSON.relative_to(ROOT)}")
    print(f"Wrote core reconciliation report: {REPORT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
