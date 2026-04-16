from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from importlib import import_module
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"
CATALOG_PATH = ROOT / "model" / "catalogs" / "equations_catalog.yaml"
SPEC_PATH = ROOT / "model" / "spec.yaml"

REPORT_JSON = REPORTS_DIR / "stage_isolation_report.json"
REPORT_MD = DOCS_DIR / "stage_isolation.md"


@dataclass(frozen=True)
class StageDef:
    slug: str
    title: str
    sections: tuple[str, ...]
    purpose: str
    suspect_equation_prefixes: tuple[str, ...] = ()


STAGES = [
    StageDef(
        slug="stage1_appendix_c_core",
        title="Stage 1: Appendix C Core",
        sections=("appendix_c_normalized_model",),
        purpose="Baseline normalized-model block without fiscal rules, closures, or shocks.",
    ),
    StageDef(
        slug="stage2_add_fiscal_rules",
        title="Stage 2: Add Fiscal Rules",
        sections=("appendix_c_normalized_model", "equations", "fiscal_rule_equations"),
        purpose="Add fiscal-rule and pricing equations (incl. R_g,t definition from 'equations' section).",
    ),
    StageDef(
        slug="stage3_add_closures",
        title="Stage 3: Add Closure Equations",
        sections=("appendix_c_normalized_model", "equations", "fiscal_rule_equations", "closure_equations"),
        purpose="Introduce closure equations and check whether over-determination starts here.",
        suspect_equation_prefixes=("close_",),
    ),
    StageDef(
        slug="stage4_add_foreign_freezes",
        title="Stage 4: Add Foreign Freezes",
        sections=(
            "appendix_c_normalized_model",
            "equations",
            "fiscal_rule_equations",
            "closure_equations",
            "foreign_freeze_equations",
        ),
        purpose="Add frozen foreign equations and measure the effect of `freeze_*` closures.",
        suspect_equation_prefixes=("close_", "freeze_"),
    ),
    StageDef(
        slug="stage5_add_shocks",
        title="Stage 5: Add Shock Processes",
        sections=(
            "appendix_c_normalized_model",
            "equations",
            "fiscal_rule_equations",
            "closure_equations",
            "foreign_freeze_equations",
            "shock_processes",
        ),
        purpose="Full current staged core with shock processes added last.",
        suspect_equation_prefixes=("close_", "freeze_"),
    ),
]


def _parse_catalog() -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for raw_line in CATALOG_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        id_match = re.match(r"^- id: (.+)$", line)
        if id_match:
            current = {"id": id_match.group(1).strip()}
            entries.append(current)
            continue
        if current is None:
            continue
        section_match = re.match(r"^  section: (.+)$", line)
        if section_match:
            current["section"] = section_match.group(1).strip()
            continue
        kind_match = re.match(r"^  kind: (.+)$", line)
        if kind_match:
            current["kind"] = kind_match.group(1).strip()
            continue
    return entries


def _parse_spec_section(section_name: str) -> list[str]:
    text = SPEC_PATH.read_text(encoding="utf-8")
    match = re.search(rf"^{section_name}:\n(.*?)(?=^\S|\Z)", text, re.S | re.M)
    if not match:
        return []
    return re.findall(r"^\s+- id: (.+)$", match.group(1), re.M)


def _dependency_health() -> dict[str, str]:
    required = ("numpy", "scipy", "yaml")
    health: dict[str, str] = {}
    for module_name in required:
        try:
            import_module(module_name)
            health[module_name] = "installed"
        except Exception as exc:  # pragma: no cover - defensive
            health[module_name] = f"missing ({type(exc).__name__}: {exc})"
    return health


