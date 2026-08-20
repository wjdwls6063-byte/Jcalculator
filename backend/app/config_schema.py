from __future__ import annotations

import copy
import json
import math
from typing import Any


TOOL_IDS = (
    "conveyor",
    "ballscrew-horizontal",
    "ballscrew-vertical",
    "eccentric",
    "smc-cylinder",
    "sensor",
)


DEFAULT_CONFIG: dict[str, Any] = {
    "schemaVersion": 1,
    "common": {
        "passMargin": 1.30,
        "warningMargin": 1.10,
        "defaultSafetyFactor": 2.00,
        "decimalPlaces": 3,
        "showFormula": True,
    },
    "tools": {
        "conveyor": {
            "label": "벨트 컨베이어",
            "defaults": {
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
                "sf": 3.0,
                "eff": 0.8,
                "cmu": 0.2,
                "accelTime": 0.5,
                "equivalentInertia": 0,
            },
            "thresholds": {"passMarginPct": 30, "warningMarginPct": 0},
        },
        "ballscrew-horizontal": {
            "label": "수평 볼스크류",
            "defaults": {
                "massKg": 80,
                "maxSpeedMmS": 250,
                "accelTimeS": 0.2,
                "emergencyStopTimeS": 0.15,
                "serviceFactor": 1.8,
                "safetyGoal": "safe",
            },
            "thresholds": {"autoSelectMargin": 0.30},
        },
        "ballscrew-vertical": {
            "label": "수직 볼스크류",
            "defaults": {
                "massKg": 80,
                "maxSpeedMmS": 250,
                "accelTimeS": 0.2,
                "emergencyStopTimeS": 0.15,
                "brakeSafetyFactor": 2.0,
                "serviceFactor": 1.8,
                "safetyGoal": "safe",
            },
            "thresholds": {"autoSelectMargin": 0.30},
        },
        "eccentric": {
            "label": "편심 회전축",
            "defaults": {"sf": 1.5, "ta": 1.5, "te": 0.1},
            "thresholds": {"passMargin": 0.30},
        },
        "smc-cylinder": {
            "label": "SMC 실린더",
            "defaults": {
                "safetyFactor": 1.5,
                "supplyPressureMpa": 0.5,
                "accelTimeS": 0.5,
            },
            "thresholds": {},
        },
        "sensor": {
            "label": "센서 선정",
            "defaults": {"nonMagneticRatio": 0.30},
            "thresholds": {},
        },
    },
    "content": {
        "homeTitle": "설계할 기구를 선택하세요",
        "homeDescription": "모터·감속기·기구 부품을 선정하고, 구동 가능 여부와 안전 여유를 한 번에 검증합니다.",
        "footerNotice": "설계 검증용 참고 도구이며 최종 설계 책임은 설계자에게 있습니다.",
    },
    "catalogOverrides": {
        "smc-cylinder": [],
        "sensor": [],
        "servo-motor": [],
        "reducer": [],
    },
}


LOCKED_CONSTANTS = {
    "gravityMps2": 9.80665,
    "pi": math.pi,
    "newtonPerKgf": 9.80665,
}


def default_config() -> dict[str, Any]:
    return copy.deepcopy(DEFAULT_CONFIG)


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def _check_tree(value: Any, path: str = "config") -> None:
    if isinstance(value, dict):
        if len(value) > 1000:
            raise ValueError(f"{path} 항목이 너무 많습니다.")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 120:
                raise ValueError(f"{path} 키 형식이 올바르지 않습니다.")
            _check_tree(item, f"{path}.{key}")
    elif isinstance(value, list):
        if len(value) > 5000:
            raise ValueError(f"{path} 목록이 너무 깁니다.")
        for index, item in enumerate(value):
            _check_tree(item, f"{path}[{index}]")
    elif isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{path} 값은 유한한 숫자여야 합니다.")
    elif isinstance(value, str) and len(value) > 50_000:
        raise ValueError(f"{path} 문자열이 너무 깁니다.")
    elif value is not None and not isinstance(value, (str, int, float, bool)):
        raise ValueError(f"{path} 값 형식이 올바르지 않습니다.")


