from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pytest

from app.engines.ballscrew import calculate, json_safe


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "ballscrew_original.json"
DRIVE_FIELDS = [
    "actualPeakSpeedMmS", "accelerationMS2", "screwRpm", "motorRpm",
    "runningForceN", "accelerationForceN", "gravityForceN",
    "counterbalanceForceN", "unbalancedForceN", "designThrustN",
    "outputSteadyTorqueNm", "outputPeakTorqueNm", "motorPeakTorqueNm",
    "motorRmsTorqueNm", "upwardSteadyMotorTorqueNm",
    "downwardSteadyMotorTorqueNm", "holdingMotorTorqueNm",
    "emergencyPeakTorqueNm", "brakeRequiredTorqueNm", "brakeSafety",
    "unbalancedTorqueRatio", "regenerativeEnergyJ", "motorInertiaKgm2",
    "linearInertiaKgm2", "screwInertiaKgm2", "reflectedInertiaKgm2",
    "inertiaRatio", "inertiaRatioLimit", "dnValue", "criticalRpm",
    "bucklingLoadN", "bucklingSafety", "screwStaticSafety", "screwLifeKm",
]
GUIDE_FIELDS = [
    "movingMassKg", "blockCount", "loadFactor", "maxBlockLoadN",
    "minBlockReactionN", "staticSafety", "momentSafety", "lifeKm",
    "lifeHours", "requiredRailMm", "installWidthMm", "reactionsN", "momentsNm",
]


def _pick(source: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    return {field: source[field] for field in fields}


def _summary(result: dict[str, Any]) -> dict[str, Any]:
    selected = result["selected"]
    drive = selected["drive"]
    guide = selected["guideEval"]
    return {
        "motor": result["motor"]["id"],
        "ratio": result["ratio"],
        "ratioAdjusted": result["ratioAdjusted"],
        "combinations": [
            {
                "screw": item["drive"]["screw"]["id"],
                "guide": item["guideEval"]["guide"]["id"],
                "gear": item["drive"]["gear"]["gear"]["size"] if item["drive"]["gear"] else None,
                "coupling": item["coupling"],
                "support": item["support"],
                "pass": item["pass"],
                "status": item["status"],
                "score": item["score"],
            }
            for item in result["combinations"]
        ],
        "selected": {
            "screw": drive["screw"]["id"],
            "guide": guide["guide"]["id"],
            "gear": drive["gear"]["gear"]["size"] if drive["gear"] else None,
            "coupling": selected["coupling"],
            "support": selected["support"],
            "pass": selected["pass"],
            "status": selected["status"],
            "score": selected["score"],
            "drivePass": {
                "motor": drive["passMotor"],
                "screw": drive["passScrew"],
                "gear": drive["passGear"],
                "flagCount": len(drive["flags"]),
            },
            "guidePass": {
                "pass": guide["pass"],
                "flagCount": len(guide["flags"]),
            },
            "drive": _pick(drive, DRIVE_FIELDS),
            "guideEval": _pick(guide, GUIDE_FIELDS),
        },
    }


def _assert_equivalent(actual: Any, expected: Any, path: str = "root") -> None:
    if isinstance(expected, dict):
        assert set(actual) == set(expected), path
        for key in expected:
            _assert_equivalent(actual[key], expected[key], f"{path}.{key}")
        return
    if isinstance(expected, list):
        assert len(actual) == len(expected), path
        for index, (actual_item, expected_item) in enumerate(zip(actual, expected, strict=True)):
            _assert_equivalent(actual_item, expected_item, f"{path}[{index}]")
        return
    if isinstance(expected, (int, float)) and not isinstance(expected, bool):
        assert math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12), path
        return
    assert actual == expected, path


FIXTURES = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize("fixture", FIXTURES, ids=lambda item: item["name"])
def test_corrected_engine_preserves_catalog_selection_and_safe_invariants(fixture: dict[str, Any]) -> None:
    result = calculate(fixture["inputs"])
    selected = result["selected"]
    drive = selected["drive"]
    expected = fixture["expected"]["selected"]

    assert drive["screw"]["id"] == expected["screw"]
    assert selected["guideEval"]["guide"]["id"] == expected["guide"]
    assert selected["coupling"] == expected["coupling"]
    assert selected["support"] == expected["support"]
    assert drive["outputPeakTorqueNm"] >= abs(drive["outputSteadyTorqueNm"])
    assert drive["outputEmergencyTorqueNm"] >= 0
    assert drive["motorPeakTorqueNm"] >= drive["emergencyPeakTorqueNm"]
    assert drive["couplingTorqueNeedNm"] == pytest.approx(
        max(drive["outputPeakTorqueNm"], drive["outputEmergencyTorqueNm"])
    )
    assert drive["passCoupling"] == (
        drive["couplingTorqueNeedNm"] <= drive["couplingTorqueAllowNm"]
        and drive["screwRpm"] <= drive["couplingSpeedAllowRpm"]
    )
    assert selected["pass"] == (
        selected["guideEval"]["pass"]
        and drive["passMotor"]
        and drive["passScrew"]
        and drive["passGear"]
        and drive["passCoupling"]
    )
    numeric_values = [
        drive["outputPeakTorqueNm"], drive["outputEmergencyTorqueNm"],
        drive["translationalAccelerationTorqueNm"], drive["rotationalAccelerationTorqueNm"],
        drive["motorPeakTorqueNm"], drive["motorRmsTorqueNm"], drive["designThrustN"],
    ]
    assert all(math.isfinite(value) and value >= 0 for value in numeric_values)


def test_coupling_limit_can_fail_the_whole_combination() -> None:
    inputs = {**FIXTURES[0]["inputs"], "massKg": 2_000}
    selected = calculate(inputs)["selected"]
    drive = selected["drive"]
    assert drive["couplingTorqueNeedNm"] > drive["couplingTorqueAllowNm"]
    assert drive["passCoupling"] is False
    assert selected["pass"] is False
    assert "커플링 허용·슬립 토크 부족" in selected["notes"]
