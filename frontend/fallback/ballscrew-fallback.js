import {
  legacyMotors,
  legacyRatios,
  legacyGearSizes,
  legacyScrewSeries,
  legacyScrews,
  legacyGuideSeries,
  legacyGuides,
  legacyServiceFactors,
  legacyHorizontalDefaults,
  legacyVerticalDefaults,
  legacySafetyGoals,
  legacyGravity as G,
  legacyEfficiency as SCREW_EFFICIENCY,
  legacyRollingResistance as ROLLING_RESISTANCE,
  legacySteelDensity as STEEL_DENSITY,
  legacySteelElasticModulus as STEEL_ELASTIC_MODULUS,
  legacyNearestRatio,
  legacyLoadFactor,
  legacyMotionProfile,
  legacyEvaluateGuide,
  legacyGearOptions,
  legacyHardware,
  legacyScrewCandidates,
  legacyGuideCandidates,
} from "./ballscrew-legacy.js";

const motors = legacyMotors.map((motor) => ({ ...motor }));
const kr13 = motors.find((motor) => motor.id === "HG-KR13");
const kr23 = motors.find((motor) => motor.id === "HG-KR23");
if (kr13) kr13.recommendedInertiaRatio = 17;
if (kr23) kr23.recommendedInertiaRatio = 26;

function seriesForScrew(id) {
  if (id.startsWith("BNK") && id.includes("K-")) return "BNK-K";
  if (id.startsWith("BNK")) return "BNK";
  if (id.startsWith("BIF")) return "BIF-V";
  if (id.startsWith("SDA")) return "SDA-VZ";
  if (id.startsWith("MDK")) return "MDK";
  if (id.startsWith("WGF")) return "WGF";
  if (id.startsWith("BLK")) return "BLK";
  if (id.startsWith("BTK")) return "BTK-V";
  if (id.startsWith("BNT")) return "BNT";
  return "SBN-V";
}

function seriesForGuide(id) {
  if (id.startsWith("HSR")) return "HSR";
  if (id.startsWith("SHS")) return "SHS";
  if (id.startsWith("SSR")) return "SSR";
  if (id.startsWith("SRS")) return "SRS";
  if (id.startsWith("SR")) return "SR";
  return "RSX";
}

const screws = legacyScrews.map((item) => ({ ...item, series: seriesForScrew(item.id) }));
const guides = legacyGuides.map((item) => ({ ...item, series: seriesForGuide(item.id) }));

function finite(name, value, { min = -Infinity, inclusive = true } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || (inclusive ? number < min : number <= min)) {
    throw new Error(`${name} 입력값이 올바르지 않습니다.`);
  }
  return number;
}

function validate(inputs) {
  const positive = [
    ["감속비", "reducerRatio"], ["이동질량", "massKg"], ["스트로크", "strokeMm"],
    ["최대속도", "maxSpeedMmS"], ["가속시간", "accelTimeS"], ["분당 사이클", "cyclesPerMin"],
    ["볼스크류 직경", "screwDiameterMm"], ["볼스크류 리드", "screwLeadMm"],
    ["지지간 거리", "supportSpanMm"], ["스크류 길이", "screwLengthMm"],
    ["테이블 폭", "tableWidthMm"], ["목표수명", "targetLifeHours"],
    ["비상정지시간", "emergencyStopTimeS"],
  ];
  positive.forEach(([label, key]) => { inputs[key] = finite(label, inputs[key], { min: 0, inclusive: false }); });
  const nonnegative = [
    ["정지시간", "dwellTimeS"], ["외부저항", "externalResistanceN"],
    ["카운터밸런스", "counterbalanceForceN"], ["수직 공정력", "verticalProcessForceN"],
    ["레일 간격", "railSpacingMm"], ["블록 간격", "blockSpacingMm"],
  ];
  nonnegative.forEach(([label, key]) => { inputs[key] = finite(label, inputs[key], { min: 0 }); });
  inputs.serviceFactor = finite("서비스계수", inputs.serviceFactor, { min: 1 });
  inputs.brakeSafetyFactor = finite("브레이크 안전율", inputs.brakeSafetyFactor, { min: 1 });
  inputs.railCount = finite("레일 수", inputs.railCount, { min: 1 });
  inputs.blocksPerRail = finite("레일당 블록 수", inputs.blocksPerRail, { min: 1 });
  if (inputs.railCount > 4 || inputs.blocksPerRail > 4) throw new Error("레일·블록 수는 1~4 범위여야 합니다.");
  ["cogXmm", "cogYmm", "cogZmm", "screwYmm", "screwZmm", "externalFxN", "externalFyN", "externalFzN", "externalPointXmm", "externalPointYmm", "externalPointZmm"]
    .forEach((key) => { inputs[key] = finite(key, inputs[key]); });
  return inputs;
}

