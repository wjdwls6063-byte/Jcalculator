from __future__ import annotations

import os

import pytest

os.environ["JCALCULATOR_ALLOWED_ORIGINS"] = "https://jcalculator.onrender.com"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


client = TestClient(app)
AUTH = {}


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


def test_conveyor_default_includes_full_belt_mass_and_startup_torque() -> None:
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
            "accelTime": 0.5,
            "equivalentInertia": 0,
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["vmm"] == pytest.approx(7853.981633974483)
    assert result["mBelt"] == pytest.approx(1.9413716694115406)
    assert result["Fe"] == pytest.approx(86.0979424307709)
    assert result["accelerationTorqueNm"] == pytest.approx(0.14360594176313857)
    assert result["startupTorqueNm"] == pytest.approx(2.296054502532411)
    assert result["Preq"] == pytest.approx(45.08292473373494)
    assert result["margin"] == pytest.approx(99.63212354023301)
    assert result["inertiaConfirmed"] is False
    assert len(result["comparison"]) == 6


def test_conveyor_downhill_requires_braking_and_invalid_inputs_are_rejected() -> None:
    payload = {
        "load": 20, "angle": -30, "pmotor": 90, "rpm": 1500,
        "ratio": 30, "pulley": 50, "center": 1000, "width": 300,
        "support": "slider", "pitch": 200, "sf": 3, "eff": 0.8,
        "cmu": 0.2, "accelTime": 0.5, "equivalentInertia": 0.001,
    }
    result = client.post("/api/conveyor", headers=AUTH, json=payload).json()
    assert result["operatingMode"] == "braking"
    assert result["backdriveRisk"] is True
    assert result["Preq"] > 0
    for field, value in (("rpm", 0), ("load", -1), ("ratio", 0)):
        invalid = {**payload, field: value}
        assert client.post("/api/conveyor", headers=AUTH, json=invalid).status_code == 422


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


def test_eccentric_emergency_stop_checks_motor_and_harmonic_average_load() -> None:
    payload = {**ECCENTRIC_DEFAULT, "estop": True, "te": 0.03, "ta": 0.1, "td": 0.1,
               "gmk": "CSF-2UH", "gsz": 20, "grt": 80}
    response = client.post("/api/eccentric", headers=AUTH, json=payload)
    assert response.status_code == 200
    result = response.json()
    items = {item["k"]: item for item in result["items"]}
    assert "Minst" in items
    assert items["Minst"]["need"] == pytest.approx(result["est"]["M"])
    assert items["Minst"]["req"] == pytest.approx(result["est"]["M"] * payload["sf"])
    assert items["Grms"]["det"]["f"].startswith("T_av = ∛")


def test_eccentric_catalog_does_not_bulk_export_torque_tables() -> None:
    response = client.get("/api/eccentric/catalog", headers=AUTH)
    assert response.status_code == 200
    catalog = response.json()
    assert {"motors", "gearOptions"}.issubset(catalog)
    assert "adminDefaults" in catalog
    assert "adminThresholds" in catalog
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


def test_smc_selection_and_catalog_are_public() -> None:
    assert client.get("/api/smc-cylinder/catalog").status_code == 200
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
    assert result["theoreticalOutput"]["series"] == "CM2"


