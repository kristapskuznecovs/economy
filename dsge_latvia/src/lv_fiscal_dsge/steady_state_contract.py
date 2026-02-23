from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from lv_fiscal_dsge.parameter_audit import build_param_issues
from lv_fiscal_dsge.steady_state import (
    compute_residuals,
    compute_financial_frictions_metrics,
    load_parameters,
    solve_full_steady_state,
)


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "model"
DOCS_DIR = ROOT / "docs"


@dataclass
class ContractResult:
    max_residual: float
    max_residual_key: str
    residuals: dict[str, float]
    exemptions: dict[str, float]
    tolerance: float
    wedge_magnitude: float
    metrics: dict[str, float]
    invariants: dict[str, dict[str, object]]
    invariant_failures: dict[str, dict[str, object]]
    passed: bool


def _load_allowlist() -> dict[str, Any]:
    path = MODEL_DIR / "steady_state_allowlist.yaml"
    if not path.exists():
        return {"tolerance": 1.0e-10, "exempt_residuals": []}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("steady_state_allowlist.yaml must be a mapping")
    return data


def evaluate_contract() -> ContractResult:
    params = load_parameters()
    ss = solve_full_steady_state(params)
    residuals = compute_residuals(ss, params)
    metrics = compute_financial_frictions_metrics(ss, params)

    allowlist = _load_allowlist()
    tolerance = float(allowlist.get("tolerance", 1.0e-10))
    exempt_keys = set(allowlist.get("exempt_residuals", []))

    exemptions: dict[str, float] = {}
    filtered: dict[str, float] = {}
    for key, value in residuals.items():
        if key in exempt_keys:
            exemptions[key] = value
        else:
            filtered[key] = value

    if filtered:
        max_key = max(filtered, key=lambda k: abs(filtered[k]))
        max_residual = float(abs(filtered[max_key]))
    else:
        max_key = ""
        max_residual = 0.0

    wedge_magnitude = float(abs(residuals.get("resource_wedge", 0.0)))

    invariants = {
        "omega_bar_positive": {
            "value": metrics["omega_bar"],
            "ok": bool(metrics["omega_bar"] > 0.0),
            "bounds": "(0, inf)",
        },
        "default_prob_unit_interval": {
            "value": metrics["F_omega_bar"],
            "ok": bool(0.0 <= metrics["F_omega_bar"] <= 1.0),
            "bounds": "[0, 1]",
        },
        "G_unit_interval": {
            "value": metrics["G"],
            "ok": bool(0.0 <= metrics["G"] <= 1.0),
            "bounds": "[0, 1]",
        },
        "share_to_banks_unit_interval": {
            "value": metrics["share_to_banks"],
            "ok": bool(0.0 < metrics["share_to_banks"] < 1.0),
            "bounds": "(0, 1)",
        },
        "net_worth_positive": {
            "value": metrics["net_worth"],
            "ok": bool(metrics["net_worth"] > 0.0),
            "bounds": "(0, inf)",
        },
        "net_worth_ratio_unit_interval": {
            "value": metrics["net_worth_ratio"],
            "ok": bool(0.0 < metrics["net_worth_ratio"] < 1.0),
            "bounds": "(0, 1)",
        },
        "transfer_entrepreneurs_positive": {
            "value": metrics["transfer_entrepreneurs"],
            "ok": bool(metrics["transfer_entrepreneurs"] > 0.0),
            "bounds": "(0, inf)",
        },
        "external_finance_premium_nonnegative": {
            "value": metrics["gross_return_ratio"],
            "ok": bool(metrics["gross_return_ratio"] >= 1.0),
            "bounds": "[1, inf)",
        },
    }
    invariant_failures = {k: v for k, v in invariants.items() if not v.get("ok")}
    passed = max_residual <= tolerance and not invariant_failures

    return ContractResult(
        max_residual=max_residual,
        max_residual_key=max_key,
        residuals=filtered,
        exemptions=exemptions,
        tolerance=tolerance,
        wedge_magnitude=wedge_magnitude,
        metrics=metrics,
        invariants=invariants,
        invariant_failures=invariant_failures,
        passed=passed,
    )


def write_report(result: ContractResult) -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = DOCS_DIR / "steady_state_report.json"

    sorted_res = sorted(
        result.residuals.items(), key=lambda kv: abs(kv[1]), reverse=True
    )
    top = [{"name": k, "value": v} for k, v in sorted_res[:20]]

    payload = {
        "max_residual": result.max_residual,
        "max_residual_key": result.max_residual_key,
        "tolerance": result.tolerance,
        "top_residuals": top,
        "exemptions": result.exemptions,
        "wedge_magnitude": result.wedge_magnitude,
        "financial_frictions_metrics": result.metrics,
        "invariants": result.invariants,
        "invariant_failures": result.invariant_failures,
        "passed": result.passed,
    }
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_scoreboard(result: ContractResult) -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    scoreboard_path = DOCS_DIR / "replication_scoreboard.md"

    issues, missing_unregistered = build_param_issues()
    placeholder_count = len(issues)
    missing_count = len(missing_unregistered)

    lines = [
        "**Replication Scoreboard**",
        f"SS residual max: `{result.max_residual:.3e}` (tolerance `{result.tolerance:.1e}`)",
        f"SS wedge (resource): `{result.wedge_magnitude:.6f}`",
        f"Determinacy: `not run`",
        f"IRF pass rate: `0/0`",
        f"Parameter placeholders: `{placeholder_count}`",
        f"Missing unregistered params: `{missing_count}`",
    ]
    n_ratio_target = result.metrics.get("net_worth_ratio_target")
    if n_ratio_target is not None:
        lines.append(
            "Financial block: net worth ratio implied "
            f"`{result.metrics['net_worth_ratio']:.4f}` "
            f"(target `{n_ratio_target:.4f}`, gap `{result.metrics['net_worth_ratio_gap']:.4f}`)"
        )
    if "transfer_entrepreneurs_target" in result.metrics:
        lines.append(
            "Financial block: entrepreneur transfers implied "
            f"`{result.metrics['transfer_entrepreneurs']:.4f}` "
            f"(target `{result.metrics['transfer_entrepreneurs_target']:.4f}`, "
            f"gap `{result.metrics['transfer_entrepreneurs_gap']:.4f}`)"
        )
    lines.append(
        "FIN BLOCK STATUS: structurally consistent; calibration moment gaps pending "
        "(net worth ratio, entrepreneur transfers)."
    )
    lines.append(
        "Calibration note: financial block closed by implying net worth share and transfers; "
        "revisit when empirical leverage/spread targets are chosen."
    )
    scoreboard_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    result = evaluate_contract()
    write_report(result)
    write_scoreboard(result)
    if not result.passed:
        raise RuntimeError(
            "Steady-state contract failed: "
            f"max residual {result.max_residual:.3e} (key {result.max_residual_key}), "
            f"invariant failures: {', '.join(result.invariant_failures.keys()) or 'none'}."
        )
    print("Steady-state contract: OK")


if __name__ == "__main__":
    main()
