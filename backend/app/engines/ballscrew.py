from __future__ import annotations

import json
import math
from copy import deepcopy
from functools import cmp_to_key
from pathlib import Path
from typing import Any


CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "ballscrew_catalog.json"
with CATALOG_PATH.open(encoding="utf-8") as catalog_file:
    _RAW = json.load(catalog_file)

MOTORS = _RAW["u"]
RATIOS = _RAW["d"]
GEAR_SIZES = _RAW["f"]
GEAR_TORQUE_1_STAGE = _RAW["p"]
GEAR_TORQUE_2_STAGE = _RAW["m"]
SCREW_SERIES = _RAW["g"]
SCREWS = _RAW["v"]
GUIDE_SERIES = _RAW["y"]
GUIDES = _RAW["x"]
SERVICE_FACTORS = _RAW["ee"]
HORIZONTAL_DEFAULTS = _RAW["C"]
VERTICAL_DEFAULTS = _RAW["w"]
SAFETY_GOALS = _RAW["te"]

GRAVITY = _RAW["T"]
SCREW_EFFICIENCY = _RAW["E"]
ROLLING_RESISTANCE = _RAW["D"]
STEEL_DENSITY = _RAW["ne"]
STEEL_ELASTIC_MODULUS = _RAW["O"]


def _positive(value: float, fallback: float = 1e-6) -> float:
    return value if math.isfinite(value) and value > 0 else fallback


def _js_round(value: float) -> int:
    return math.floor(value + 0.5)


def _series_for_screw(model_id: str) -> str:
    if model_id.startswith("BNK") and "K-" in model_id:
        return "BNK-K"
    if model_id.startswith("BNK"):
        return "BNK"
    if model_id.startswith("BIF"):
        return "BIF-V"
    if model_id.startswith("SDA"):
        return "SDA-VZ"
    if model_id.startswith("MDK"):
        return "MDK"
    if model_id.startswith("WGF"):
        return "WGF"
    if model_id.startswith("BLK"):
        return "BLK"
    if model_id.startswith("BTK"):
        return "BTK-V"
    if model_id.startswith("BNT"):
        return "BNT"
    return "SBN-V"


def _series_for_guide(model_id: str) -> str:
    if model_id.startswith("HSR"):
        return "HSR"
    if model_id.startswith("SHS"):
        return "SHS"
    if model_id.startswith("SSR"):
        return "SSR"
    if model_id.startswith("SRS"):
        return "SRS"
    if model_id.startswith("SR"):
        return "SR"
    return "RSX"


def _nearest_ratio(requested: float) -> int:
    target = _positive(requested, 1)
    if target <= 1:
        return 1
    return min(RATIOS, key=lambda ratio: abs(ratio - target))


def _positions(count: float, spacing_mm: float) -> list[float]:
    bounded = max(1, min(4, _js_round(count)))
    if bounded == 1:
        return [0.0]
    spacing_m = max(0.0, spacing_mm) / 1000
    return [
        -spacing_m / 2 + spacing_m * index / (bounded - 1)
        for index in range(bounded)
    ]


def _load_factor(speed_mm_s: float, shock: str) -> float:
    speed_factor = 1.2 if speed_mm_s <= 250 else 1.5 if speed_mm_s <= 1000 else 2 if speed_mm_s <= 2000 else 3.5
    shock_factor = {"low": 1, "normal": 1.5, "high": 2}.get(shock, 3.5)
    return max(speed_factor, shock_factor)


def _motion_profile(inputs: dict[str, Any]) -> dict[str, float]:
    speed = _positive(inputs["maxSpeedMmS"]) / 1000
    stroke = _positive(inputs["strokeMm"]) / 1000
    acceleration = speed / _positive(inputs["accelTimeS"], 0.1)
    peak_speed = min(speed, math.sqrt(stroke * acceleration))
    accel_time = peak_speed / acceleration
    constant_distance = max(0.0, stroke - peak_speed * accel_time)
    return {
        "peakV": peak_speed,
        "acceleration": acceleration,
        "accelTime": accel_time,
        "constantTime": constant_distance / peak_speed if peak_speed > 0 else 0.0,
    }