def _run_stage(stage: StageDef) -> dict[str, Any]:
    report_path = REPORTS_DIR / f"{stage.slug}_linear_system_report.json"
    gate_report_path = REPORTS_DIR / f"{stage.slug}_catalog_gate.json"
    env = dict(os.environ)
    src_path = str(ROOT / "src")
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = src_path if not existing_pythonpath else f"{src_path}:{existing_pythonpath}"

    command = [
        sys.executable,
        str(ROOT / "scripts" / "build_linear_system.py"),
        "--sections",
        ",".join(stage.sections),
        "--report-path",
        str(report_path),
        "--gate-report-path",
        str(gate_report_path),
        "--no-save-system",
    ]
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env=env,
    )

    report_data: dict[str, Any] | None = None
    if report_path.exists():
        try:
            report_data = json.loads(report_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            report_data = None

    gate_data: dict[str, Any] | None = None
    if gate_report_path.exists():
        try:
            gate_data = json.loads(gate_report_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            gate_data = None

    return {
        "slug": stage.slug,
        "title": stage.title,
        "sections": list(stage.sections),
        "purpose": stage.purpose,
        "ok": completed.returncode == 0,
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "report_path": str(report_path.relative_to(ROOT)),
        "gate_report_path": str(gate_report_path.relative_to(ROOT)),
        "report": report_data,
        "gate_report": gate_data,
    }


def _first_failure(stages: list[dict[str, Any]]) -> dict[str, Any] | None:
    for stage in stages:
        if not stage["ok"]:
            return {
                "slug": stage["slug"],
                "title": stage["title"],
                "sections": stage["sections"],
                "returncode": stage["returncode"],
                "stderr": stage["stderr"],
            }
    return None


def _write_markdown(report: dict[str, Any]) -> None:
    lines = [
        "# Stage Isolation Report",
        "",
        f"- Generated: `{report['generated_at_utc']}`",
        "",
        "## Dependency Health",
        "",
    ]
    for module_name, status in report["dependency_health"].items():
        lines.append(f"- `{module_name}`: {status}")

    first_failure = report.get("first_failure")
    if first_failure:
        lines.extend(
            [
                "",
                "## First Failing Stage",
                "",
                f"- `{first_failure['title']}`",
                f"- Sections: `{', '.join(first_failure['sections'])}`",
                f"- Return code: `{first_failure['returncode']}`",
            ]
        )
        if first_failure.get("stderr"):
            lines.append(f"- Error: `{first_failure['stderr']}`")

    lines.extend(["", "## Stages", ""])
    for stage in report["stages"]:
        lines.append(
            f"- `{stage['title']}`: {'ok' if stage['ok'] else 'failed'} "
            f"with sections `{', '.join(stage['sections'])}`"
        )
        lines.append(f"  purpose: {stage['purpose']}")
        lines.append(f"  report: `{stage['report_path']}`")
        gate = stage.get("gate_report") or {}
        if gate:
            lines.append(
                f"  gate counts: eqs=`{gate.get('equation_count')}` vars=`{gate.get('variable_count')}` "
                f"shocks=`{gate.get('shock_count')}`"
            )
        if stage.get("suspect_equations"):
            lines.append(f"  suspect equations: `{', '.join(stage['suspect_equations'])}`")
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    catalog_entries = _parse_catalog()
    freeze_inventory = _parse_spec_section("foreign_freeze_equations")
    close_inventory = _parse_spec_section("closure_equations")
    stage_reports: list[dict[str, Any]] = []

    for stage in STAGES:
        stage_catalog_entries = [
            entry
            for entry in catalog_entries
            if entry.get("kind") in {"core_dynamic", "closure_or_regime"}
            and entry.get("section") in stage.sections
        ]
        suspect_equations = [
            entry["id"]
            for entry in stage_catalog_entries
            if any(entry["id"].startswith(prefix) for prefix in stage.suspect_equation_prefixes)
        ]
        stage_result = _run_stage(stage)
        stage_result.update(
            {
                "catalog_equation_count": len(stage_catalog_entries),
                "catalog_equation_ids": [entry["id"] for entry in stage_catalog_entries],
                "suspect_equations": suspect_equations,
                "freeze_inventory": freeze_inventory,
                "close_inventory": close_inventory,
            }
        )
        stage_reports.append(stage_result)

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "dependency_health": _dependency_health(),
        "stages": stage_reports,
        "first_failure": _first_failure(stage_reports),
    }

    REPORT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
    _write_markdown(report)
    print(f"Wrote stage isolation report: {REPORT_JSON.relative_to(ROOT)}")
    print(f"Wrote stage isolation report: {REPORT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
