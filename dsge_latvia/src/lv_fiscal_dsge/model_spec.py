from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import yaml
except Exception as exc:  # pragma: no cover - soft dependency
    yaml = None


@dataclass
class ModelSpec:
    name: str
    variables: list[str]
    shocks: list[str]
    parameters: dict[str, float]
    equations: list[str]
    observables: dict[str, list[str]]


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


def build_spec() -> ModelSpec:
    params = load_parameters(
        [
            MODEL_DIR / "parameters_fiscal_calibrated.yaml",
            MODEL_DIR / "parameters_nonfiscal_calibrated.yaml",
        ]
    )
    observables = load_observables()

    return ModelSpec(
        name="Latvia Fiscal DSGE (working paper base)",
        variables=[],
        shocks=[],
        parameters=params,
        equations=[],
        observables=observables,
    )