def _evaluate_vertical_guide(inputs: dict[str, Any], guide: dict[str, Any]) -> dict[str, Any]:
    rail_count = max(1, min(4, _js_round(inputs["railCount"])))
    blocks_per_rail = max(1, min(4, _js_round(inputs["blocksPerRail"])))
    block_count = rail_count * blocks_per_rail
    moving_mass = max(0.0, inputs["massKg"]) + guide["blockMassKg"] * block_count
    rail_positions = _positions(rail_count, inputs["railSpacingMm"])
    block_positions = _positions(blocks_per_rail, inputs["blockSpacingMm"])
    points = [{"x": x, "z": z} for x in rail_positions for z in block_positions]
    sum_x2 = sum(point["x"] ** 2 for point in points)
    sum_z2 = sum(point["z"] ** 2 for point in points)
    weight = moving_mass * GRAVITY
    cog_x = inputs["cogXmm"] / 1000
    cog_y = inputs["cogYmm"] / 1000
    screw_y = inputs["screwYmm"] / 1000
    screw_z = inputs["screwZmm"] / 1000
    acceleration = _motion_profile(inputs)["acceleration"]
    design_thrust = (
        abs(weight - max(0.0, inputs["counterbalanceForceN"]))
        + max(0.0, inputs["externalResistanceN"])
        + max(0.0, inputs["verticalProcessForceN"])
        + moving_mass * acceleration
    ) * max(1.0, inputs["serviceFactor"])
    pitch_moment = -weight * cog_y + design_thrust * screw_z
    yaw_moment = weight * cog_x - design_thrust * screw_y
    roll_moment = (
        inputs["externalPointXmm"] * inputs["externalFyN"]
        - inputs["externalPointYmm"] * inputs["externalFxN"]
    ) / 1000
    direct_x = abs(inputs["externalFxN"]) / block_count
    direct_y = abs(inputs["externalFyN"]) / block_count
    reactions = []
    for point in points:
        pitch_load = abs(pitch_moment * point["z"] / sum_z2) if sum_z2 > 1e-12 else 0.0
        yaw_load = abs(yaw_moment * point["z"] / sum_z2) if sum_z2 > 1e-12 else 0.0
        roll_load = abs(roll_moment * point["x"] / sum_x2) if sum_x2 > 1e-12 else 0.0
        reactions.append(max(1.0, direct_x + direct_y + pitch_load + yaw_load + roll_load))
    max_load = max([*reactions, 1.0])
    min_reaction = min(reactions)
    direct_static = guide["c0Kn"] * 1000 / max_load
    ma_safety = math.inf if sum_z2 > 1e-12 or abs(pitch_moment) < 1e-9 else guide["maNm"] * block_count / abs(pitch_moment)
    mb_safety = math.inf if sum_z2 > 1e-12 or abs(yaw_moment) < 1e-9 else guide["mbNm"] * block_count / abs(yaw_moment)
    mc_safety = math.inf if sum_x2 > 1e-12 or abs(roll_moment) < 1e-9 else guide["mcNm"] * block_count / abs(roll_moment)
    moment_safety = min(ma_safety, mb_safety, mc_safety)
    static_safety = min(direct_static, moment_safety)
    load_factor = _load_factor(inputs["maxSpeedMmS"], inputs["shock"])
    life_km = 50 * (guide["cKn"] * 1000 / (max_load * load_factor)) ** 3
    travel_km_per_hour = 2 * max(0.0, inputs["strokeMm"]) * max(0.0, inputs["cyclesPerMin"]) * 60 / 1e6
    life_hours = life_km / travel_km_per_hour if travel_km_per_hour > 0 else math.inf
    required_rail = max(0.0, inputs["strokeMm"]) + (max(0.0, inputs["blockSpacingMm"]) if blocks_per_rail > 1 else 0.0) + guide["lengthMm"] + 100
    install_width = (max(0.0, inputs["railSpacingMm"]) if rail_count > 1 else 0.0) + guide["widthMm"]
    goal = SAFETY_GOALS[inputs["safetyGoal"]]
    flags: list[str] = []
    if static_safety < goal["staticSafety"]:
        flags.append(f"정적안전율 {static_safety:.1f} < 목표 {goal['staticSafety']}")
    if life_hours < inputs["targetLifeHours"] * goal["lifeFactor"]:
        flags.append("목표 수명 여유 부족")
    if required_rail > guide["maxRailMm"]:
        flags.append("카탈로그 최대 레일 길이 초과")
    if install_width > inputs["tableWidthMm"]:
        flags.append("테이블 폭 안에 레일 배치 불가")
    if rail_count == 1 and abs(pitch_moment) + abs(yaw_moment) + abs(roll_moment) > 1:
        flags.append("수직 1열 레일은 CG 편심 모멘트에 불리함")
    if guide["family"] != "four-way" and (abs(inputs["externalFxN"]) + abs(inputs["externalFyN"]) > 1 or abs(cog_y) > 0.001):
        flags.append("수직·면외 하중에는 4방향 등하중형 우선 권장")
    return {
        "guide": guide,
        "movingMassKg": moving_mass,
        "blockCount": block_count,
        "loadFactor": load_factor,
        "maxBlockLoadN": max_load,
        "minBlockReactionN": min_reaction,
        "staticSafety": static_safety,
        "momentSafety": moment_safety,
        "lifeKm": life_km,
        "lifeHours": life_hours,
        "requiredRailMm": required_rail,
        "installWidthMm": install_width,
        "pass": not flags,
        "flags": flags,
        "reactionsN": reactions,
        "momentsNm": {"roll": roll_moment, "pitch": pitch_moment, "yaw": yaw_moment},
    }


def _evaluate_horizontal_guide(inputs: dict[str, Any], guide: dict[str, Any]) -> dict[str, Any]:
    rail_count = max(1, min(4, _js_round(inputs["railCount"])))
    blocks_per_rail = max(1, min(4, _js_round(inputs["blocksPerRail"])))
    block_count = rail_count * blocks_per_rail
    moving_mass = max(0.0, inputs["massKg"]) + guide["blockMassKg"] * block_count
    block_positions = _positions(blocks_per_rail, inputs["blockSpacingMm"])
    points = [
        {"x": x, "y": y}
        for y in _positions(rail_count, inputs["railSpacingMm"])
        for x in block_positions
    ]
    sum_x2 = sum(point["x"] ** 2 for point in points)
    sum_y2 = sum(point["y"] ** 2 for point in points)
    weight = moving_mass * GRAVITY
    vertical_force = max(1.0, weight + inputs["externalFzN"])
    acceleration = _motion_profile(inputs)["acceleration"]
    drive_force = (
        max(0.0, inputs["externalResistanceN"])
        + ROLLING_RESISTANCE * weight
        + abs(inputs["externalFxN"])
        + moving_mass * acceleration
    ) * max(1.0, inputs["serviceFactor"])
    cog_x = inputs["cogXmm"] / 1000
    cog_y = inputs["cogYmm"] / 1000
    cog_z = inputs["cogZmm"] / 1000
    screw_y = inputs["screwYmm"] / 1000
    screw_z = inputs["screwZmm"] / 1000
    ext_x = inputs["externalPointXmm"] / 1000
    ext_y = inputs["externalPointYmm"] / 1000
    ext_z = inputs["externalPointZmm"] / 1000
    ext_fx = inputs["externalFxN"]
    ext_fy = inputs["externalFyN"]
    ext_fz_down = -inputs["externalFzN"]
    roll_moment = -weight * cog_y + (ext_y * ext_fz_down - ext_z * ext_fy)
    pitch_moment = weight * cog_x + (screw_z - cog_z) * drive_force + (ext_z * ext_fx - ext_x * ext_fz_down)
    yaw_moment = -(screw_y - cog_y) * drive_force + (ext_x * ext_fy - ext_y * ext_fx)
    vector_reactions = []
    for point in points:
        base = vertical_force / block_count
        pitch_load = pitch_moment * point["x"] / sum_x2 if sum_x2 > 1e-12 else 0.0
        roll_load = roll_moment * point["y"] / sum_y2 if sum_y2 > 1e-12 else 0.0
        yaw_load = yaw_moment * point["x"] / sum_x2 if sum_x2 > 1e-12 else 0.0
        vector_reactions.append({"vertical": base + pitch_load + roll_load, "lateral": inputs["externalFyN"] / block_count + yaw_load})
    equivalent_reactions = [abs(item["vertical"]) + abs(item["lateral"]) for item in vector_reactions]
    max_load = max([*equivalent_reactions, 1.0])
    min_reaction = min(item["vertical"] for item in vector_reactions)
    direct_static = guide["c0Kn"] * 1000 / max_load
    ma_safety = math.inf if sum_x2 > 1e-12 or abs(pitch_moment) < 1e-9 else guide["maNm"] * block_count / abs(pitch_moment)
    mb_safety = math.inf if sum_x2 > 1e-12 or abs(yaw_moment) < 1e-9 else guide["mbNm"] * block_count / abs(yaw_moment)
    mc_safety = math.inf if sum_y2 > 1e-12 or abs(roll_moment) < 1e-9 else guide["mcNm"] * block_count / abs(roll_moment)
    moment_safety = min(ma_safety, mb_safety, mc_safety)
    static_safety = min(direct_static, moment_safety)
    load_factor = _load_factor(inputs["maxSpeedMmS"], inputs["shock"])
    life_km = 50 * (guide["cKn"] * 1000 / (max_load * load_factor)) ** 3
    travel_km_per_hour = 2 * max(0.0, inputs["strokeMm"]) * max(0.0, inputs["cyclesPerMin"]) * 60 / 1e6
    life_hours = life_km / travel_km_per_hour if travel_km_per_hour > 0 else math.inf
    required_rail = max(0.0, inputs["strokeMm"]) + (max(0.0, inputs["blockSpacingMm"]) if blocks_per_rail > 1 else 0.0) + guide["lengthMm"] + 100
    install_width = (max(0.0, inputs["railSpacingMm"]) if rail_count > 1 else 0.0) + guide["widthMm"]
    goal = SAFETY_GOALS[inputs["safetyGoal"]]
    flags: list[str] = []
    if static_safety < goal["staticSafety"]:
        flags.append(f"정적안전율 {static_safety:.1f} < 목표 {goal['staticSafety']}")
    if life_hours < inputs["targetLifeHours"] * goal["lifeFactor"]:
        flags.append("목표 수명 여유 부족")
    if required_rail > guide["maxRailMm"]:
        flags.append("카탈로그 최대 레일 길이 초과")
    if install_width > inputs["tableWidthMm"]:
        flags.append("테이블 폭 안에 레일 배치 불가")
    tension = min_reaction < 0
    lateral_dominant = abs(inputs["externalFyN"]) > weight * 0.1 or abs(yaw_moment) > abs(pitch_moment) + abs(roll_moment)
    if guide["family"] == "radial" and (tension or lateral_dominant):
        flags.append("역방향·횡하중 조건에는 4방향 등하중형 우선 권장")
    if tension:
        flags.append("일부 블록에 인장(들림) 반력 발생")
    return {
        "guide": guide,
        "movingMassKg": moving_mass,
        "blockCount": block_count,
        "loadFactor": load_factor,
        "maxBlockLoadN": max_load,
        "minBlockReactionN": min_reaction,
        "staticSafety": static_safety,
        "momentSafety": moment_safety,
        "lifeKm": life_km,
        "lifeHours": life_hours,
        "requiredRailMm": required_rail,
        "installWidthMm": install_width,
        "pass": not flags,
        "flags": flags,
        "reactionsN": [item["vertical"] for item in vector_reactions],
        "momentsNm": {"roll": roll_moment, "pitch": pitch_moment, "yaw": yaw_moment},
    }