function positions(count, spacingMm) {
  const bounded = Math.max(1, Math.min(4, Math.round(count)));
  if (bounded === 1) return [0];
  const spacing = Math.max(0, spacingMm) / 1000;
  return Array.from({ length: bounded }, (_, index) => -spacing / 2 + spacing * index / (bounded - 1));
}

function evaluateVerticalGuide(inputs, guide) {
  const railCount = Math.max(1, Math.min(4, Math.round(inputs.railCount)));
  const blocksPerRail = Math.max(1, Math.min(4, Math.round(inputs.blocksPerRail)));
  const blockCount = railCount * blocksPerRail;
  const movingMass = Math.max(0, inputs.massKg) + guide.blockMassKg * blockCount;
  const points = positions(railCount, inputs.railSpacingMm)
    .flatMap((x) => positions(blocksPerRail, inputs.blockSpacingMm).map((z) => ({ x, z })));
  const sumX2 = points.reduce((sum, point) => sum + point.x ** 2, 0);
  const sumZ2 = points.reduce((sum, point) => sum + point.z ** 2, 0);
  const weight = movingMass * G;
  const cogX = inputs.cogXmm / 1000;
  const cogY = inputs.cogYmm / 1000;
  const screwY = inputs.screwYmm / 1000;
  const screwZ = inputs.screwZmm / 1000;
  const { acceleration } = legacyMotionProfile(inputs);
  const designThrust = (
    Math.abs(weight - Math.max(0, inputs.counterbalanceForceN))
    + Math.max(0, inputs.externalResistanceN)
    + Math.max(0, inputs.verticalProcessForceN)
    + movingMass * acceleration
  ) * Math.max(1, inputs.serviceFactor);
  const pitchMoment = -weight * cogY + designThrust * screwZ;
  const yawMoment = weight * cogX - designThrust * screwY;
  const rollMoment = (inputs.externalPointXmm * inputs.externalFyN - inputs.externalPointYmm * inputs.externalFxN) / 1000;
  const directX = Math.abs(inputs.externalFxN) / blockCount;
  const directY = Math.abs(inputs.externalFyN) / blockCount;
  const reactions = points.map((point) => {
    const pitchLoad = sumZ2 > 1e-12 ? Math.abs(pitchMoment * point.z / sumZ2) : 0;
    const yawLoad = sumZ2 > 1e-12 ? Math.abs(yawMoment * point.z / sumZ2) : 0;
    const rollLoad = sumX2 > 1e-12 ? Math.abs(rollMoment * point.x / sumX2) : 0;
    return Math.max(1, directX + directY + pitchLoad + yawLoad + rollLoad);
  });
  const maxLoad = Math.max(...reactions, 1);
  const minReaction = Math.min(...reactions);
  const directStatic = guide.c0Kn * 1000 / maxLoad;
  const maSafety = sumZ2 > 1e-12 || Math.abs(pitchMoment) < 1e-9 ? Infinity : guide.maNm * blockCount / Math.abs(pitchMoment);
  const mbSafety = sumZ2 > 1e-12 || Math.abs(yawMoment) < 1e-9 ? Infinity : guide.mbNm * blockCount / Math.abs(yawMoment);
  const mcSafety = sumX2 > 1e-12 || Math.abs(rollMoment) < 1e-9 ? Infinity : guide.mcNm * blockCount / Math.abs(rollMoment);
  const momentSafety = Math.min(maSafety, mbSafety, mcSafety);
  const staticSafety = Math.min(directStatic, momentSafety);
  const loadFactor = legacyLoadFactor(inputs.maxSpeedMmS, inputs.shock);
  const lifeKm = 50 * (guide.cKn * 1000 / (maxLoad * loadFactor)) ** 3;
  const travelKmPerHour = 2 * Math.max(0, inputs.strokeMm) * Math.max(0, inputs.cyclesPerMin) * 60 / 1e6;
  const lifeHours = travelKmPerHour > 0 ? lifeKm / travelKmPerHour : Infinity;
  const requiredRailMm = Math.max(0, inputs.strokeMm) + (blocksPerRail > 1 ? Math.max(0, inputs.blockSpacingMm) : 0) + guide.lengthMm + 100;
  const installWidthMm = (railCount > 1 ? Math.max(0, inputs.railSpacingMm) : 0) + guide.widthMm;
  const goal = legacySafetyGoals[inputs.safetyGoal];
  const flags = [];
  if (staticSafety < goal.staticSafety) flags.push(`정적안전율 ${staticSafety.toFixed(1)} < 목표 ${goal.staticSafety}`);
  if (lifeHours < inputs.targetLifeHours * goal.lifeFactor) flags.push("목표 수명 여유 부족");
  if (requiredRailMm > guide.maxRailMm) flags.push("카탈로그 최대 레일 길이 초과");
  if (installWidthMm > inputs.tableWidthMm) flags.push("테이블 폭 안에 레일 배치 불가");
  if (railCount === 1 && Math.abs(pitchMoment) + Math.abs(yawMoment) + Math.abs(rollMoment) > 1) flags.push("수직 1열 레일은 CG 편심 모멘트에 불리함");
  if (guide.family !== "four-way" && (Math.abs(inputs.externalFxN) + Math.abs(inputs.externalFyN) > 1 || Math.abs(cogY) > 0.001)) flags.push("수직·면외 하중에는 4방향 등하중형 우선 권장");
  return { guide, movingMassKg: movingMass, blockCount, loadFactor, maxBlockLoadN: maxLoad, minBlockReactionN: minReaction,
    staticSafety, momentSafety, lifeKm, lifeHours, requiredRailMm, installWidthMm, pass: flags.length === 0, flags, reactionsN: reactions,
    momentsNm: { roll: rollMoment, pitch: pitchMoment, yaw: yawMoment } };
}

