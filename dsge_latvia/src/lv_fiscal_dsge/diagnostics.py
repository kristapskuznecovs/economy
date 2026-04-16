from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from importlib import import_module
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"
MODEL_DIR = ROOT / "model"

SUMMARY_JSON = DOCS_DIR / "diagnostics_summary.json"
SUMMARY_MD = DOCS_DIR / "diagnostics_summary.md"

DEPENDENCY_IMPORTS = {
    "numpy": "numpy",
    "scipy": "scipy",
    "pandas": "pandas",
    "pyyaml": "yaml",
    "sympy": "sympy",
}


@dataclass
class StepResult:
    name: str
    command: list[str]
    ok: bool
    returncode: int | None
    stdout: str
    stderr: str
    artifact_paths: list[str]


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def _theory_variable_count(path: Path) -> int | None:
    if not path.exists():
        return None

    count = 0
    in_variables = False
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped == "variables:":
            in_variables = True
            continue
        if not in_variables:
            continue
        if raw_line.startswith("- ") or raw_line.startswith("  - "):
            count += 1
            continue
        if not raw_line.startswith(" ") and ":" in stripped:
            break
    return count


def _check_dependency_health() -> dict[str, dict[str, str]]:
    health: dict[str, dict[str, str]] = {}
    for label, module_name in DEPENDENCY_IMPORTS.items():
        try:
            module = import_module(module_name)
            location = getattr(module, "__file__", "<built-in>")
            health[label] = {"status": "installed", "module": module_name, "location": str(location)}
        except Exception as exc:  # pragma: no cover - defensive
            health[label] = {
                "status": "missing",
                "module": module_name,
                "error": f"{type(exc).__name__}: {exc}",
            }
    return health


def _check_bootstrap_health() -> dict[str, str]:
    package = import_module("lv_fiscal_dsge")
    location = getattr(package, "__file__", "")
    return {
        "status": "ok",
        "package": "lv_fiscal_dsge",
        "python_executable": sys.executable,
        "package_location": str(location),
        "root": str(ROOT),
    }


def _run_step(name: str, command: list[str], *, artifact_paths: list[Path]) -> StepResult:
    env = dict(os.environ)
    src_path = str(ROOT / "src")
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = src_path if not existing_pythonpath else f"{src_path}:{existing_pythonpath}"
    completed = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        env=env,
    )
    return StepResult(
        name=name,
        command=command,
        ok=completed.returncode == 0,
        returncode=completed.returncode,
        stdout=completed.stdout.strip(),
        stderr=completed.stderr.strip(),
        artifact_paths=[str(path.relative_to(ROOT)) for path in artifact_paths],
    )


def _pre_run_snapshot() -> dict[str, Any]:
    linear_report = _load_json(DOCS_DIR / "linear_system_report.json")
    determinacy_report = _load_json(DOCS_DIR / "determinacy_report.json")
    theory_count = _theory_variable_count(MODEL_DIR / "endogenous_variables_theory.yaml")

    discrepancy: dict[str, Any] = {
        "exists": False,
        "saved_linear_system": None,
        "theory_variable_count": theory_count,
        "sources": {
            "saved_linear_system": "docs/linear_system_report.json",
            "theory_variables": "model/endogenous_variables_theory.yaml",
        },
    }

    if linear_report and theory_count is not None:
        saved_variables = linear_report.get("variable_count")
        saved_equations = linear_report.get("equation_count")
        discrepancy["saved_linear_system"] = {
            "equation_count": saved_equations,
            "variable_count": saved_variables,
        }
        discrepancy["exists"] = saved_variables != theory_count

    return {
        "saved_linear_system_report": linear_report,
        "saved_determinacy_report": determinacy_report,
        "theory_variable_count": theory_count,
        "core_size_discrepancy": discrepancy,
    }


def _post_run_snapshot() -> dict[str, Any]:
    catalog_gate = _load_json(REPORTS_DIR / "catalog_gate.json")
    linear_report = _load_json(DOCS_DIR / "linear_system_report.json")
    determinacy_report = _load_json(DOCS_DIR / "determinacy_report.json")
    steady_state_report = _load_json(DOCS_DIR / "steady_state_report.json")

    return {
        "catalog_gate": catalog_gate,
        "linear_system_report": linear_report,
        "steady_state_report": steady_state_report,
        "determinacy_report": determinacy_report,
    }