def _evaluate_guide(inputs: dict[str, Any], guide: dict[str, Any]) -> dict[str, Any]:
    if inputs["axisMode"] == "vertical":
        return _evaluate_vertical_guide(inputs, guide)
    return _evaluate_horizontal_guide(inputs, guide)


def _gear_rated_torque(size: int, ratio: int) -> float:
    index = next((index for index, gear in enumerate(GEAR_SIZES) if gear["size"] == size), -1)
    if index < 0:
        return 0.0
    if ratio <= 10:
        values = GEAR_TORQUE_1_STAGE.get(str(ratio), [])
        return values[index] if index < len(values) else 0.0
    if size == 44:
        return 0.0
    values = GEAR_TORQUE_2_STAGE.get(str(ratio), [])
    return values[index - 1] if index - 1 < len(values) else 0.0


def _gear_options(motor: dict[str, Any], ratio: int, motor_rpm: float, output_peak_torque: float) -> list[dict[str, Any]]:
    if ratio == 1:
        return []
    result = []
    for gear in GEAR_SIZES:
        rated_torque = _gear_rated_torque(gear["size"], ratio)
        needed_torque = output_peak_torque * 1.2
        torque_margin = rated_torque / needed_torque if rated_torque > 0 else 0.0
        speed_margin = gear["ratedInputRpm"] / max(1.0, motor_rpm)
        bore_compatible = motor["shaftMm"] in gear["bores"]
        ratio_compatible = rated_torque > 0 and not (ratio > 10 and gear["size"] == 44)
        torque_ok = rated_torque >= needed_torque
        speed_ok = motor_rpm <= gear["ratedInputRpm"]
        passed = bore_compatible and ratio_compatible and torque_ok and speed_ok
        reasons = []
        if not bore_compatible:
            reasons.append(f"입력축 φ{motor['shaftMm']} 옵션 없음")
        if not ratio_compatible:
            reasons.append(f"{ratio}:1 정번 없음")
        if ratio_compatible and not torque_ok:
            reasons.append("정격출력토크 부족")
        if not speed_ok:
            reasons.append("정격입력속도 초과")
        result.append({
            "gear": gear,
            "ratedTorqueNm": rated_torque,
            "torqueNeedNm": needed_torque,
            "torqueMargin": torque_margin,
            "speedMargin": speed_margin,
            "boreCompatible": bore_compatible,
            "ratioCompatible": ratio_compatible,
            "pass": passed,
            "reason": "치수·토크·속도 적합" if passed else " · ".join(reasons),
        })
    return result