function evaluateDrive(inputs, screw, guideEval, motor) {
  const ratio = legacyNearestRatio(inputs.reducerRatio);
  const ratioAdjusted = Math.abs(ratio - inputs.reducerRatio) > 1e-9;
  const gearEfficiency = ratio === 1 ? 1 : ratio <= 10 ? 0.97 : 0.94;
  const profile = legacyMotionProfile(inputs);
  const { peakV: peakSpeed, acceleration, accelTime, constantTime } = profile;
  const leadM = screw.leadMm / 1000;
  const screwRpm = peakSpeed / leadM * 60;
  const motorRpm = screwRpm * ratio;
  const vertical = inputs.axisMode === "vertical";
  const gravityForce = vertical ? guideEval.movingMassKg * G : 0;
  const counterbalance = vertical ? Math.max(0, inputs.counterbalanceForceN) : 0;
  const unbalanced = vertical ? gravityForce - counterbalance : 0;
  const runningForce = Math.max(0, inputs.externalResistanceN) + ROLLING_RESISTANCE * guideEval.movingMassKg * G;
  const processForce = Math.max(0, inputs.verticalProcessForceN);
  const upwardSteadyForce = vertical ? unbalanced + runningForce + processForce : runningForce + Math.abs(inputs.externalFxN);
  const downwardSteadyForce = vertical ? unbalanced - runningForce - processForce : upwardSteadyForce;
  const steadyForce = Math.abs(upwardSteadyForce);
  const accelerationForce = guideEval.movingMassKg * acceleration;
  const serviceFactor = Math.max(1, inputs.serviceFactor);
  const designThrust = (vertical ? Math.abs(unbalanced) + runningForce + processForce + accelerationForce : steadyForce + accelerationForce) * serviceFactor;
  const rootM = screw.rootMm / 1000;
  const screwLengthM = Math.max(inputs.screwLengthMm, inputs.supportSpanMm) / 1000;
  const screwInertia = 0.5 * (STEEL_DENSITY * Math.PI * rootM ** 2 * screwLengthM / 4) * (rootM / 2) ** 2;
  const linearInertia = guideEval.movingMassKg * (leadM / (2 * Math.PI)) ** 2;
  const couplingInertia = screw.diameterMm <= 20 ? 2e-5 : screw.diameterMm <= 32 ? 98e-6 : 18e-5;
  const loadInertia = linearInertia + screwInertia + couplingInertia;
  const angularAcceleration = 2 * Math.PI * acceleration / leadM;
  const forceToTorque = serviceFactor * leadM / (2 * Math.PI * SCREW_EFFICIENCY);
  const outputSteadyTorque = Math.abs(upwardSteadyForce) * forceToTorque;
  const downwardOutputTorque = downwardSteadyForce * forceToTorque;
  const translationalAccelerationTorque = accelerationForce * forceToTorque;
  const rotatingLoadInertia = screwInertia + couplingInertia;
  const rotationalAccelerationTorque = rotatingLoadInertia * angularAcceleration * serviceFactor;
  const loadAccelerationTorque = translationalAccelerationTorque + rotationalAccelerationTorque;
  const upwardSigned = upwardSteadyForce * forceToTorque;
  const upwardAccel = upwardSigned + loadAccelerationTorque;
  const upwardDecel = upwardSigned - loadAccelerationTorque;
  const downwardAccel = downwardOutputTorque - loadAccelerationTorque;
  const downwardDecel = downwardOutputTorque + loadAccelerationTorque;
  const outputPeakTorque = Math.max(Math.abs(upwardAccel), Math.abs(upwardDecel), Math.abs(downwardAccel), Math.abs(downwardDecel));
  const stopTime = Math.max(0.03, inputs.emergencyStopTimeS);
  const stopAngularAcceleration = 2 * Math.PI * peakSpeed / stopTime / leadM;
  const stopLinearAcceleration = peakSpeed / stopTime;
  const emergencyOutputTorque = Math.abs(downwardOutputTorque) + guideEval.movingMassKg * stopLinearAcceleration * forceToTorque + rotatingLoadInertia * stopAngularAcceleration * serviceFactor;
  const gearOptions = legacyGearOptions(motor, ratio, motorRpm, Math.max(outputPeakTorque, emergencyOutputTorque));
  const pin = Math.round(inputs.gearSizePin || 0);
  const eligible = pin ? gearOptions.filter((option) => option.gear.size === pin) : gearOptions;
  let chosenGear = eligible.find((option) => option.pass) ?? eligible.filter((option) => option.boreCompatible && option.ratioCompatible).sort((a, b) => b.torqueMargin - a.torqueMargin)[0] ?? null;
  const gearInertia = chosenGear ? chosenGear.gear.inertiaKgCm2 * 1e-4 : 0;
  const reflectedInertia = loadInertia / ratio ** 2 + gearInertia;
  const motorAngularAcceleration = angularAcceleration * ratio;
  const motorInertia = vertical ? motor.brakeInertiaKgm2 : motor.inertiaKgm2;
  const motorSideInertia = motorInertia + gearInertia;
  const motorInertiaAccelerationTorque = motorSideInertia * motorAngularAcceleration;
  const upwardSteadyMotorTorque = upwardSigned / (ratio * gearEfficiency);
  const upwardPeakMotorTorque = Math.abs(upwardAccel / (ratio * gearEfficiency) + motorInertiaAccelerationTorque);
  const upwardDecelMotorTorque = Math.abs(upwardDecel / (ratio * gearEfficiency) - motorInertiaAccelerationTorque);
  const downwardSteadyMotorTorque = downwardOutputTorque / (ratio * gearEfficiency);
  const downwardPeakMotorTorque = Math.abs(downwardAccel / (ratio * gearEfficiency) - motorInertiaAccelerationTorque);
  const downwardDecelMotorTorque = Math.abs(downwardDecel / (ratio * gearEfficiency) + motorInertiaAccelerationTorque);
  const emergencyPeakMotorTorque = emergencyOutputTorque / (ratio * gearEfficiency) + motorSideInertia * stopAngularAcceleration * ratio;
  const motorPeakTorque = Math.max(upwardPeakMotorTorque, upwardDecelMotorTorque, downwardPeakMotorTorque, downwardDecelMotorTorque, emergencyPeakMotorTorque);
  const cycleTime = vertical ? Math.max(1e-6, 4 * accelTime + 2 * constantTime + 2 * Math.max(0, inputs.dwellTimeS)) : Math.max(1e-6, accelTime * 2 + constantTime + Math.max(0, inputs.dwellTimeS));
  const holdingTorque = vertical ? Math.abs(unbalanced) * leadM / (2 * Math.PI * SCREW_EFFICIENCY * ratio * gearEfficiency) : 0;
  const holdingEnergy = vertical && inputs.dwellHoldMode === "servo" ? holdingTorque ** 2 * 2 * Math.max(0, inputs.dwellTimeS) : 0;
  const torqueEnergy = vertical
    ? upwardPeakMotorTorque ** 2 * accelTime + upwardSteadyMotorTorque ** 2 * constantTime + upwardDecelMotorTorque ** 2 * accelTime + downwardPeakMotorTorque ** 2 * accelTime + downwardSteadyMotorTorque ** 2 * constantTime + downwardDecelMotorTorque ** 2 * accelTime + holdingEnergy
    : upwardPeakMotorTorque ** 2 * accelTime + upwardSteadyMotorTorque ** 2 * constantTime + upwardDecelMotorTorque ** 2 * accelTime;
  const rmsTorque = Math.sqrt(torqueEnergy / cycleTime);
  const inertiaRatio = reflectedInertia / motorInertia;
  const brakeRequired = holdingTorque * Math.max(1, inputs.brakeSafetyFactor);
  const brakeSafety = vertical ? motor.brakeStaticTorqueNm / Math.max(1e-9, holdingTorque) : Infinity;
  const unbalancedTorqueRatio = vertical ? holdingTorque / motor.ratedTorqueNm : 0;
  const regenerativeEnergy = vertical ? Math.max(0, unbalanced * Math.max(0, inputs.strokeMm) / 1000 + 0.5 * guideEval.movingMassKg * peakSpeed ** 2) : 0;
  const goal = legacySafetyGoals[inputs.safetyGoal];
  const inertiaLimit = motor.recommendedInertiaRatio * goal.inertiaFactor;
  const supportSpanM = Math.max(inputs.supportSpanMm, 1e-6) / 1000;
  const criticalRpm = 0.8 * 60 / (2 * Math.PI) * (3.927 ** 2 / supportSpanM ** 2) * (rootM / 4) * Math.sqrt(STEEL_ELASTIC_MODULUS / STEEL_DENSITY);
  const areaMoment = Math.PI * rootM ** 4 / 64;
  const effectiveLength = 0.699 * supportSpanM;
  const bucklingLoad = 0.5 * Math.PI ** 2 * STEEL_ELASTIC_MODULUS * areaMoment / effectiveLength ** 2;
  const bucklingSafety = bucklingLoad / Math.max(1, designThrust);
  const screwStaticSafety = screw.c0aKn * 1000 / Math.max(1, designThrust);
  const screwLifeKm = (screw.caKn * 1000 / Math.max(1, designThrust)) ** 3 * screw.leadMm;
  const dnValue = screw.pitchCircleMm * screwRpm;
  const flags = [];
  if (motorRpm > motor.maxRpm) flags.push("모터 최대 회전속도 초과"); else if (motorRpm > motor.ratedRpm) flags.push("모터 정격속도 초과 운전");
  if (motorPeakTorque > motor.maxTorqueNm * goal.torqueUse) flags.push("피크토크 보수 목표 초과");
  if (rmsTorque > motor.ratedTorqueNm * goal.torqueUse) flags.push("실효토크 보수 목표 초과");
  if (inertiaRatio > inertiaLimit) flags.push("권장 관성비 보수 목표 초과");
  if (vertical && brakeSafety < Math.max(1, inputs.brakeSafetyFactor)) flags.push("브레이크 정적 유지토크 안전율 부족");
  if (vertical && unbalancedTorqueRatio > 0.7) flags.push("수직축 불평형토크가 모터 정격토크의 70% 초과");
  if (dnValue > screw.dnLimit) flags.push("볼스크류 DN 한계 초과");
  if (screwRpm > criticalRpm) flags.push("볼스크류 위험속도 초과");
  if (bucklingSafety < goal.staticSafety) flags.push("볼스크류 좌굴 안전율 부족");
  if (screwStaticSafety < goal.staticSafety) flags.push("볼스크류 정적안전율 부족");
  if (ratio !== 1 && (!chosenGear || !chosenGear.pass)) flags.push("모터축·감속비·토크·속도를 동시에 만족하는 KSB 없음");
  const motorFlags = flags.filter((flag) => flag.startsWith("모터") || flag.includes("토크") || flag.includes("관성비") || flag.includes("브레이크"));
  const screwFlags = flags.filter((flag) => flag.startsWith("볼스크류"));
  return { motor, screw, ratioRequested: inputs.reducerRatio, ratio, ratioAdjusted, gear: chosenGear, gearOptions,
    movingMassKg: guideEval.movingMassKg, actualPeakSpeedMmS: peakSpeed * 1000, accelerationMS2: acceleration, screwRpm, motorRpm,
    runningForceN: steadyForce, accelerationForceN: accelerationForce, gravityForceN: gravityForce, counterbalanceForceN: counterbalance,
    unbalancedForceN: unbalanced, designThrustN: designThrust, outputSteadyTorqueNm: outputSteadyTorque, outputPeakTorqueNm: outputPeakTorque,
    outputEmergencyTorqueNm: emergencyOutputTorque, translationalAccelerationTorqueNm: translationalAccelerationTorque,
    rotationalAccelerationTorqueNm: rotationalAccelerationTorque, motorPeakTorqueNm: motorPeakTorque, motorRmsTorqueNm: rmsTorque,
    upwardSteadyMotorTorqueNm: upwardSteadyMotorTorque, downwardSteadyMotorTorqueNm: downwardSteadyMotorTorque,
    holdingMotorTorqueNm: holdingTorque, emergencyPeakTorqueNm: emergencyPeakMotorTorque, brakeRequiredTorqueNm: brakeRequired,
    brakeSafety, unbalancedTorqueRatio, regenerativeEnergyJ: regenerativeEnergy, motorInertiaKgm2: motorInertia,
    linearInertiaKgm2: linearInertia, screwInertiaKgm2: screwInertia, reflectedInertiaKgm2: reflectedInertia,
    inertiaRatio, inertiaRatioLimit: inertiaLimit, dnValue, criticalRpm, bucklingLoadN: bucklingLoad, bucklingSafety,
    screwStaticSafety, screwLifeKm, passMotor: motorFlags.length === 0, passScrew: screwFlags.length === 0,
    passGear: ratio === 1 || Boolean(chosenGear?.pass), flags };
}

