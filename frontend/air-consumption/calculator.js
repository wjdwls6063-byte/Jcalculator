// SMC, Air Consumption and Required Air Volume (technical data, p. 1574).
// All lengths are mm, pressures are gauge MPa, and results are L (ANR).
const AREA = Math.PI / 4;

export function calculateAirConsumption(input) {
  const {
    mode, bore, rod, stroke, pressureOut, pressureIn,
    tubeIdOut, tubeIdIn, tubeLengthOut, tubeLengthIn,
    cyclesPerMinute, cylinderCount, temperatureC, includePiping,
  } = input;
  const numbers = [bore, rod, stroke, pressureOut, pressureIn, tubeIdOut, tubeIdIn,
    tubeLengthOut, tubeLengthIn, cyclesPerMinute, cylinderCount, temperatureC];
  if (numbers.some(value => !Number.isFinite(value))) throw new Error('모든 숫자 입력값을 확인해 주세요.');
  if (!['double', 'spring-return', 'spring-extend'].includes(mode)) throw new Error('작동 방식을 선택해 주세요.');
  if (bore <= 0 || rod < 0 || rod >= bore || stroke <= 0) throw new Error('내경·로드 지름·스트로크를 확인해 주세요. 로드 지름은 내경보다 작아야 합니다.');
  if (pressureOut < 0 || pressureIn < 0) throw new Error('사용 압력은 0 MPa 이상이어야 합니다.');
  if (cyclesPerMinute < 0 || cylinderCount <= 0 || !Number.isInteger(cylinderCount)) throw new Error('작동 횟수와 실린더 수량을 확인해 주세요.');
  if (temperatureC <= -273) throw new Error('온도를 확인해 주세요.');
  if ([tubeIdOut, tubeIdIn, tubeLengthOut, tubeLengthIn].some(value => value < 0)) throw new Error('배관 내경과 길이는 0 이상이어야 합니다.');
  if (includePiping && ((tubeIdOut === 0 && tubeLengthOut > 0) || (tubeIdIn === 0 && tubeLengthIn > 0))) throw new Error('길이가 있는 배관은 내경도 입력해 주세요.');

  const temperatureFactor = 293 / (temperatureC + 273);
  const areaOut = AREA * bore ** 2;
  const areaIn = AREA * (bore ** 2 - rod ** 2);
  const tubeAreaOut = AREA * tubeIdOut ** 2;
  const tubeAreaIn = AREA * tubeIdIn ** 2;
  const oneStroke = (area, pressure, tubeArea, tubeLength) => {
    const cylinder = area * stroke * (pressure + 0.1) / 0.1 * 1e-6 * temperatureFactor;
    const piping = includePiping ? tubeArea * tubeLength * pressure / 0.1 * 1e-6 * temperatureFactor : 0;
    return { cylinder, piping, total: cylinder + piping };
  };
  const extension = oneStroke(areaOut, pressureOut, tubeAreaOut, tubeLengthOut);
  const retraction = oneStroke(areaIn, pressureIn, tubeAreaIn, tubeLengthIn);
  const usesExtension = mode !== 'spring-extend';
  const usesRetraction = mode !== 'spring-return';
  const perCycle = (usesExtension ? extension.total : 0) + (usesRetraction ? retraction.total : 0);

  return {
    areaOut, areaIn, tubeAreaOut, tubeAreaIn, temperatureFactor,
    extension, retraction, usesExtension, usesRetraction,
    perCycle, perMinuteEach: perCycle * cyclesPerMinute,
    perMinuteTotal: perCycle * cyclesPerMinute * cylinderCount,
  };
}