def _evaluate_drive(inputs: dict[str, Any], screw: dict[str, Any], guide_eval: dict[str, Any], motor: dict[str, Any]) -> dict[str, Any]:
    ratio = _nearest_ratio(inputs["reducerRatio"])
    ratio_adjusted = abs(ratio - inputs["reducerRatio"]) > 1e-9
    gear_efficiency = 1 if ratio == 1 else 0.97 if ratio <= 10 else 0.94
    profile = _motion_profile(inputs)
    peak_speed = profile["peakV"]
    acceleration = profile["acceleration"]
    accel_time = profile["accelTime"]
    constant_time = profile["constantTime"]
    lead_m = screw["leadMm"] / 1000
    screw_rpm = peak_speed / lead_m * 60
    motor_rpm = screw_rpm * ratio
    vertical = inputs["axisMode"] == "vertical"
    gravity_force = guide_eval["movingMassKg"] * GRAVITY if vertical else 0.0
    counterbalance = max(0.0, inputs["counterbalanceForceN"]) if vertical else 0.0
    unbalanced = gravity_force - counterbalance if vertical else 0.0
    running_force = max(0.0, inputs["externalResistanceN"]) + ROLLING_RESISTANCE * guide_eval["movingMassKg"] * GRAVITY
    process_force = max(0.0, inputs["verticalProcessForceN"])
    upward_steady_force = unbalanced + running_force + process_force if vertical else running_force + abs(inputs["externalFxN"])
    downward_steady_force = unbalanced - running_force - process_force if vertical else upward_steady_force
    steady_force = abs(upward_steady_force)
    acceleration_force = guide_eval["movingMassKg"] * acceleration
    design_thrust = (
        abs(unbalanced) + running_force + max(0.0, inputs["verticalProcessForceN"]) + acceleration_force
        if vertical
        else steady_force + acceleration_force
    ) * max(1.0, inputs["serviceFactor"])
    root_m = screw["rootMm"] / 1000
    screw_length_m = max(inputs["screwLengthMm"], inputs["supportSpanMm"]) / 1000
    screw_inertia = 0.5 * (STEEL_DENSITY * math.pi * root_m ** 2 * screw_length_m / 4) * (root_m / 2) ** 2
    linear_inertia = guide_eval["movingMassKg"] * (lead_m / (2 * math.pi)) ** 2
    coupling_inertia = 2e-5 if screw["diameterMm"] <= 20 else 98e-6 if screw["diameterMm"] <= 32 else 18e-5
    load_inertia = linear_inertia + screw_inertia + coupling_inertia
    angular_acceleration = 2 * math.pi * acceleration / lead_m
    service_factor = max(1.0, inputs["serviceFactor"])
    force_to_torque = service_factor * lead_m / (2 * math.pi * SCREW_EFFICIENCY)
    output_steady_torque = abs(upward_steady_force) * force_to_torque
    downward_output_torque = downward_steady_force * force_to_torque
    translational_accel_torque = acceleration_force * force_to_torque
    rotating_load_inertia = screw_inertia + coupling_inertia
    rotational_accel_torque = rotating_load_inertia * angular_acceleration * service_factor
    load_accel_torque = translational_accel_torque + rotational_accel_torque
    upward_output_torque_signed = upward_steady_force * force_to_torque
    upward_accel_output_torque = upward_output_torque_signed + load_accel_torque
    upward_decel_output_torque = upward_output_torque_signed - load_accel_torque
    downward_accel_output_torque = downward_output_torque - load_accel_torque
    downward_decel_output_torque = downward_output_torque + load_accel_torque
    output_peak_torque = max(
        abs(upward_accel_output_torque), abs(upward_decel_output_torque),
        abs(downward_accel_output_torque), abs(downward_decel_output_torque),
    )
    stop_angular_acceleration = 2 * math.pi * peak_speed / max(0.03, inputs["emergencyStopTimeS"]) / lead_m
    stop_linear_acceleration = peak_speed / max(0.03, inputs["emergencyStopTimeS"])
    emergency_output_torque = (
        abs(downward_output_torque)
        + guide_eval["movingMassKg"] * stop_linear_acceleration * force_to_torque
        + rotating_load_inertia * stop_angular_acceleration * service_factor
    )
    gear_options = _gear_options(motor, ratio, motor_rpm, max(output_peak_torque, emergency_output_torque))
    gear_pin = _js_round(inputs.get("gearSizePin", 0) or 0)
    eligible_options = [option for option in gear_options if option["gear"]["size"] == gear_pin] if gear_pin else gear_options
    chosen_gear = next((option for option in eligible_options if option["pass"]), None)
    if chosen_gear is None:
        alternatives = sorted(
            (option for option in eligible_options if option["boreCompatible"] and option["ratioCompatible"]),
            key=lambda option: option["torqueMargin"],
            reverse=True,
        )
        chosen_gear = alternatives[0] if alternatives else None
    gear_inertia = chosen_gear["gear"]["inertiaKgCm2"] * 1e-4 if chosen_gear else 0.0
    reflected_inertia = load_inertia / ratio ** 2 + gear_inertia
    motor_angular_acceleration = angular_acceleration * ratio
    motor_inertia = motor["brakeInertiaKgm2"] if vertical else motor["inertiaKgm2"]
    motor_side_inertia = motor_inertia + gear_inertia
    total_motor_inertia = motor_inertia + reflected_inertia
    motor_inertia_accel_torque = motor_side_inertia * motor_angular_acceleration
    upward_steady_motor_torque = upward_output_torque_signed / (ratio * gear_efficiency)
    upward_peak_motor_torque = abs(upward_accel_output_torque / (ratio * gear_efficiency) + motor_inertia_accel_torque)
    upward_decel_motor_torque = abs(upward_decel_output_torque / (ratio * gear_efficiency) - motor_inertia_accel_torque)
    downward_steady_motor_torque = downward_output_torque / (ratio * gear_efficiency)
    downward_peak_motor_torque = abs(downward_accel_output_torque / (ratio * gear_efficiency) - motor_inertia_accel_torque)
    downward_decel_motor_torque = abs(downward_decel_output_torque / (ratio * gear_efficiency) + motor_inertia_accel_torque)
    emergency_peak_motor_torque = emergency_output_torque / (ratio * gear_efficiency) + motor_side_inertia * stop_angular_acceleration * ratio
    motor_peak_torque = max(
        upward_peak_motor_torque, upward_decel_motor_torque,
        downward_peak_motor_torque, downward_decel_motor_torque,
        emergency_peak_motor_torque,
    )
    cycle_time = max(1e-6, 4 * accel_time + 2 * constant_time + 2 * max(0.0, inputs["dwellTimeS"])) if vertical else max(1e-6, accel_time * 2 + constant_time + max(0.0, inputs["dwellTimeS"]))
    holding_torque = abs(unbalanced) * lead_m / (2 * math.pi * SCREW_EFFICIENCY * ratio * gear_efficiency) if vertical else 0.0
    holding_energy = holding_torque ** 2 * 2 * max(0.0, inputs["dwellTimeS"]) if vertical and inputs.get("dwellHoldMode") == "servo" else 0.0
    if vertical:
        torque_energy = (
            upward_peak_motor_torque ** 2 * accel_time
            + upward_steady_motor_torque ** 2 * constant_time
            + upward_decel_motor_torque ** 2 * accel_time
            + downward_peak_motor_torque ** 2 * accel_time
            + downward_steady_motor_torque ** 2 * constant_time
            + downward_decel_motor_torque ** 2 * accel_time
        ) + holding_energy
    else:
        torque_energy = upward_peak_motor_torque ** 2 * accel_time + upward_steady_motor_torque ** 2 * constant_time + upward_decel_motor_torque ** 2 * accel_time
    rms_torque = math.sqrt(torque_energy / cycle_time)
    inertia_ratio = reflected_inertia / motor_inertia
    brake_required = holding_torque * max(1.0, inputs["brakeSafetyFactor"])
    brake_safety = motor["brakeStaticTorqueNm"] / max(1e-9, holding_torque) if vertical else math.inf
    unbalanced_torque_ratio = holding_torque / motor["ratedTorqueNm"] if vertical else 0.0
    regenerative_energy = max(0.0, unbalanced * max(0.0, inputs["strokeMm"]) / 1000 + 0.5 * guide_eval["movingMassKg"] * peak_speed ** 2) if vertical else 0.0
    goal = SAFETY_GOALS[inputs["safetyGoal"]]
    inertia_limit = motor["recommendedInertiaRatio"] * goal["inertiaFactor"]
    support_span_m = _positive(inputs["supportSpanMm"]) / 1000
    critical_rpm = 0.8 * 60 / (2 * math.pi) * (3.927 ** 2 / support_span_m ** 2) * (root_m / 4) * math.sqrt(STEEL_ELASTIC_MODULUS / STEEL_DENSITY)
    area_moment = math.pi * root_m ** 4 / 64
    effective_length = 0.699 * support_span_m
    buckling_load = 0.5 * math.pi ** 2 * STEEL_ELASTIC_MODULUS * area_moment / effective_length ** 2
    buckling_safety = buckling_load / max(1.0, design_thrust)
    screw_static_safety = screw["c0aKn"] * 1000 / max(1.0, design_thrust)
    screw_life_km = (screw["caKn"] * 1000 / max(1.0, design_thrust)) ** 3 * screw["leadMm"]
    dn_value = screw["pitchCircleMm"] * screw_rpm
    flags: list[str] = []
    if motor_rpm > motor["maxRpm"]:
        flags.append("모터 최대 회전속도 초과")
    elif motor_rpm > motor["ratedRpm"]:
        flags.append("모터 정격속도 초과 운전")
    if motor_peak_torque > motor["maxTorqueNm"] * goal["torqueUse"]:
        flags.append("피크토크 보수 목표 초과")
    if rms_torque > motor["ratedTorqueNm"] * goal["torqueUse"]:
        flags.append("실효토크 보수 목표 초과")
    if inertia_ratio > inertia_limit:
        flags.append("권장 관성비 보수 목표 초과")
    if vertical and brake_safety < max(1.0, inputs["brakeSafetyFactor"]):
        flags.append("브레이크 정적 유지토크 안전율 부족")
    if vertical and unbalanced_torque_ratio > 0.7:
        flags.append("수직축 불평형토크가 모터 정격토크의 70% 초과")
    if dn_value > screw["dnLimit"]:
        flags.append("볼스크류 DN 한계 초과")
    if screw_rpm > critical_rpm:
        flags.append("볼스크류 위험속도 초과")
    if buckling_safety < goal["staticSafety"]:
        flags.append("볼스크류 좌굴 안전율 부족")
    if screw_static_safety < goal["staticSafety"]:
        flags.append("볼스크류 정적안전율 부족")
    if ratio != 1 and (not chosen_gear or not chosen_gear["pass"]):
        flags.append("모터축·감속비·토크·속도를 동시에 만족하는 KSB 없음")
    motor_flags = [flag for flag in flags if flag.startswith("모터") or "토크" in flag or "관성비" in flag or "브레이크" in flag]
    screw_flags = [flag for flag in flags if flag.startswith("볼스크류")]
    return {
        "motor": motor,
        "screw": screw,
        "ratioRequested": inputs["reducerRatio"],
        "ratio": ratio,
        "ratioAdjusted": ratio_adjusted,
        "gear": chosen_gear,
        "gearOptions": gear_options,
        "movingMassKg": guide_eval["movingMassKg"],
        "actualPeakSpeedMmS": peak_speed * 1000,
        "accelerationMS2": acceleration,
        "screwRpm": screw_rpm,
        "motorRpm": motor_rpm,
        "runningForceN": steady_force,
        "accelerationForceN": acceleration_force,
        "gravityForceN": gravity_force,
        "counterbalanceForceN": counterbalance,
        "unbalancedForceN": unbalanced,
        "designThrustN": design_thrust,
        "outputSteadyTorqueNm": output_steady_torque,
        "outputPeakTorqueNm": output_peak_torque,
        "outputEmergencyTorqueNm": emergency_output_torque,
        "translationalAccelerationTorqueNm": translational_accel_torque,
        "rotationalAccelerationTorqueNm": rotational_accel_torque,
        "motorPeakTorqueNm": motor_peak_torque,
        "motorRmsTorqueNm": rms_torque,
        "upwardSteadyMotorTorqueNm": upward_steady_motor_torque,
        "downwardSteadyMotorTorqueNm": downward_steady_motor_torque,
        "holdingMotorTorqueNm": holding_torque,
        "emergencyPeakTorqueNm": emergency_peak_motor_torque,
        "brakeRequiredTorqueNm": brake_required,
        "brakeSafety": brake_safety,
        "unbalancedTorqueRatio": unbalanced_torque_ratio,
        "regenerativeEnergyJ": regenerative_energy,
        "motorInertiaKgm2": motor_inertia,
        "linearInertiaKgm2": linear_inertia,
        "screwInertiaKgm2": screw_inertia,
        "reflectedInertiaKgm2": reflected_inertia,
        "inertiaRatio": inertia_ratio,
        "inertiaRatioLimit": inertia_limit,
        "dnValue": dn_value,
        "criticalRpm": critical_rpm,
        "bucklingLoadN": buckling_load,
        "bucklingSafety": buckling_safety,
        "screwStaticSafety": screw_static_safety,
        "screwLifeKm": screw_life_km,
        "passMotor": not motor_flags,
        "passScrew": not screw_flags,
        "passGear": ratio == 1 or bool(chosen_gear and chosen_gear["pass"]),
        "flags": flags,
    }


