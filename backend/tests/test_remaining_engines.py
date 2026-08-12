from __future__ import annotations

import os

import pytest

os.environ["JCALCULATOR_API_KEYS"] = "coworker=test-secret,former=revoked-secret"
os.environ["JCALCULATOR_ALLOWED_ORIGINS"] = "https://jcalculator.onrender.com"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


client = TestClient(app)
AUTH = {"X-API-Key": "test-secret"}


ECCENTRIC_DEFAULT = {
    "m": 25,
    "e": 30,
    "shape": "disk",
    "r": 200,
    "ra": 400,
    "rb": 200,
    "jd": 10,
    "orient": "v",
    "tf": 0.5,
    "theta": 180,
    "ta": 1.5,
    "tc": 3,
    "td": 1.5,
    "tw": 5,
    "hold": True,
    "estop": False,
    "te": 0.1,
    "drive": "belt",
    "d1": 100,
    "d2": 200,
    "eb": 0.9,
    "mp1": 0.5,
    "mp2": 1,
    "gmk": "ATG2",
    "gsz": 62,
    "grt": 50,
    "etaR": 0.78,
    "gman": {"ig": 10, "eff": 0.9, "peak": 18, "avg": 18, "nmax": 6000, "navg": 3000, "J": 0.08},
    "motorId": "HG-KR13",
    "brake": False,
    "sf": 1.5,
}


def test_conveyor_default_matches_original_equations() -> None:
    response = client.post(
        "/api/conveyor",
        headers=AUTH,
        json={
            "load": 20,
            "angle": 0,
            "pmotor": 90,
            "rpm": 1500,
            "ratio": 30,
            "pulley": 50,
            "center": 1000,
            "width": 300,
            "support": "slider",
            "pitch": 200,
            "sf": 3,
            "eff": 0.8,
            "cmu": 0.2,
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["vmm"] == pytest.approx(7853.981633974483)
    assert result["mBelt"] == pytest.approx(1.8)
    assert result["Fe"] == pytest.approx(85.5432)
    assert result["Preq"] == pytest.approx(41.990920106962875)
    assert result["margin"] == pytest.approx(114.33205028788194)
    assert len(result["comparison"]) == 6


def test_eccentric_default_matches_original_engine() -> None:
    response = client.post("/api/eccentric", headers=AUTH, json=ECCENTRIC_DEFAULT)
    assert response.status_code == 200
    result = response.json()
    assert result["J"] == pytest.approx(0.5225000000000001)
    assert result["Tg"] == pytest.approx(7.354987499999999)
    assert result["Mpk"] == pytest.approx(0.09626419408912862)
    assert result["Mrms"] == pytest.approx(0.0911813185009775)
    assert result["ratio"] == pytest.approx(7.207207207207207)
    assert result["min"] == pytest.approx(1.0812499999999998)
    assert len(result["items"]) == 8


def test_eccentric_catalog_does_not_bulk_export_torque_tables() -> None:
    response = client.get("/api/eccentric/catalog", headers=AUTH)
    assert response.status_code == 200
    catalog = response.json()
    assert set(catalog) == {"motors", "gearOptions"}
    assert "HD" not in catalog
    assert "ATG" not in catalog
    assert catalog["gearOptions"]["ATG2"][0]["ratios"]


def test_eccentric_server_side_auto_selection() -> None:
    response = client.post("/api/eccentric/auto-select", headers=AUTH, json=ECCENTRIC_DEFAULT)
    assert response.status_code == 200
    result = response.json()
    assert result["totalCount"] == 1180
    assert result["safeCount"] > 0
    assert len(result["rows"]) == 30
    assert result["best"] is not None


def test_smc_selection_and_catalog_are_protected() -> None:
    assert client.get("/api/smc-cylinder/catalog").status_code == 401
    catalog = client.get("/api/smc-cylinder/catalog", headers=AUTH)
    assert catalog.status_code == 200
    assert len(catalog.json()["SERIES"]) == 102
    assert all("rules" not in group for group in catalog.json()["GROUPS"].values())

    response = client.post(
        "/api/smc-cylinder",
        headers=AUTH,
        json={
            "motion": "linear",
            "space": "normal",
            "size": "normal",
            "env": "normal",
            "norot": "n",
            "mount": "free",
            "speed": "normal",
            "force": "normal",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["group"] == "G1"
    assert result["primary"]["code"] == "CM2"


def test_all_new_endpoints_reject_a_revoked_key() -> None:
    wrong = {"X-API-Key": "this-key-was-revoked"}
    assert client.post("/api/conveyor", headers=wrong, json={}).status_code == 401
    assert client.post("/api/eccentric", headers=wrong, json=ECCENTRIC_DEFAULT).status_code == 401
    assert client.post("/api/smc-cylinder", headers=wrong, json={}).status_code == 401
