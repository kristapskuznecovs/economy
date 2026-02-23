from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import re
import yaml


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "model"


@dataclass
class ParamIssue:
    name: str
    status: str
    source: str | None
    notes: str | None
    equations: list[str]
    sections: list[str]


def _load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _load_spec() -> dict[str, Any]:
    data = _load_yaml(MODEL_DIR / "spec.yaml")
    if not isinstance(data, dict):
        raise ValueError("spec.yaml must be a mapping")
    return data


def _load_param_values() -> set[str]:
    names: set[str] = set()
    for name in (
        "parameters_fiscal_calibrated.yaml",
        "parameters_nonfiscal_calibrated.yaml",
        "parameters_fiscal_estimated.yaml",
        "parameters_nonfiscal_estimated.yaml",
        "parameters_foreign_estimated.yaml",
    ):
        path = MODEL_DIR / name
        if not path.exists():
            continue
        data = _load_yaml(path)
        if isinstance(data, dict):
            names.update(data.keys())
    return names


def _load_registry() -> dict[str, Any]:
    path = MODEL_DIR / "parameter_registry.yaml"
    if not path.exists():
        return {}
    data = _load_yaml(path)
    if not isinstance(data, dict):
        raise ValueError("parameter_registry.yaml must be a mapping")
    return data


def _collect_equation_refs(spec: dict[str, Any]) -> dict[str, tuple[str, str]]:
    sections = [
        "equations",
        "fiscal_rule_equations",
        "appendix_a_equations",
        "appendix_c_normalization",
        "appendix_c_functional_forms",
        "appendix_c_normalized_model",
        "shock_processes",
        "foreign_block_equations",
        "measurement_equations",
    ]
    refs: dict[str, tuple[str, str]] = {}
    for section in sections:
        entries = spec.get(section, []) or []
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            eq_id = entry.get("id")
            raw = entry.get("raw")
            if eq_id and raw:
                refs[str(eq_id)] = (section, str(raw))
    return refs


def _find_param_usage(equation_text: str, param_names: set[str]) -> set[str]:
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", equation_text)
    return {t for t in tokens if t in param_names}


def build_param_issues() -> tuple[list[ParamIssue], list[str]]:
    spec = _load_spec()
    registry = _load_registry()
    param_values = _load_param_values()
    eq_refs = _collect_equation_refs(spec)

    # Build reverse index: parameter -> equations
    param_to_eqs: dict[str, set[str]] = {}
    param_to_sections: dict[str, set[str]] = {}
    for eq_id, (section, raw) in eq_refs.items():
        used = _find_param_usage(raw, param_values | registry.keys())
        for param in used:
            param_to_eqs.setdefault(param, set()).add(eq_id)
            param_to_sections.setdefault(param, set()).add(section)

    issues: list[ParamIssue] = []
    missing_unregistered: list[str] = []

    # Registry-driven issues
    for name, meta in registry.items():
        status = meta.get("status", "unknown")
        if status in {"temporary", "missing"}:
            issues.append(
                ParamIssue(
                    name=name,
                    status=status,
                    source=meta.get("source"),
                    notes=meta.get("notes"),
                    equations=sorted(param_to_eqs.get(name, set())),
                    sections=sorted(param_to_sections.get(name, set())),
                )
            )

    # Missing parameters that appear in equations but have no value and no registry entry
    for param in sorted(param_to_eqs.keys()):
        if param not in param_values and param not in registry:
            missing_unregistered.append(param)

    return issues, missing_unregistered


def main() -> None:
    issues, missing_unregistered = build_param_issues()
    print("Parameter completeness gate\n")
    if issues:
        print("Placeholders / missing (registry):")
        for item in issues:
            print(f"- {item.name} [{item.status}]")
            if item.source:
                print(f"  source: {item.source}")
            if item.notes:
                print(f"  notes: {item.notes}")
            if item.sections:
                print(f"  sections: {', '.join(item.sections)}")
            if item.equations:
                print(f"  equations: {', '.join(item.equations[:12])}")
                if len(item.equations) > 12:
                    print(f"  ... (+{len(item.equations)-12} more)")
    else:
        print("No placeholders flagged in registry.")

    if missing_unregistered:
        print("\nMissing parameters (not in registry):")
        print(", ".join(missing_unregistered))


if __name__ == "__main__":
    main()