def _hardware_for_diameter(diameter_mm: float, coupling_series: str) -> dict[str, Any]:
    if diameter_mm <= 16:
        support, coupling = "FKT12 + BF12", ("SDS-39C", 6, 8000, "SDWC-39C", 6, 8000)
    elif diameter_mm <= 25:
        support, coupling = "FKT15 + BF15", ("SDCS-47C", 14, 7500, "SDWA-47C", 14, 7500)
    elif diameter_mm <= 32:
        support, coupling = "FKT20 + BF20", ("SDCS-54C", 25, 7500, "SDWB-54C", 25, 6500)
    elif diameter_mm <= 36:
        support, coupling = "FKT25 + BF25", ("SDCS-64C", 40, 7000, "SDWB-64C", 40, 6500)
    elif diameter_mm <= 40:
        support, coupling = "FKT30 + BF30", ("SDS-80C", 85, 7000, "SDW-80C", 85, 6000)
    else:
        support, coupling = "고정측·지지측 축단 별도선정", ("SDS-80C 이상 축경 대조", 0, 0, "SDS-80C 이상 축경 대조", 0, 0)
    offset = 3 if coupling_series == "SDW" else 0
    return {
        "support": support,
        "coupling": coupling[offset],
        "couplingTorqueNm": coupling[offset + 1],
        "couplingMaxRpm": coupling[offset + 2],
    }