def test_smc_cj2_theoretical_output_contains_newton_and_kgf() -> None:
    response = client.post(
        "/api/smc-cylinder",
        headers=AUTH,
        json={
            "motion": "linear",
            "space": "normal",
            "size": "small",
            "env": "normal",
            "norot": "n",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["primary"]["code"] == "CJ2"
    output = result["theoreticalOutput"]
    assert output["defaultBoreMm"] == 10
    guidance = output["selectionGuidance"]
    assert guidance["dynamicLoadRatio"] == 0.5
    assert guidance["stationaryLoadRatio"] == 0.7
    assert guidance["sourceUrl"].endswith("AirCylinder-Select-Tech_en.pdf")
    assert [row["boreMm"] for row in output["bores"]] == [6, 10, 16]
    bore_10 = next(row for row in output["bores"] if row["boreMm"] == 10)
    assert round(bore_10["push"][2]["newton"], 1) == 39.3
    assert round(bore_10["push"][2]["kgf"], 2) == 4.00
    assert round(bore_10["pull"][2]["newton"], 1) == 33.0
    assert round(bore_10["pull"][2]["kgf"], 2) == 3.36


def test_smc_rotary_result_does_not_claim_linear_force_table() -> None:
    response = client.post(
        "/api/smc-cylinder",
        headers=AUTH,
        json={"motion": "rotary", "angle": "fixed", "env": "normal"},
    )
    assert response.status_code == 200
    assert response.json()["theoreticalOutput"] is None


def test_smc_cxsj_uses_official_dual_piston_areas() -> None:
    response = client.post(
        "/api/smc-cylinder",
        headers=AUTH,
        json={"motion": "linear", "space": "tight", "size": "small", "norot": "y", "env": "normal"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["primary"]["code"] == "CXSJ"
    output = result["theoreticalOutput"]
    assert output["forceStructure"] == "dual-piston"
    assert output["catalogSourceUrl"].endswith("7-4-2-p0807-0867-CXSJ_en.pdf")
    bore_15 = next(row for row in output["bores"] if row["boreMm"] == 15)
    assert bore_15["rodMm"] == 8
    assert bore_15["pushAreaMm2"] == 353
    assert bore_15["pullAreaMm2"] == 252
    assert round(bore_15["push"][2]["newton"], 1) == 176.5
    assert round(bore_15["pull"][2]["newton"], 1) == 126.0


def test_smc_table_cylinders_use_series_specific_force_profiles() -> None:
    cases = [
        ({"motion": "table", "env": "normal"}, "MXQ", "dual-piston", 16, 402, 346),
        ({"motion": "table", "space": "tight", "env": "normal"}, "MXH", "single-piston", 16, 201, 172),
        ({"motion": "table", "size": "small", "env": "normal"}, "MXJ", "single-piston", 4.5, 16, 13),
    ]
    for payload, code, structure, bore_mm, push_area, pull_area in cases:
        response = client.post("/api/smc-cylinder", headers=AUTH, json=payload)
        assert response.status_code == 200
        result = response.json()
        assert result["primary"]["code"] == code
        output = result["theoreticalOutput"]
        assert output["forceStructure"] == structure
        bore = next(row for row in output["bores"] if row["boreMm"] == bore_mm)
        assert bore["pushAreaMm2"] == push_area
        assert bore["pullAreaMm2"] == pull_area
    mxh = client.post(
        "/api/smc-cylinder", headers=AUTH,
        json={"motion": "table", "space": "tight", "env": "normal"},
    ).json()["theoreticalOutput"]
    bore_25 = next(row for row in mxh["bores"] if row["boreMm"] == 25)
    assert (bore_25["pushAreaMm2"], bore_25["pullAreaMm2"]) == (491, 412)


def test_smc_range_labels_expand_only_to_real_catalog_bores() -> None:
    response = client.post(
        "/api/smc-cylinder", headers=AUTH,
        json={"motion": "guided", "env": "normal"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["primary"]["code"] == "MGP"
    assert [row["boreMm"] for row in result["theoreticalOutput"]["bores"]] == [
        12, 16, 20, 25, 32, 40, 50, 63, 80, 100,
    ]


def test_smc_rodless_cylinders_show_equal_directional_force() -> None:
    cases = [
        ({"motion": "table", "stroke": "long", "env": "normal"}, "MXY", 8, 50),
        ({"motion": "long", "env": "normal"}, "MY1", 32, 804),
        ({"motion": "long", "seal": "y", "env": "normal"}, "CY3B", 25, 490),
    ]
    for payload, code, bore_mm, area_mm2 in cases:
        response = client.post("/api/smc-cylinder", headers=AUTH, json=payload)
        assert response.status_code == 200
        result = response.json()
        assert result["primary"]["code"] == code
        output = result["theoreticalOutput"]
        assert output["forceStructure"] == "rodless"
        bore = next(row for row in output["bores"] if row["boreMm"] == bore_mm)
        assert bore["rodMm"] == 0
        assert bore["pushAreaMm2"] == area_mm2
        assert bore["pullAreaMm2"] == area_mm2
        assert bore["push"] == bore["pull"]


def test_smc_clean_rodless_respects_its_lower_pressure_limit() -> None:
    response = client.post(
        "/api/smc-cylinder", headers=AUTH,
        json={"motion": "long", "seal": "y", "env": "clean"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["primary"]["code"] == "CYP"
    output = result["theoreticalOutput"]
    assert output["pressuresMpa"] == [0.1, 0.2, 0.3]
    assert output["referencePressureMpa"] == 0.3
    assert [row["boreMm"] for row in output["bores"]] == [15, 32]
    bore_15 = output["bores"][0]
    assert bore_15["pushAreaMm2"] == 176
    assert round(bore_15["push"][2]["newton"], 1) == 52.8


def test_all_calculation_routes_are_available_to_guests() -> None:
    assert client.post("/api/conveyor", json={}).status_code == 200
    assert client.post("/api/eccentric", json=ECCENTRIC_DEFAULT).status_code == 200
    assert client.post("/api/smc-cylinder", json={}).status_code == 200
