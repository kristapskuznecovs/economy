from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from lv_fiscal_dsge.determinacy import check_determinacy
from lv_fiscal_dsge.irf import compute_irfs
from lv_fiscal_dsge.solve import solve_linear_model


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "model"
DOCS_DIR = ROOT / "docs"


def _load_linear_system(path: Path) -> dict[str, np.ndarray]:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing linear system file: {path}. "
            "Generate it from the model equations before running IRFs."
        )
    data = np.load(path, allow_pickle=True)
    return {k: data[k] for k in data.files}


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    system_path = MODEL_DIR / "linear_system.npz"
    system = _load_linear_system(system_path)

    g0 = system["g0"]
    g1 = system["g1"]
    c = system.get("c")
    psi = system.get("psi")
    pi = system.get("pi")
    variables = system.get("variables", np.array([], dtype=object)).tolist()
    shocks = system.get("shocks", np.array([], dtype=object)).tolist()

    det = check_determinacy(g0, g1)
    report = {
        "stable_roots": det.stable,
        "unstable_roots": det.unstable,
        "eu": {"exist": 0, "unique": 0},
    }

    try:
        sol = solve_linear_model(g0, g1, c=c, psi=psi, pi=pi)
    except Exception as exc:
        report["solve_error"] = f"{type(exc).__name__}: {exc}"
        (DOCS_DIR / "determinacy_report.json").write_text(
            json.dumps(report, indent=2), encoding="utf-8"
        )
        return

    report["eu"] = {"exist": sol.eu[0], "unique": sol.eu[1]}
    (DOCS_DIR / "determinacy_report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )

    if psi is None or psi.size == 0:
        return

    horizon = 40
    responses = compute_irfs(sol.G1, sol.impact, horizon=horizon)
    np.savez_compressed(
        DOCS_DIR / "irf_results.npz",
        responses=responses,
        variables=np.array(variables, dtype=object),
        shocks=np.array(shocks, dtype=object),
        horizon=horizon,
    )


if __name__ == "__main__":
    main()
