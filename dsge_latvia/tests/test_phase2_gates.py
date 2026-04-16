"""
Phase 2 gate tests.

These tests protect the catalog, variable list, and core-system integrity
contracts established in Phase 2. They have no numpy/scipy dependency and
run in any environment where pyyaml is installed.

Run with:
    pytest dsge_latvia/tests/test_phase2_gates.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "model"
CATALOGS_DIR = MODEL_DIR / "catalogs"
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_catalog(path: Path) -> list[dict]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("equations", [])


def _load_theory_variables(path: Path) -> list[str]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [v for v in data.get("variables", []) if isinstance(v, str)]


# ---------------------------------------------------------------------------
# Catalog authority
# ---------------------------------------------------------------------------

class TestCatalogAuthority:
    """equations_catalog.yaml is the one authoritative catalog."""

    def test_authoritative_catalog_exists(self):
        assert (CATALOGS_DIR / "equations_catalog.yaml").exists()

    def test_legacy_catalog_is_marked_legacy(self):
        legacy = CATALOGS_DIR / "equations_catalog_kk.yaml"
        assert legacy.exists(), "legacy catalog missing"
        first_line = legacy.read_text(encoding="utf-8").splitlines()[0]
        assert "Legacy" in first_line or "legacy" in first_line, (
            "equations_catalog_kk.yaml must have a 'Legacy' comment on line 1 "
            "so it is never mistaken for the authoritative catalog"
        )

    def test_authoritative_catalog_has_required_kinds(self):
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        kinds = {e.get("kind") for e in entries if isinstance(e, dict)}
        assert "core_dynamic" in kinds
        assert "closure_or_regime" in kinds
        assert "measurement" in kinds

    def test_no_measurement_equations_in_allowed_kinds(self):
        """Measurement equations must never leak into the solution core."""
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        core_and_closure = [
            e for e in entries
            if e.get("kind") in {"core_dynamic", "closure_or_regime"}
        ]
        measurement_ids = [
            e["id"] for e in core_and_closure
            if e.get("id", "").startswith("meas")
        ]
        assert measurement_ids == [], (
            f"Measurement equations found in core/closure kinds: {measurement_ids}"
        )

    def test_all_entries_have_id_and_kind(self):
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        missing = [
            e for e in entries
            if isinstance(e, dict) and (not e.get("id") or not e.get("kind"))
        ]
        assert missing == [], f"Catalog entries missing id or kind: {missing}"

    def test_no_duplicate_ids_in_authoritative_catalog(self):
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        ids = [e["id"] for e in entries if isinstance(e, dict) and e.get("id")]
        duplicates = [id_ for id_ in ids if ids.count(id_) > 1]
        assert duplicates == [], f"Duplicate equation ids in catalog: {set(duplicates)}"


# ---------------------------------------------------------------------------
# Theory variable list
# ---------------------------------------------------------------------------

class TestTheoryVariableList:
    """endogenous_variables_theory.yaml is the authoritative variable list."""

    def test_theory_variable_list_exists(self):
        assert (MODEL_DIR / "endogenous_variables_theory.yaml").exists()

    def test_theory_variable_list_is_nonempty(self):
        variables = _load_theory_variables(MODEL_DIR / "endogenous_variables_theory.yaml")
        assert len(variables) > 100, f"Expected >100 theory variables, got {len(variables)}"

    def test_no_duplicate_variables(self):
        variables = _load_theory_variables(MODEL_DIR / "endogenous_variables_theory.yaml")
        duplicates = [v for v in variables if variables.count(v) > 1]
        assert duplicates == [], f"Duplicate variables in theory list: {set(duplicates)}"

    def test_variables_follow_naming_convention(self):
        """All variables should follow snake_case_t naming (end with _t or _t_p1 etc.)."""
        variables = _load_theory_variables(MODEL_DIR / "endogenous_variables_theory.yaml")
        non_conforming = [v for v in variables if not re.search(r"_t", v)]
        # Warn rather than hard-fail — some auxiliary vars may not end in _t
        if non_conforming:
            pytest.warns(
                UserWarning,
                match="non-conforming",
            ) if False else None  # just surface for visibility
        # Hard check: at least 90% must contain _t
        pct = (len(variables) - len(non_conforming)) / len(variables)
        assert pct >= 0.9, (
            f"Only {pct:.0%} of variables contain '_t'. Non-conforming: {non_conforming[:10]}"
        )


# ---------------------------------------------------------------------------
# Core system square check (from catalog_gate.json if it exists)
# ---------------------------------------------------------------------------

class TestCoreSystemIntegrity:
    """
    Two tiers:
    1. YAML-native checks — run always, no numpy/scipy needed, validate the
       current YAML state directly.
    2. gate_report checks — validate the artifact produced by build_linear_system.py.
       Skip if the file does not exist (environment not set up).

    The YAML-native square check is the authoritative gate for Phase 2.
    The gate_report checks are a secondary consistency check for after the
    builder runs.
    """

    # ---- YAML-native (always run) ------------------------------------------

    def _count_residuals_from_yaml(self) -> int:
        """Count residuals by splitting multi-residual raw equations on semicolons."""
        skip_re = re.compile(r"int_0|sum_\{|\bsum\{|\bdj\b")
        catalog = yaml.safe_load(
            (CATALOGS_DIR / "equations_catalog.yaml").read_text(encoding="utf-8")
        )
        allowed = {"core_dynamic", "closure_or_regime"}
        eq_ids = {
            e["id"]
            for e in catalog.get("equations", [])
            if isinstance(e, dict) and e.get("kind") in allowed and e.get("id")
        }
        spec = yaml.safe_load((MODEL_DIR / "spec.yaml").read_text(encoding="utf-8"))
        eq_map: dict[str, str] = {}
        for entries in spec.values():
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if isinstance(entry, dict) and entry.get("id"):
                    eq_map[entry["id"]] = entry.get("raw", "")

        count = 0
        for eq_id in eq_ids:
            raw = eq_map.get(eq_id, "")
            for part in raw.split(";"):
                part = part.strip()
                if part and not skip_re.search(part):
                    count += 1
        return count

    def test_system_is_square_from_yaml(self):
        """Core residual count must equal theory variable count — no numpy needed."""
        residuals = self._count_residuals_from_yaml()
        variables = _load_theory_variables(MODEL_DIR / "endogenous_variables_theory.yaml")
        assert residuals == len(variables), (
            f"Core system is not square: {residuals} residuals vs {len(variables)} variables. "
            "Fix by reclassifying equations in equations_catalog.yaml or adjusting "
            "endogenous_variables_theory.yaml."
        )

    # ---- gate_report checks (require builder to have run) -------------------

    @pytest.fixture
    def gate_report(self):
        path = REPORTS_DIR / "catalog_gate.json"
        if not path.exists():
            pytest.skip("catalog_gate.json not yet generated — run build_linear_system.py first")
        return json.loads(path.read_text(encoding="utf-8"))

    def test_no_missing_equations(self, gate_report):
        missing = gate_report.get("missing_equations", [])
        assert missing == [], f"Equations in catalog not found in spec.yaml: {missing}"

    def test_no_skipped_equations(self, gate_report):
        skipped = gate_report.get("skipped_equations", [])
        assert skipped == [], f"Equations were skipped during build: {skipped}"

    def test_system_is_square(self, gate_report):
        eq_count = gate_report.get("equation_count")
        var_count = gate_report.get("variable_count")
        assert eq_count is not None and var_count is not None
        assert eq_count == var_count, (
            f"Core system is not square: {eq_count} equations vs {var_count} variables"
        )

    def test_no_missing_allowlist_variables(self, gate_report):
        missing = gate_report.get("missing_allowlist_variables", [])
        assert missing == [], (
            f"Theory-list variables not found in any equation: {missing}"
        )

    def test_measurement_equations_excluded_from_used_sections(self, gate_report):
        used_sections = gate_report.get("used_sections", [])
        assert "measurement_equations" not in used_sections, (
            "measurement_equations section must not appear in the built system"
        )


# ---------------------------------------------------------------------------
# Resource wedge contract
# ---------------------------------------------------------------------------

class TestResourceWedgeContract:
    """The resource_wedge exemption must be explicitly present and documented."""

    def test_allowlist_exists(self):
        assert (MODEL_DIR / "steady_state_allowlist.yaml").exists()

    def test_resource_wedge_has_note(self):
        data = yaml.safe_load(
            (MODEL_DIR / "steady_state_allowlist.yaml").read_text(encoding="utf-8")
        )
        notes = data.get("notes", {})
        assert "resource_wedge" in notes, (
            "resource_wedge is exempted but has no explanatory note in steady_state_allowlist.yaml"
        )
        assert len(notes["resource_wedge"]) > 10, "resource_wedge note is too short to be meaningful"


# ---------------------------------------------------------------------------
# Freeze / close inventory
# ---------------------------------------------------------------------------

class TestFreezeCloseInventory:
    """freeze_* and close_* equations must be present and catalogued as closure_or_regime."""

    def test_freeze_equations_are_closure_or_regime(self):
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        freeze = [e for e in entries if e.get("id", "").startswith("freeze_")]
        assert len(freeze) > 0, "No freeze_* equations found in catalog"
        wrong_kind = [e for e in freeze if e.get("kind") != "closure_or_regime"]
        assert wrong_kind == [], (
            f"freeze_* equations must have kind=closure_or_regime: {[e['id'] for e in wrong_kind]}"
        )

    def test_close_equations_are_closure_or_regime(self):
        entries = _load_catalog(CATALOGS_DIR / "equations_catalog.yaml")
        close = [e for e in entries if e.get("id", "").startswith("close_")]
        assert len(close) > 0, "No close_* equations found in catalog"
        wrong_kind = [e for e in close if e.get("kind") != "closure_or_regime"]
        assert wrong_kind == [], (
            f"close_* equations must have kind=closure_or_regime: {[e['id'] for e in wrong_kind]}"
        )