function calculate(rawInputs, axisMode) {
  const defaults = axisMode === "vertical" ? legacyVerticalDefaults : legacyHorizontalDefaults;
  const inputs = validate({ ...defaults, ...rawInputs, axisMode });
  const motor = motors.find((item) => item.id === inputs.motorId) ?? motors[3];
  const ratio = legacyNearestRatio(inputs.reducerRatio);
  const candidates = legacyScrewCandidates(inputs);
  const exactScrew = candidates.exact;
  const screwCandidates = candidates.candidates;
  const guideCandidates = legacyGuideCandidates(inputs);
  if (!screwCandidates.length || !guideCandidates.length) throw new Error("선택 범위에 계산 가능한 부품이 없습니다.");
  const combinations = [];
  for (const screw of screwCandidates) for (const guide of guideCandidates) {
    const guideEval = axisMode === "vertical" ? evaluateVerticalGuide(inputs, guide) : legacyEvaluateGuide(inputs, guide);
    const drive = evaluateDrive(inputs, screw, guideEval, motor);
    const inputScrew = inputs.screwSelectionMode === "manual" ? screw.id === inputs.screwModelId : screw.diameterMm === inputs.screwDiameterMm && screw.leadMm === inputs.screwLeadMm;
    const hardware = legacyHardware(screw.diameterMm, inputs.couplingSeries);
    const couplingTorqueNeed = Math.max(drive.outputPeakTorqueNm, drive.outputEmergencyTorqueNm);
    const couplingFlags = [];
    if (!(hardware.couplingTorqueNm > 0 && couplingTorqueNeed <= hardware.couplingTorqueNm)) couplingFlags.push("커플링 허용·슬립 토크 부족");
    if (!(hardware.couplingMaxRpm > 0 && drive.screwRpm <= hardware.couplingMaxRpm)) couplingFlags.push("커플링 허용 회전수 초과");
    drive.passCoupling = couplingFlags.length === 0;
    drive.couplingTorqueNeedNm = couplingTorqueNeed;
    drive.couplingTorqueAllowNm = hardware.couplingTorqueNm;
    drive.couplingSpeedAllowRpm = hardware.couplingMaxRpm;
    const pass = guideEval.pass && drive.passMotor && drive.passScrew && drive.passGear && drive.passCoupling;
    const failureCount = guideEval.flags.length + drive.flags.length + couplingFlags.length;
    const sizeScore = screw.diameterMm * 1.5 + guide.heightMm + guide.widthMm * 0.2 + (drive.gear?.gear?.size ?? 0) * 0.08;
    const screwPenalty = inputScrew ? 0 : 70 + Math.abs(screw.diameterMm - inputs.screwDiameterMm) * 3 + Math.abs(screw.leadMm - inputs.screwLeadMm) * 4;
    const familyPenalty = guide.family === "four-way" ? 0 : guide.family === "radial" ? 18 : 30;
    const score = (pass ? 0 : 10000 + failureCount * 1000) + screwPenalty + familyPenalty + sizeScore;
    const notes = [...guideEval.flags, ...drive.flags, ...couplingFlags];
    if (!inputScrew) notes.unshift(`요청 Ø${inputs.screwDiameterMm}×${inputs.screwLeadMm} 대신 ${seriesForScrew(screw.id)} ${screw.id} 적용`);
    combinations.push({ rank: 0, inputScrew, exactCatalogMatch: inputScrew, guideEval, drive, ...hardware, pass,
      status: pass ? "recommended" : failureCount <= 2 ? "caution" : "fail", score, notes });
  }
  combinations.sort((a, b) => a.score - b.score);
  const top = combinations.slice(0, 3).map((item, index) => ({ ...item, rank: index + 1,
    status: item.pass ? (index === 0 ? "recommended" : "suitable") : item.status }));
  const selected = top[0] ?? combinations[0];
  const rejectedReasons = [];
  if (!exactScrew) rejectedReasons.push("선택 범위에 요청 직경·리드와 정확히 일치하는 모델이 없습니다.");
  if (inputs.screwSelectionMode === "manual" && exactScrew && !combinations.some((item) => item.pass)) rejectedReasons.push(`선택한 볼스크류 ${exactScrew.id}를 다른 모델로 대체하지 않고 검증했으며 보수 목표를 만족하지 못했습니다.`);
  if (inputs.guideSelectionMode === "manual" && !combinations.some((item) => item.pass)) rejectedReasons.push(`선택한 LM 가이드 ${inputs.guideModelId}를 다른 모델로 대체하지 않고 검증했습니다.`);
  if (ratio !== inputs.reducerRatio) rejectedReasons.push(`입력 감속비 ${inputs.reducerRatio}:1 대신 가장 가까운 표준비 ${ratio}:1로 계산했습니다.`);
  if (ratio === 1) rejectedReasons.push("감속비 1:1은 감속기 미적용으로 처리합니다.");
  if (!selected.pass) rejectedReasons.push("현재 입력 범위에서는 모든 보수 목표를 만족하는 조합이 없습니다.");
  return { motor, ratio, ratioAdjusted: ratio !== inputs.reducerRatio, exactScrew, combinations: top, selected, rejectedReasons,
    fallbackMode: true, adminThresholds: { autoSelectMargin: 0.3 } };
}

export function catalog(axisMode = "horizontal") {
  return { motors, ratios: legacyRatios, gearSizes: legacyGearSizes, screwSeries: legacyScrewSeries, screws,
    guideSeries: legacyGuideSeries, guides, serviceFactors: legacyServiceFactors, safetyGoals: legacySafetyGoals,
    defaults: axisMode === "vertical" ? legacyVerticalDefaults : legacyHorizontalDefaults,
    horizontalDefaults: legacyHorizontalDefaults, verticalDefaults: legacyVerticalDefaults,
    adminThresholds: { autoSelectMargin: 0.3 }, fallbackMode: true };
}

export function calculateHorizontal(inputs) { return calculate(inputs, "horizontal"); }
export function calculateVertical(inputs) { return calculate(inputs, "vertical"); }

