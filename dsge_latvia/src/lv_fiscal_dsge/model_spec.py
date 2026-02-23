from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import re

try:
    import yaml
except Exception as exc:  # pragma: no cover - soft dependency
    yaml = None


@dataclass
class Equation:
    eq_id: str
    raw: str
    source: str | None = None
    name: str | None = None
    section: str | None = None
    notes: str | None = None


@dataclass
class ModelSpec:
    name: str
    variables: list[str]
    shocks: list[str]
    parameters: dict[str, float]
    equations: list[Equation]
    observables: dict[str, list[str]]
    sources: dict[str, Any] | None = None


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "model"


def _load_yaml(path: Path) -> Any:
    if yaml is None:
        raise RuntimeError("pyyaml is required to load model YAML files")
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_parameters(paths: list[Path]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for path in paths:
        data = _load_yaml(path)
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict in {path}")
        merged.update(data)
    return merged


def load_observables() -> dict[str, list[str]]:
    return _load_yaml(MODEL_DIR / "observables.yaml")


def _load_spec_yaml() -> dict[str, Any]:
    data = _load_yaml(MODEL_DIR / "spec.yaml")
    if not isinstance(data, dict):
        raise ValueError("spec.yaml must be a mapping")
    return data


def _collect_equations(spec: dict[str, Any]) -> list[Equation]:
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
    collected: list[Equation] = []
    for section in sections:
        entries = spec.get(section, [])
        if not entries:
            continue
        if not isinstance(entries, list):
            raise ValueError(f"{section} must be a list")
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError(f"{section} entries must be mappings")
            raw = entry.get("raw")
            eq_id = entry.get("id")
            if not raw or not eq_id:
                continue
            collected.append(
                Equation(
                    eq_id=str(eq_id),
                    raw=str(raw),
                    source=entry.get("source"),
                    name=entry.get("name"),
                    notes=entry.get("notes"),
                    section=section,
                )
            )
    return collected


def _collect_parameter_names() -> set[str]:
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


def _extract_symbols(equations: list[Equation], param_names: set[str]) -> tuple[list[str], list[str]]:
    reserved = {
        "E_t",
        "E",
        "exp",
        "log",
        "min",
        "max",
        "sum",
        "int_0",
        "Gamma",
        "G",
        "Phi",
        "S_tilde",
        "S_tilde_prime",
        "S_tilde_double_prime",
        "pi",
    }
    token_re = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
    tokens: set[str] = set()
    shock_tokens: set[str] = set()
    for eq in equations:
        for token in token_re.findall(eq.raw):
            tokens.add(token)
        for match in re.findall(r"\beps_[A-Za-z0-9_]*\b", eq.raw):
            shock_tokens.add(match)
        for match in re.findall(r"\be_me_[A-Za-z0-9_]*\b", eq.raw):
            shock_tokens.add(match)
    variables = sorted(t for t in tokens if t not in reserved and t not in param_names)
    shocks = sorted(t for t in shock_tokens if t not in param_names)
    return variables, shocks


def build_spec() -> ModelSpec:
    params = load_parameters(
        [
            MODEL_DIR / "parameters_fiscal_calibrated.yaml",
            MODEL_DIR / "parameters_nonfiscal_calibrated.yaml",
        ]
    )
    observables = load_observables()
    spec_yaml = _load_spec_yaml()
    equations = _collect_equations(spec_yaml)
    param_names = _collect_parameter_names()
    variables, shocks = _extract_symbols(equations, param_names)

    return ModelSpec(
        name=spec_yaml.get("name", "Latvia Fiscal DSGE"),
        variables=variables,
        shocks=shocks,
        parameters=params,
        equations=equations,
        observables=observables,
        sources=spec_yaml.get("source"),
    )
