#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "model"
DOCS_DIR = ROOT / "docs" / "reports"

TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def _normalize_expr(expr: str) -> str:
    expr = expr.replace("^", "**")
    expr = expr.replace("ln(", "log(")
    expr = expr.replace("E_t", "").replace("E_0", "")
    expr = expr.replace("E_t[", "(").replace("E_0[", "(")
    expr = expr.replace("{", "(").replace("}", ")")
    expr = expr.replace("[", "(").replace("]", ")")
    expr = re.sub(r"([A-Za-z0-9]),([A-Za-z0-9])", r"\1_\2", expr)
    expr = expr.replace("_t+1", "_t_p1").replace("_t-1", "_t_m1")
    expr = expr.replace("t+1", "t_p1").replace("t-1", "t_m1")
    expr = re.sub(r"([A-Za-z_][A-Za-z0-9_]*_t[A-Za-z0-9_]*)\+1\b", r"\1_p1", expr)
    expr = re.sub(r"([A-Za-z_][A-Za-z0-9_]*_t[A-Za-z0-9_]*)-1\b", r"\1_m1", expr)
    expr = re.sub(r"_t_p1_([A-Za-z0-9_]+)", r"_t_\1_p1", expr)
    expr = re.sub(r"_t_m1_([A-Za-z0-9_]+)", r"_t_\1_m1", expr)
    return expr


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    spec = _load_yaml(MODEL_DIR / "spec.yaml")
    catalog = _load_yaml(MODEL_DIR / "catalogs" / "equations_catalog.yaml")

    allowed_kinds = {"core_dynamic", "closure_or_regime"}
    eq_ids = [
        e["id"]
        for e in catalog.get("equations", [])
        if isinstance(e, dict) and e.get("kind") in allowed_kinds
    ]

    eq_map = {}
    for section, entries in spec.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if isinstance(entry, dict) and entry.get("id"):
                eq_map[entry["id"]] = entry

    allowlist_path = MODEL_DIR / "endogenous_variables_theory.yaml"
    if allowlist_path.exists():
        allow = _load_yaml(allowlist_path)
    else:
        allow = _load_yaml(MODEL_DIR / "endogenous_variables.yaml")
    allow_vars = set(allow.get("variables", []))

    report = {
        "equation_count": len(eq_ids),
        "unmapped_leads": [],
        "equations": [],
    }

    for eq_id in eq_ids:
        entry = eq_map.get(eq_id)
        if not entry:
            continue
        raw = entry.get("raw", "")
        if "E_t" not in raw and "E_0" not in raw:
            continue
        normalized = _normalize_expr(raw)
        tokens = TOKEN_RE.findall(normalized)
        leads = sorted({tok for tok in tokens if tok.endswith("_p1")})
        base = sorted({tok[:-3] for tok in leads})
        unmapped = sorted([b for b in base if b not in allow_vars])
        representation = "pi_error" if leads else "none"
        report["equations"].append(
            {
                "id": eq_id,
                "lead_terms": leads,
                "base_variables": base,
                "unmapped": unmapped,
                "representation": representation,
                "mapped_into_pi": len(unmapped) == 0,
            }
        )
        for b in unmapped:
            report["unmapped_leads"].append({"equation": eq_id, "variable": b})

    out_path = DOCS_DIR / "lead_term_coverage_report.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