def _screw_candidates(inputs: dict[str, Any]) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    manual = next((screw for screw in SCREWS if screw["id"] == inputs["screwModelId"]), None)
    scoped = SCREWS if inputs["screwSeries"] == "all" else [screw for screw in SCREWS if _series_for_screw(screw["id"]) == inputs["screwSeries"]]
    exact = manual if inputs["screwSelectionMode"] == "manual" else next((screw for screw in scoped if screw["diameterMm"] == inputs["screwDiameterMm"] and screw["leadMm"] == inputs["screwLeadMm"]), None)
    if inputs["screwSelectionMode"] == "manual" and manual:
        return manual, [manual]

    def compare(left: dict[str, Any], right: dict[str, Any]) -> float:
        values = [
            int(left["diameterMm"] < inputs["screwDiameterMm"]) - int(right["diameterMm"] < inputs["screwDiameterMm"]),
            int(left["leadMm"] != inputs["screwLeadMm"]) - int(right["leadMm"] != inputs["screwLeadMm"]),
            abs(left["leadMm"] - inputs["screwLeadMm"]) - abs(right["leadMm"] - inputs["screwLeadMm"]),
            left["diameterMm"] - right["diameterMm"],
        ]
        return next((value for value in values if value), 0)

    ordered = [exact, *sorted(scoped, key=cmp_to_key(compare))]
    unique: list[dict[str, Any]] = []
    for screw in ordered:
        if screw and not any(item["id"] == screw["id"] for item in unique):
            unique.append(screw)
    return exact, unique


def _guide_candidates(inputs: dict[str, Any]) -> list[dict[str, Any]]:
    manual = next((guide for guide in GUIDES if guide["id"] == inputs["guideModelId"]), None)
    if inputs["guideSelectionMode"] == "manual" and manual:
        return [manual]
    scoped = GUIDES if inputs["guideSeries"] == "all" else [guide for guide in GUIDES if _series_for_guide(guide["id"]) == inputs["guideSeries"]]
    return scoped or GUIDES


def calculate(raw_inputs: dict[str, Any], *, axis_mode: str | None = None) -> dict[str, Any]:
    mode = axis_mode or raw_inputs.get("axisMode", "horizontal")
    defaults = VERTICAL_DEFAULTS if mode == "vertical" else HORIZONTAL_DEFAULTS
    inputs = {**deepcopy(defaults), **raw_inputs, "axisMode": mode}
    motor = next((item for item in MOTORS if item["id"] == inputs["motorId"]), MOTORS[3])
    ratio = _nearest_ratio(inputs["reducerRatio"])
    exact_screw, screws = _screw_candidates(inputs)
    guides = _guide_candidates(inputs)
    if not screws:
        raise ValueError("선택 범위에 계산 가능한 볼스크류 모델이 없습니다.")
    if not guides:
        raise ValueError("선택 범위에 계산 가능한 LM 가이드 모델이 없습니다.")
    combinations: list[dict[str, Any]] = []
    for screw in screws:
        for guide in guides:
            guide_eval = _evaluate_guide(inputs, guide)
            drive = _evaluate_drive(inputs, screw, guide_eval, motor)
            is_input_screw = screw["id"] == inputs["screwModelId"] if inputs["screwSelectionMode"] == "manual" else screw["diameterMm"] == inputs["screwDiameterMm"] and screw["leadMm"] == inputs["screwLeadMm"]
            hardware = _hardware_for_diameter(screw["diameterMm"], inputs["couplingSeries"])
            coupling_torque_need = max(drive["outputPeakTorqueNm"], drive["outputEmergencyTorqueNm"])
            coupling_torque_ok = hardware["couplingTorqueNm"] > 0 and coupling_torque_need <= hardware["couplingTorqueNm"]
            coupling_speed_ok = hardware["couplingMaxRpm"] > 0 and drive["screwRpm"] <= hardware["couplingMaxRpm"]
            coupling_flags = []
            if not coupling_torque_ok:
                coupling_flags.append("커플링 허용·슬립 토크 부족")
            if not coupling_speed_ok:
                coupling_flags.append("커플링 허용 회전수 초과")
            drive["passCoupling"] = not coupling_flags
            drive["couplingTorqueNeedNm"] = coupling_torque_need
            drive["couplingTorqueAllowNm"] = hardware["couplingTorqueNm"]
            drive["couplingSpeedAllowRpm"] = hardware["couplingMaxRpm"]
            passed = guide_eval["pass"] and drive["passMotor"] and drive["passScrew"] and drive["passGear"] and drive["passCoupling"]
            failure_count = len(guide_eval["flags"]) + len(drive["flags"]) + len(coupling_flags)
            size_score = screw["diameterMm"] * 1.5 + guide["heightMm"] + guide["widthMm"] * 0.2 + ((drive["gear"] or {}).get("gear", {}).get("size", 0)) * 0.08
            screw_penalty = 0 if is_input_screw else 70 + abs(screw["diameterMm"] - inputs["screwDiameterMm"]) * 3 + abs(screw["leadMm"] - inputs["screwLeadMm"]) * 4
            family_penalty = 0 if guide["family"] == "four-way" else 18 if guide["family"] == "radial" else 30
            score = (0 if passed else 10000 + failure_count * 1000) + screw_penalty + family_penalty + size_score
            notes = [*guide_eval["flags"], *drive["flags"], *coupling_flags]
            if not is_input_screw:
                notes.insert(0, f"요청 φ{inputs['screwDiameterMm']}×{inputs['screwLeadMm']} 대신 {_series_for_screw(screw['id'])} {screw['id']} 적용")
            combinations.append({
                "rank": 0,
                "inputScrew": is_input_screw,
                "exactCatalogMatch": is_input_screw,
                "guideEval": guide_eval,
                "drive": drive,
                **hardware,
                "pass": passed,
                "status": "recommended" if passed else "caution" if failure_count <= 2 else "fail",
                "score": score,
                "notes": notes,
            })
    combinations.sort(key=lambda item: item["score"])
    top = []
    for index, item in enumerate(combinations[:3]):
        copied = {**item, "rank": index + 1}
        if copied["pass"]:
            copied["status"] = "recommended" if index == 0 else "suitable"
        top.append(copied)
    selected = top[0] if top else combinations[0]
    rejected_reasons: list[str] = []
    if not exact_screw:
        rejected_reasons.append("선택 범위에 요청 직경·리드와 정확히 일치하는 모델이 없습니다.")
    if inputs["screwSelectionMode"] == "manual" and exact_screw and not any(item["pass"] for item in combinations):
        rejected_reasons.append(f"선택한 볼스크류 {exact_screw['id']}를 다른 모델로 대체하지 않고 검증했으며 보수 목표를 만족하지 못했습니다.")
    if inputs["guideSelectionMode"] == "manual" and not any(item["pass"] for item in combinations):
        rejected_reasons.append(f"선택한 LM 가이드 {inputs['guideModelId']}를 다른 모델로 대체하지 않고 검증했습니다.")
    if ratio != inputs["reducerRatio"]:
        rejected_reasons.append(f"입력 감속비 {inputs['reducerRatio']}:1 대신 가장 가까운 표준비 {ratio}:1로 계산했습니다.")
    if ratio == 1:
        rejected_reasons.append("감속비 1:1은 감속기 미적용으로 처리합니다.")
    if not selected["pass"]:
        rejected_reasons.append("현재 입력 범위에서는 모든 보수 목표를 만족하는 조합이 없습니다.")
    return {
        "motor": motor,
        "ratio": ratio,
        "ratioAdjusted": ratio != inputs["reducerRatio"],
        "exactScrew": exact_screw,
        "combinations": top,
        "selected": selected,
        "rejectedReasons": rejected_reasons,
    }