def validate_config(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("설정은 JSON 객체여야 합니다.")
    _check_tree(value)
    merged = deep_merge(DEFAULT_CONFIG, value)
    if merged.get("schemaVersion") != 1:
        raise ValueError("지원하지 않는 설정 스키마 버전입니다.")

    common = merged["common"]
    pass_margin = float(common["passMargin"])
    warning_margin = float(common["warningMargin"])
    safety_factor = float(common["defaultSafetyFactor"])
    decimals = int(common["decimalPlaces"])
    if not 1 <= warning_margin <= pass_margin <= 10:
        raise ValueError("공통 여유율은 1 이상이며 주의 경계가 통과 경계보다 클 수 없습니다.")
    if not 1 <= safety_factor <= 20:
        raise ValueError("기본 안전율은 1~20 범위여야 합니다.")
    if decimals not in range(0, 7):
        raise ValueError("소수점 자릿수는 0~6 범위여야 합니다.")
    common["passMargin"] = pass_margin
    common["warningMargin"] = warning_margin
    common["defaultSafetyFactor"] = safety_factor
    common["decimalPlaces"] = decimals
    common["showFormula"] = bool(common["showFormula"])

    tools = merged.get("tools")
    if not isinstance(tools, dict):
        raise ValueError("도구별 설정 형식이 올바르지 않습니다.")
    for tool_id in TOOL_IDS:
        tool = tools.get(tool_id)
        if not isinstance(tool, dict):
            raise ValueError(f"{tool_id} 설정이 없습니다.")
        if not isinstance(tool.get("defaults"), dict) or not isinstance(tool.get("thresholds"), dict):
            raise ValueError(f"{tool_id} 기본값 또는 판정값 형식이 올바르지 않습니다.")

    def number(path: str, minimum: float, maximum: float, *, strict_minimum: bool = False) -> float:
        target: Any = merged
        parts = path.split(".")
        for part in parts[:-1]:
            target = target[part]
        raw = target[parts[-1]]
        if isinstance(raw, bool):
            raise ValueError(f"{path} 값은 숫자여야 합니다.")
        try:
            parsed = float(raw)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{path} 값은 숫자여야 합니다.") from error
        if not math.isfinite(parsed) or parsed > maximum or (parsed <= minimum if strict_minimum else parsed < minimum):
            boundary = "초과" if strict_minimum else "이상"
            raise ValueError(f"{path} 값은 {minimum} {boundary} {maximum} 이하여야 합니다.")
        target[parts[-1]] = parsed
        return parsed

    positive_conveyor = ("load", "pmotor", "rpm", "ratio", "pulley", "center", "width", "pitch", "sf", "accelTime")
    for key in positive_conveyor:
        number(f"tools.conveyor.defaults.{key}", 0, 1_000_000_000, strict_minimum=True)
    number("tools.conveyor.defaults.angle", -90, 90)
    number("tools.conveyor.defaults.eff", 0, 1, strict_minimum=True)
    number("tools.conveyor.defaults.cmu", 0, 1, strict_minimum=True)
    number("tools.conveyor.defaults.equivalentInertia", 0, 1_000_000_000)
    number("tools.conveyor.thresholds.passMarginPct", 0, 1000)
    number("tools.conveyor.thresholds.warningMarginPct", 0, 1000)
    if merged["tools"]["conveyor"]["defaults"]["support"] not in {"slider", "uhmw", "hybrid", "roller", "bearing", "custom"}:
        raise ValueError("컨베이어 지지방식이 올바르지 않습니다.")

    for tool_id in ("ballscrew-horizontal", "ballscrew-vertical"):
        for key in ("massKg", "maxSpeedMmS", "accelTimeS", "emergencyStopTimeS"):
            number(f"tools.{tool_id}.defaults.{key}", 0, 1_000_000_000, strict_minimum=True)
        number(f"tools.{tool_id}.defaults.serviceFactor", 1, 20)
        if tool_id == "ballscrew-vertical":
            number(f"tools.{tool_id}.defaults.brakeSafetyFactor", 1, 20)
        number(f"tools.{tool_id}.thresholds.autoSelectMargin", 0, 10)
        if merged["tools"][tool_id]["defaults"]["safetyGoal"] not in {"standard", "safe", "extra"}:
            raise ValueError(f"{tool_id} 안전 목표가 올바르지 않습니다.")

    number("tools.eccentric.defaults.sf", 0, 20, strict_minimum=True)
    number("tools.eccentric.defaults.ta", 0, 3600, strict_minimum=True)
    number("tools.eccentric.defaults.te", 0, 3600, strict_minimum=True)
    number("tools.eccentric.thresholds.passMargin", 0, 10)
    number("tools.smc-cylinder.defaults.safetyFactor", 1, 20)
    number("tools.smc-cylinder.defaults.supplyPressureMpa", 0, 1, strict_minimum=True)
    number("tools.smc-cylinder.defaults.accelTimeS", 0, 3600, strict_minimum=True)
    number("tools.sensor.defaults.nonMagneticRatio", 0, 1, strict_minimum=True)

    catalogs = merged.get("catalogOverrides")
    if not isinstance(catalogs, dict):
        raise ValueError("카탈로그 검토 목록 형식이 올바르지 않습니다.")
    for catalog_id in ("smc-cylinder", "sensor", "servo-motor", "reducer"):
        items = catalogs.get(catalog_id)
        if not isinstance(items, list):
            raise ValueError(f"{catalog_id} 카탈로그 검토 목록이 올바르지 않습니다.")
        for item in items:
            if not isinstance(item, dict):
                raise ValueError(f"{catalog_id} 카탈로그 항목이 올바르지 않습니다.")
            for field in ("maker", "model", "spec", "sourceUrl", "verifiedAt"):
                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(f"{catalog_id} 카탈로그의 {field} 값이 필요합니다.")
            if not item["sourceUrl"].startswith(("https://", "http://")):
                raise ValueError(f"{catalog_id} 카탈로그 출처는 HTTP(S) URL이어야 합니다.")
            if "enabled" in item and not isinstance(item["enabled"], bool):
                raise ValueError(f"{catalog_id} 카탈로그 상태값이 올바르지 않습니다.")

    encoded = json.dumps(merged, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > 2_000_000:
        raise ValueError("설정 전체 크기는 2MB를 넘을 수 없습니다.")
    return merged


def public_config(config: dict[str, Any], version: int, updated_at: str) -> dict[str, Any]:
    return {
        "schemaVersion": config["schemaVersion"],
        "version": version,
        "updatedAt": updated_at,
        "lockedConstants": LOCKED_CONSTANTS,
        "common": copy.deepcopy(config["common"]),
        "tools": copy.deepcopy(config["tools"]),
        "content": copy.deepcopy(config["content"]),
        "catalogOverrides": copy.deepcopy(config["catalogOverrides"]),
    }
