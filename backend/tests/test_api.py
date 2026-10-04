from __future__ import annotations

import os
import secrets
import tempfile

os.environ["JCALCULATOR_ALLOWED_ORIGINS"] = "https://jcalculator.onrender.com"
os.environ["JCALCULATOR_SQLITE_PATH"] = os.path.join(tempfile.mkdtemp(), "jcalculator-test.sqlite")
os.environ["JCALCULATOR_COOKIE_SECURE"] = "false"
os.environ["JCALCULATOR_ADMIN_USERNAME"] = "admin"

from app.admin_auth import hash_password  # noqa: E402

TEST_ADMIN_PASSWORD = secrets.token_urlsafe(18)
os.environ["JCALCULATOR_ADMIN_PASSWORD_HASH"] = hash_password(TEST_ADMIN_PASSWORD)
TEST_GUEST_PASSWORD = secrets.token_urlsafe(18)
os.environ["JCALCULATOR_GUEST_PASSWORD_HASH"] = hash_password(TEST_GUEST_PASSWORD)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


client = TestClient(app)


def test_health_does_not_require_a_key() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_guest_calculation_does_not_require_an_api_key() -> None:
    assert client.post("/api/ballscrew", json={}).status_code == 200


def test_horizontal_calculation_with_cors() -> None:
    response = client.post(
        "/api/ballscrew",
        headers={
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
        json={"axisMode": "horizontal", "motorId": "HG-KR73", "screwModelId": "BNK2520K-3.6"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["selected"]["drive"]["gravityForceN"] > 0


def test_catalog_is_public_and_contains_backend_data() -> None:
    response = client.get("/api/ballscrew/catalog?axis=vertical")
    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog["motors"]) == 5
    assert len(catalog["screws"]) == 97
    assert len(catalog["guides"]) == 32
    assert catalog["defaults"]["axisMode"] == "vertical"


def test_ballscrew_auto_selection_endpoint() -> None:
    response = client.post(
        "/api/ballscrew/auto-select",
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
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
