"""API contract tests for route documentation and error envelope behavior."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from economic_api.main import app  # noqa: E402


client = TestClient(app)


def test_openapi_has_parameter_descriptions_and_error_responses() -> None:
    """Ensure API docs expose parameter descriptions and standard error responses."""
    spec = app.openapi()
    paths = spec.get("paths", {})

    expected_endpoints = {
        ("get", "/api/budget/vote-divisions"),
        ("get", "/api/budget/vote-divisions/history"),
        ("get", "/api/budget/revenue-sources/history"),
        ("get", "/api/budget/trade/overview"),
        ("get", "/api/budget/economy-structure"),
        ("get", "/api/budget/debt-overview"),
        ("get", "/api/budget/construction-overview"),
        ("get", "/api/budget/expenditure-positions"),
        ("get", "/api/budget/procurement-kpi"),
        ("post", "/api/policy/parse"),
        ("post", "/api/simulate"),
        ("get", "/api/status/{run_id}"),
        ("get", "/api/results/{run_id}"),
    }

    for method, path in expected_endpoints:
        op = paths[path][method]
        assert op.get("summary"), f"Missing summary for {method.upper()} {path}"
        assert op.get("description"), f"Missing description for {method.upper()} {path}"

    for path, ops in paths.items():
        for method, op in ops.items():
            if method not in {"get", "post"} or not path.startswith("/api"):
                continue
            for param in op.get("parameters", []):
                assert param.get("description"), f"Missing param description {method.upper()} {path}:{param.get('name')}"

    budget_op = paths["/api/budget/vote-divisions"]["get"]
    assert "400" in budget_op["responses"]
    assert "503" in budget_op["responses"]
    assert "422" in budget_op["responses"]

    policy_op = paths["/api/policy/parse"]["post"]
    assert "429" in policy_op["responses"]
    assert "400" in policy_op["responses"]

    status_op = paths["/api/status/{run_id}"]["get"]
    assert "404" in status_op["responses"]


def test_error_envelope_for_not_found_and_validation() -> None:
    """Ensure standardized error envelope is returned for business and validation errors."""
    not_found_response = client.get(f"/api/status/{uuid4()}")
    assert not_found_response.status_code == 404
    payload = not_found_response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "not_found"
    assert "request_id" in payload["error"]
    assert "detail" in payload
    assert not_found_response.headers.get("X-Request-ID")

    validation_response = client.get("/api/status/not-a-uuid")
    assert validation_response.status_code == 422
    payload = validation_response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "validation_error"
    assert isinstance(payload["detail"], list)
    assert validation_response.headers.get("X-Request-ID")


def test_health_and_simulate_include_request_id_header() -> None:
    """Ensure success responses include X-Request-ID and simulate reports a real state."""
    health_response = client.get("/api/health")
    assert health_response.status_code == 200
    assert health_response.headers.get("X-Request-ID")
    assert health_response.json()["status"] == "ok"

    simulate_response = client.post(
        "/api/simulate",
        json={"policy": "Increase health spending by 1%", "country": "LV", "horizon_quarters": 8},
    )
    assert simulate_response.status_code == 200
    assert simulate_response.headers.get("X-Request-ID")
    payload = simulate_response.json()
    assert payload["status"] in {"pending", "running", "completed", "failed"}