def _write_markdown(summary: dict[str, Any]) -> None:
    lines = [
        "# DSGE Diagnostics Summary",
        "",
        f"- Generated: `{summary['generated_at_utc']}`",
        f"- Root: `{summary['root']}`",
        "",
        "## Environment",
        "",
        f"- Bootstrap status: `{summary['bootstrap']['status']}`",
        f"- Python: `{summary['bootstrap']['python_executable']}`",
        f"- Package location: `{summary['bootstrap']['package_location']}`",
        "",
        "## Dependencies",
        "",
    ]

    for label, status in summary["dependency_health"].items():
        if status["status"] == "installed":
            lines.append(f"- `{label}`: installed")
        else:
            lines.append(f"- `{label}`: missing ({status['error']})")

    lines.extend(
        [
            "",
            "## Commands",
            "",
        ]
    )
    for step in summary["steps"]:
        lines.append(
            f"- `{step['name']}`: {'ok' if step['ok'] else 'failed'} "
            f"(returncode `{step['returncode']}`)"
        )

    discrepancy = summary["pre_run"]["core_size_discrepancy"]
    lines.extend(
        [
            "",
            "## Core Size Snapshot",
            "",
            f"- Saved linear-system report source: `{discrepancy['sources']['saved_linear_system']}`",
            f"- Theory variable source: `{discrepancy['sources']['theory_variables']}`",
            f"- Theory variable count: `{discrepancy['theory_variable_count']}`",
        ]
    )
    saved = discrepancy.get("saved_linear_system")
    if saved is not None:
        lines.append(
            f"- Saved linear-system counts: `{saved['variable_count']}` variables / "
            f"`{saved['equation_count']}` equations"
        )
    lines.append(f"- Discrepancy observed: `{discrepancy['exists']}`")

    determinacy = summary["post_run"].get("determinacy_report") or {}
    if determinacy:
        eu = determinacy.get("eu", {})
        lines.extend(
            [
                "",
                "## Determinacy",
                "",
                f"- Stable roots: `{determinacy.get('stable_roots')}`",
                f"- Unstable roots: `{determinacy.get('unstable_roots')}`",
                f"- `eu`: `({eu.get('exist')}, {eu.get('unique')})`",
            ]
        )
        if determinacy.get("solve_error"):
            lines.append(f"- Solve error: `{determinacy['solve_error']}`")

    steady_state_report = summary["post_run"].get("steady_state_report") or {}
    financial_metrics = steady_state_report.get("financial_frictions_metrics") or {}
    net_worth_gap = financial_metrics.get("net_worth_ratio_gap")
    transfer_gap = financial_metrics.get("transfer_entrepreneurs_gap")
    if net_worth_gap is not None or transfer_gap is not None:
        lines.extend(
            [
                "",
                "## Financial Frictions Calibration",
                "",
                "- Source: `docs/steady_state_report.json`",
            ]
        )
        if net_worth_gap is not None:
            lines.append(
                "- Net worth ratio: implied "
                f"`{financial_metrics.get('net_worth_ratio'):.3f}` "
                f"vs target `{financial_metrics.get('net_worth_ratio_target'):.3f}` "
                f"(gap `{net_worth_gap:.3f}`)"
            )
        if transfer_gap is not None:
            lines.append(
                "- Entrepreneur transfers: implied "
                f"`{financial_metrics.get('transfer_entrepreneurs'):.3f}` "
                f"vs target `{financial_metrics.get('transfer_entrepreneurs_target'):.3f}` "
                f"(gap `{transfer_gap:.3f}`)"
            )
        lines.append(
            "- Note: these are large calibration mismatches. They do not block Phase 1, "
            "but they should stay on the Phase 3 suspect list when the financial-frictions block is reconciled."
        )

    lines.extend(
        [
            "",
            "## Artifacts",
            "",
            "- `docs/core_system_reconciliation.md`",
            "- `docs/reports/core_system_reconciliation.json`",
            "- `docs/stage_isolation.md`",
            "- `docs/reports/stage_isolation_report.json`",
            "- `docs/stage4_foreign_freezes.md`",
            "- `docs/reports/stage4_foreign_freeze_analysis.json`",
            "- `docs/steady_state_report.json`",
            "- `docs/replication_scoreboard.md`",
            "- `docs/reports/catalog_gate.json`",
            "- `docs/linear_system_report.json`",
            "- `docs/determinacy_report.json`",
        ]
    )
    SUMMARY_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    summary: dict[str, Any] = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "root": str(ROOT),
        "bootstrap": _check_bootstrap_health(),
        "dependency_health": _check_dependency_health(),
        "pre_run": _pre_run_snapshot(),
        "steps": [],
    }

    step_defs = [
        (
            "core_system_reconciliation",
            [sys.executable, "-m", "lv_fiscal_dsge.core_reconciliation"],
            [REPORTS_DIR / "core_system_reconciliation.json", DOCS_DIR / "core_system_reconciliation.md"],
        ),
        (
            "stage_isolation",
            [sys.executable, "-m", "lv_fiscal_dsge.stage_isolation"],
            [REPORTS_DIR / "stage_isolation_report.json", DOCS_DIR / "stage_isolation.md"],
        ),
        (
            "stage4_foreign_freeze_analysis",
            [sys.executable, "-m", "lv_fiscal_dsge.stage4_foreign_freeze_analysis"],
            [REPORTS_DIR / "stage4_foreign_freeze_analysis.json", DOCS_DIR / "stage4_foreign_freezes.md"],
        ),
        (
            "parameter_audit",
            [sys.executable, "-m", "lv_fiscal_dsge.parameter_audit"],
            [],
        ),
        (
            "steady_state_contract",
            [sys.executable, "-m", "lv_fiscal_dsge.steady_state_contract"],
            [DOCS_DIR / "steady_state_report.json", DOCS_DIR / "replication_scoreboard.md"],
        ),
        (
            "build_linear_system",
            [sys.executable, str(ROOT / "scripts" / "build_linear_system.py")],
            [REPORTS_DIR / "catalog_gate.json", DOCS_DIR / "linear_system_report.json"],
        ),
        (
            "run_determinacy_irf",
            [sys.executable, str(ROOT / "scripts" / "run_determinacy_irf.py")],
            [DOCS_DIR / "determinacy_report.json", DOCS_DIR / "irf_results.npz"],
        ),
    ]

    for name, command, artifacts in step_defs:
        result = _run_step(name, command, artifact_paths=artifacts)
        summary["steps"].append(asdict(result))

    summary["post_run"] = _post_run_snapshot()

    SUMMARY_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    _write_markdown(summary)

    print(f"Wrote diagnostics summary: {SUMMARY_JSON.relative_to(ROOT)}")
    print(f"Wrote diagnostics summary: {SUMMARY_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