def catalog(axis_mode: str = "horizontal") -> dict[str, Any]:
    screws = [{**item, "series": _series_for_screw(item["id"])} for item in SCREWS]
    guides = [{**item, "series": _series_for_guide(item["id"])} for item in GUIDES]
    return {
        "motors": MOTORS,
        "ratios": RATIOS,
        "gearSizes": GEAR_SIZES,
        "screwSeries": SCREW_SERIES,
        "screws": screws,
        "guideSeries": GUIDE_SERIES,
        "guides": guides,
        "serviceFactors": SERVICE_FACTORS,
        "safetyGoals": SAFETY_GOALS,
        "defaults": VERTICAL_DEFAULTS if axis_mode == "vertical" else HORIZONTAL_DEFAULTS,
        "horizontalDefaults": HORIZONTAL_DEFAULTS,
        "verticalDefaults": VERTICAL_DEFAULTS,
    }


def _margin(value: float, limit: float, mode: str) -> float:
    if not math.isfinite(value) or not math.isfinite(limit):
        return -1.0 if math.isfinite(limit) else math.inf
    if mode == "max":
        return math.inf if abs(value) <= 1e-12 else limit / value - 1
    return math.inf if abs(limit) <= 1e-12 else value / limit - 1


def _margin_set(inputs: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    selected = result["selected"]
    drive = selected["drive"]
    guide = selected["guideEval"]
    goal = SAFETY_GOALS[inputs["safetyGoal"]]
    items: list[dict[str, Any]] = []

    def add(key: str, name: str, value: float, limit: float, mode: str, unit: str = "") -> None:
        items.append({
            "key": key,
            "name": name,
            "value": value,
            "limit": limit,
            "mode": mode,
            "unit": unit,
            "note": "",
            "margin": _margin(value, limit, mode),
        })

    add("motor-peak", "모터 피크토크", drive["motorPeakTorqueNm"], drive["motor"]["maxTorqueNm"] * goal["torqueUse"], "max", "N·m")
    add("motor-rms", "모터 실효토크", drive["motorRmsTorqueNm"], drive["motor"]["ratedTorqueNm"] * goal["torqueUse"], "max", "N·m")
    add("inertia", "관성비", drive["inertiaRatio"], drive["inertiaRatioLimit"], "max", "배")
    add("motor-speed", "모터 회전속도", drive["motorRpm"], drive["motor"]["ratedRpm"], "max", "rpm")
    if drive["ratio"] != 1:
        gear = drive["gear"]
        if gear and gear["pass"]:
            add("gear", "감속기 정격출력토크", gear["torqueNeedNm"], gear["ratedTorqueNm"], "max", "N·m")
            add("gear-speed", "감속기 입력회전수", drive["motorRpm"], gear["gear"]["ratedInputRpm"], "max", "rpm")
        else:
            items.append({"key": "gear", "name": "감속기 적합성", "value": 1, "limit": 0, "mode": "max", "unit": "", "note": gear["reason"] if gear else "적합한 감속기가 없습니다.", "margin": -1})
    add("screw-static", "볼스크류 정적안전율", drive["screwStaticSafety"], goal["staticSafety"], "min")
    add("screw-buckling", "볼스크류 좌굴 안전율", drive["bucklingSafety"], goal["staticSafety"], "min")
    add("screw-dn", "볼스크류 DN", drive["dnValue"], drive["screw"]["dnLimit"], "max")
    add("screw-critical", "볼스크류 위험속도", drive["screwRpm"], drive["criticalRpm"], "max", "rpm")
    add("lm-static", "LM 정적안전율", guide["staticSafety"], goal["staticSafety"], "min")
    add("lm-life", "LM 계산수명", guide["lifeHours"], inputs["targetLifeHours"] * goal["lifeFactor"], "min", "h")
    add("lm-rail", "LM 레일 길이", guide["requiredRailMm"], guide["guide"]["maxRailMm"], "max", "mm")
    add("lm-width", "LM 설치 폭", guide["installWidthMm"], inputs["tableWidthMm"], "max", "mm")
    if inputs["axisMode"] == "vertical":
        add("holding-brake", "정전 유지 브레이크", drive["brakeRequiredTorqueNm"], drive["motor"]["brakeStaticTorqueNm"], "max", "N·m")
        add("unbalanced-torque", "수직축 불평형토크", drive["unbalancedTorqueRatio"], 0.7, "max")
    finite = [item for item in items if math.isfinite(item["margin"])]
    minimum = min((item["margin"] for item in finite), default=math.inf)
    limiting = next((item for item in finite if item["margin"] == minimum), None)
    soft = [flag for flag in guide["flags"] if any(word in flag for word in ("권장", "인장", "불리"))]
    return {
        "items": items,
        "min": minimum,
        "lim": limiting,
        "soft": soft,
        "pass": selected["pass"],
        "drive": drive,
        "guide": guide,
        "goal": goal,
        "vertical": inputs["axisMode"] == "vertical",
    }


def _manual_screw(inputs: dict[str, Any], screw: dict[str, Any]) -> dict[str, Any]:
    return {
        **inputs,
        "screwSelectionMode": "manual",
        "screwSeries": _series_for_screw(screw["id"]),
        "screwModelId": screw["id"],
        "screwDiameterMm": screw["diameterMm"],
        "screwLeadMm": screw["leadMm"],
    }


def _manual_guide(inputs: dict[str, Any], guide: dict[str, Any]) -> dict[str, Any]:
    return {
        **inputs,
        "guideSelectionMode": "manual",
        "guideSeries": _series_for_guide(guide["id"]),
        "guideModelId": guide["id"],
    }


def auto_select(raw_inputs: dict[str, Any], minimum_margin: float = 0.3) -> dict[str, Any]:
    mode = raw_inputs.get("axisMode", "horizontal")
    defaults = VERTICAL_DEFAULTS if mode == "vertical" else HORIZONTAL_DEFAULTS
    inputs = {**deepcopy(defaults), **raw_inputs, "axisMode": mode}
    base = calculate(inputs)
    pinned = _manual_screw(inputs, base["selected"]["drive"]["screw"])
    pinned = _manual_guide(pinned, base["selected"]["guideEval"]["guide"])

    guide_rows = []
    for guide in sorted(GUIDES, key=lambda item: (item["cKn"], item["heightMm"])):
        candidate_inputs = _manual_guide(pinned, guide)
        result = calculate(candidate_inputs)
        margins = _margin_set(candidate_inputs, result)
        lm_items = [item for item in margins["items"] if item["key"].startswith("lm-")]
        lm_min = min((item["margin"] for item in lm_items), default=-99)
        guide_rows.append({"guide": guide, "inputs": candidate_inputs, "result": result, "set": margins, "lmMin": lm_min, "soft": margins["soft"]})
    chosen_guide = (
        next((row for row in guide_rows if row["lmMin"] >= minimum_margin and not row["soft"]), None)
        or next((row for row in guide_rows if row["lmMin"] >= minimum_margin), None)
        or next((row for row in guide_rows if row["lmMin"] >= 0), None)
        or max(guide_rows, key=lambda row: row["lmMin"])
    )
    guide_pinned = _manual_guide(pinned, chosen_guide["guide"])
    rows = []
    combos = 0
    for screw in SCREWS:
        screw_inputs = _manual_screw(guide_pinned, screw)
        profile = _motion_profile(screw_inputs)
        screw_rpm = profile["peakV"] * 60_000 / max(0.001, screw["leadMm"])
        for motor in MOTORS:
            for ratio in RATIOS:
                if screw_rpm * ratio > motor["maxRpm"] + 1e-9:
                    continue
                combos += 1
                candidate_inputs = {**screw_inputs, "motorId": motor["id"], "reducerRatio": ratio}
                result = calculate(candidate_inputs)
                margins = _margin_set(candidate_inputs, result)
                if math.isfinite(margins["min"]):
                    rows.append({"screw": screw, "motor": motor, "ratio": ratio, "inputs": candidate_inputs, "result": result, "set": margins, "min": margins["min"], "soft": margins["soft"]})
    if not rows:
        return {"ok": False, "error": "모터 허용 회전수 안에서 성립하는 조합이 없습니다.", "tried": len(guide_rows) + combos}
    passed = [row for row in rows if row["min"] >= 0]
    safe = [row for row in passed if row["min"] >= minimum_margin]

    def ranking(row: dict[str, Any]) -> tuple[float, ...]:
        return (len(row["soft"]), row["motor"]["powerW"], row["screw"]["diameterMm"], -row["min"], row["ratio"])

    best = min(safe, key=ranking) if safe else min(passed, key=ranking) if passed else max(rows, key=lambda row: row["min"])
    selected = best["result"]["selected"]
    drive = selected["drive"]
    guide_eval = selected["guideEval"]
    gear_name = f"KSB{drive['gear']['gear']['size']}" if drive["gear"] else "직결" if best["ratio"] == 1 else "정번 미정"
    hardware = _hardware_for_diameter(best["screw"]["diameterMm"], inputs["couplingSeries"])
    reasons = [
        {"part": "서보모터", "spec": f"{best['motor']['id']}{'B' if mode == 'vertical' else ''} · {best['motor']['powerW']} W", "why": f"피크·실효토크, 관성비와 회전속도를 함께 평가했습니다. 전체 최소 여유율은 {best['min'] * 100:.1f}%입니다."},
        {"part": "감속비·감속기", "spec": f"{best['ratio']}:1 · {gear_name}", "why": "모터축 호환, 정격출력토크와 입력 회전수를 동시에 만족하는 조합을 선택했습니다."},
        {"part": "볼스크류", "spec": f"{_series_for_screw(best['screw']['id'])} {best['screw']['id']} · φ{best['screw']['diameterMm']} × 리드 {best['screw']['leadMm']} mm", "why": f"정적안전율 {drive['screwStaticSafety']:.1f}, 좌굴 안전율 {drive['bucklingSafety']:.1f}, DN과 위험속도를 함께 검증했습니다."},
        {"part": "LM 가이드", "spec": f"{_series_for_guide(guide_eval['guide']['id'])} {guide_eval['guide']['id']}", "why": f"정적안전율 {guide_eval['staticSafety']:.1f}, 계산수명 {guide_eval['lifeHours']:.0f} h, 레일 길이와 설치 폭을 함께 검증했습니다."},
        {"part": "커플링·서포트", "spec": f"{hardware['coupling']} · {hardware['support']}", "why": "볼스크류 축경 기준으로 정번군을 선택했습니다. 발주 전 축단 치수는 2D 도면으로 최종 확인해야 합니다."},
    ]
    return {
        "ok": True,
        "safe": best["min"] >= minimum_margin,
        "minimumMargin": minimum_margin,
        "E": {"min": best["min"], "lim": best["set"]["lim"], "soft": best["soft"]},
        "set": best["set"],
        "reasons": reasons,
        "tried": len(guide_rows) + combos,
        "combos": combos,
        "passCount": len(passed),
        "safeCount": len(safe),
        "guideTried": len(guide_rows),
        "label": f"{best['motor']['id']}{'B' if mode == 'vertical' else ''} + {gear_name} {best['ratio']}:1 + {best['screw']['id']} + {guide_eval['guide']['id']}",
        "apply": {
            "motorId": best["motor"]["id"],
            "reducerRatio": best["ratio"],
            "screwSelectionMode": "manual",
            "screwSeries": _series_for_screw(best["screw"]["id"]),
            "screwModelId": best["screw"]["id"],
            "screwDiameterMm": best["screw"]["diameterMm"],
            "screwLeadMm": best["screw"]["leadMm"],
            "guideSelectionMode": "manual",
            "guideSeries": _series_for_guide(guide_eval["guide"]["id"]),
            "guideModelId": guide_eval["guide"]["id"],
        },
    }


def json_safe(value: Any) -> Any:
    if isinstance(value, float) and not math.isfinite(value):
        if math.isnan(value):
            return "NaN"
        return "Infinity" if value > 0 else "-Infinity"
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    return value
