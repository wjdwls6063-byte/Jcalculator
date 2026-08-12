from __future__ import annotations

import os

os.environ["JCALCULATOR_API_KEYS"] = "coworker=test-secret,former=revoked-secret"
os.environ["JCALCULATOR_ALLOWED_ORIGINS"] = "https://jcalculator.onrender.com"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


client = TestClient(app)


def test_health_does_not_require_a_key() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_calculation_rejects_missing_or_invalid_key() -> None:
    assert client.post("/api/ballscrew", json={}).status_code == 401
    assert client.post("/api/ballscrew", headers={"X-API-Key": "wrong"}, json={}).status_code == 401


def test_horizontal_calculation_with_cors() -> None:
    response = client.post(
        "/api/ballscrew",
        headers={
            "X-API-Key": "test-secret",
            "Origin": "https://jcalculator.onrender.com",
        },
        json={},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://jcalculator.onrender.com"
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    assert result["selected"]["drive"]["screw"]["id"] == "BNK2020K-3.6"
    assert result["selected"]["guideEval"]["guide"]["id"] == "HSR25C"


def test_vertical_calculation_forces_vertical_mode() -> None:
    response = client.post(
        "/api/ballscrew/vertical",
        headers={"X-API-Key": "test-secret"},
        json={"axisMode": "horizontal", "motorId": "HG-KR73", "screwModelId": "BNK2520K-3.6"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["selected"]["drive"]["gravityForceN"] > 0


def test_catalog_is_protected_and_contains_backend_data() -> None:
    response = client.get(
        "/api/ballscrew/catalog?axis=vertical",
        headers={"X-API-Key": "test-secret"},
    )
    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog["motors"]) == 5
    assert len(catalog["screws"]) == 97
    assert len(catalog["guides"]) == 32
    assert catalog["defaults"]["axisMode"] == "vertical"


def test_ballscrew_auto_selection_endpoint() -> None:
    response = client.post(
        "/api/ballscrew/auto-select",
        headers={"X-API-Key": "test-secret"},
        json={},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["ok"] is True
    assert result["safe"] is True
    assert result["combos"] > 0
    assert result["apply"]["screwModelId"]
    assert result["apply"]["guideModelId"]


def test_unapproved_origin_gets_no_cors_allow_origin_header() -> None:
    response = client.options(
        "/api/conveyor",
        headers={
            "Origin": "https://example.invalid",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-API-Key,Content-Type",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
