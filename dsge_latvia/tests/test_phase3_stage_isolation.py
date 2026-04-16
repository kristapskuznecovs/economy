"""
Phase 3 stage-isolation tests.

These tests protect the staged build boundaries introduced for singularity
isolation. They do not require numpy/scipy; they only inspect the generated
JSON report and the canonical catalog/spec metadata.

Run with:
    pytest dsge_latvia/tests/test_phase3_stage_isolation.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
REPORTS_DIR = DOCS_DIR / "reports"


@pytest.fixture
def stage_report():
    path = REPORTS_DIR / "stage_isolation_report.json"
    if not path.exists():
        pytest.skip("stage_isolation_report.json not yet generated — run stage_isolation first")
    return json.loads(path.read_text(encoding="utf-8"))


class TestStageIsolation:
    def test_stage_count_and_order(self, stage_report):
        stages = stage_report["stages"]
        titles = [stage["title"] for stage in stages]
        assert titles == [
            "Stage 1: Appendix C Core",
            "Stage 2: Add Fiscal Rules",
            "Stage 3: Add Closure Equations",
            "Stage 4: Add Foreign Freezes",
            "Stage 5: Add Shock Processes",
        ]

    def test_section_progression(self, stage_report):
        stages = {stage["slug"]: stage for stage in stage_report["stages"]}
        assert stages["stage1_appendix_c_core"]["sections"] == ["appendix_c_normalized_model"]
        assert stages["stage2_add_fiscal_rules"]["sections"] == [
            "appendix_c_normalized_model",
            "fiscal_rule_equations",
        ]
        assert stages["stage3_add_closures"]["sections"] == [
            "appendix_c_normalized_model",
            "fiscal_rule_equations",
            "closure_equations",
        ]
        assert stages["stage4_add_foreign_freezes"]["sections"] == [
            "appendix_c_normalized_model",
            "fiscal_rule_equations",
            "closure_equations",
            "foreign_freeze_equations",
        ]
        assert stages["stage5_add_shocks"]["sections"] == [
            "appendix_c_normalized_model",
            "fiscal_rule_equations",
            "closure_equations",
            "foreign_freeze_equations",
            "shock_processes",
        ]

    def test_stage3_suspects_are_close_equations(self, stage_report):
        stages = {stage["slug"]: stage for stage in stage_report["stages"]}
        suspects = stages["stage3_add_closures"]["suspect_equations"]
        assert suspects, "Stage 3 should identify close_* suspects"
        assert all(eq.startswith("close_") for eq in suspects)

    def test_stage4_and_stage5_include_freeze_and_close_suspects(self, stage_report):
        stages = {stage["slug"]: stage for stage in stage_report["stages"]}
        for slug in ("stage4_add_foreign_freezes", "stage5_add_shocks"):
            suspects = stages[slug]["suspect_equations"]
            assert any(eq.startswith("freeze_") for eq in suspects), f"{slug} missing freeze_* suspects"
            assert any(eq.startswith("close_") for eq in suspects), f"{slug} missing close_* suspects"

    def test_stage_catalog_counts_are_monotonic(self, stage_report):
        counts = [stage["catalog_equation_count"] for stage in stage_report["stages"]]
        assert counts == sorted(counts), f"Stage equation counts should grow monotonically: {counts}"

    def test_first_failure_references_a_defined_stage(self, stage_report):
        first_failure = stage_report.get("first_failure")
        if first_failure is None:
            pytest.skip("No stage failure recorded; environment may be fully configured")
        stage_slugs = {stage["slug"] for stage in stage_report["stages"]}
        assert first_failure["slug"] in stage_slugs
        assert first_failure["sections"], "First failure should include sections"


class TestStageIsolationDocs:
    def test_markdown_summary_exists(self):
        assert (DOCS_DIR / "stage_isolation.md").exists()
